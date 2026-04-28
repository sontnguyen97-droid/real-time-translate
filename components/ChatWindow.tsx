"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message, Language, FRIEND_PROFILE } from "@/lib/types";
import MessageBubble from "./MessageBubble";

let msgCounter = 0;
function generateId() { return `msg-${Date.now()}-${msgCounter++}`; }

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [preferredLang, setPreferredLang] = useState<Language>("en");
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef("");

  const scrollToBottom = () => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const translateMessage = useCallback(async (msgId: string, text: string, targetLang: Language) => {
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, translatedText: data.translatedText, isTranslating: false }
        : m
      ));
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, isTranslating: false, translatedText: "[Translation failed]" }
        : m
      ));
    }
  }, []);

  const getMinhAnhReply = useCallback(async (lang: Language) => {
    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistoryRef.current, preferredLang: lang }),
      });
      const data = await res.json();
      const replyMsg: Message = {
        id: generateId(), text: data.reply, sender: "friend",
        timestamp: new Date(), isTranslating: true,
      };
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: data.reply }];
      setIsTyping(false);
      setMessages(prev => [...prev, replyMsg]);
      setTimeout(() => translateMessage(replyMsg.id, data.reply, lang), 300);
    } catch {
      setIsTyping(false);
    }
  }, [translateMessage]);

  useEffect(() => {
    const openingText = "Xin chào! Rất vui được gặp bạn 😊";
    const openingMsg: Message = {
      id: generateId(), text: openingText, sender: "friend",
      timestamp: new Date(), isTranslating: true,
    };
    chatHistoryRef.current = [{ role: "assistant", content: openingText }];
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages([openingMsg]);
      setTimeout(() => translateMessage(openingMsg.id, openingText, "en"), 300);
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;
    const text = inputText.trim();
    const newMsg: Message = { id: generateId(), text, sender: "me", timestamp: new Date() };
    chatHistoryRef.current = [...chatHistoryRef.current, { role: "user", content: text }];
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    await getMinhAnhReply(preferredLang);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleOriginal = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, showOriginal: !m.showOriginal } : m));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const photoMsg: Message = {
        id: generateId(), text: "", sender: "me",
        timestamp: new Date(), photoUrl: dataUrl,
      };
      setMessages(prev => [...prev, photoMsg]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendVoiceMessage = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    const voiceMsgId = generateId();
    const voiceMsg: Message = {
      id: voiceMsgId, text: transcript, sender: "me",
      timestamp: new Date(), transcribedText: transcript, isTranscribing: true,
    };
    setMessages(prev => [...prev, voiceMsg]);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcribedText: transcript, targetLang: preferredLang }),
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === voiceMsgId
        ? { ...m, isTranscribing: false, translatedAudioText: data.translatedText }
        : m
      ));
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "user", content: transcript }];
      await getMinhAnhReply(preferredLang);
    } catch {
      setMessages(prev => prev.map(m => m.id === voiceMsgId ? { ...m, isTranscribing: false } : m));
    }
  }, [preferredLang, getMinhAnhReply]);

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Voice recording requires Chrome browser.");
      return;
    }
    liveTranscriptRef.current = "";
    setLiveTranscript("");

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = preferredLang === "en" ? "vi-VN" : "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + " ";
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const combined = (final + interim).trim();
      liveTranscriptRef.current = combined;
      setLiveTranscript(combined);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopAndSend = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    const transcript = liveTranscriptRef.current;
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    if (transcript.trim()) {
      sendVoiceMessage(transcript.trim());
    }
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setLiveTranscript("");
    liveTranscriptRef.current = "";
  };

  const toggleLang = () => setPreferredLang(prev => prev === "en" ? "vi" : "en");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif", background: "#fdf6f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #8b2500 0%, #c8502a 60%, #e8733a 100%)", color: "white", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {FRIEND_PROFILE.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{FRIEND_PROFILE.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, background: "white", borderRadius: "50", display: "inline-block" }} />
            <span style={{ fontSize: 11, opacity: 0.8 }}>Online • Auto-translate ON</span>
          </div>
        </div>
        <button onClick={toggleLang} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          🌐 {preferredLang === "en" ? "VI → EN" : "EN → VI"}
        </button>
      </div>

      {/* Banner */}
      <div style={{ background: "#fff3ec", borderBottom: "1px solid #f0d9c8", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span>🇻🇳</span>
        <p style={{ fontSize: 11, fontWeight: 500, color: "#8b4513", margin: 0 }}>
          Auto-translating to <strong>{preferredLang === "en" ? "English" : "Vietnamese"}</strong> — tap 🌐 to switch
        </p>
      </div>

      {/* Live recording preview */}
      {isRecording && (
        <div style={{ background: "#fff3ec", borderBottom: "1px solid #f0d9c8", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, background: "#c8502a", borderRadius: "50%", flexShrink: 0, animation: "pulse 1s infinite" }} />
          <p style={{ fontSize: 12, color: "#8b4513", margin: 0, flex: 1, fontStyle: liveTranscript ? "normal" : "italic", opacity: liveTranscript ? 1 : 0.6 }}>
            {liveTranscript || "Listening... speak now"}
          </p>
          <button onClick={cancelRecording} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, padding: "2px 8px" }}>Cancel</button>
          <button onClick={stopAndSend} disabled={!liveTranscript.trim()} style={{ background: "#c8502a", border: "none", color: "white", padding: "4px 12px", borderRadius: 14, cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: liveTranscript.trim() ? 1 : 0.5 }}>Send</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", backgroundImage: "radial-gradient(circle at 1px 1px, rgba(200,80,42,0.06) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} onToggleOriginal={toggleOriginal} preferredLang={preferredLang} />
        ))}
        {isTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start", padding: "0 12px", marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #c8502a, #e8733a)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, marginRight: 8, marginTop: 4 }}>
              {FRIEND_PROFILE.avatar}
            </div>
            <div style={{ background: "#fff8f3", border: "1px solid #f0d9c8", borderRadius: "18px 18px 18px 4px", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                {[0, 150, 300].map(d => (
                  <span key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "#c8502a", display: "inline-block", animation: "bounce 1s infinite", animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ background: "white", borderTop: "1px solid #f0d9c8", padding: "12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={() => fileInputRef.current?.click()} style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff3ec", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" style={{ color: "#c8502a" }} fill="none" stroke="#c8502a" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />

        <div style={{ flex: 1, background: "#fff8f3", border: "1px solid #f0d9c8", borderRadius: 24, padding: "8px 16px", display: "flex", alignItems: "center" }}>
          <input
            type="text" value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in ${preferredLang === "en" ? "English" : "Vietnamese"}...`}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "#2d1a0e" }}
          />
        </div>

        {/* Mic button */}
        <button
          onClick={isRecording ? stopAndSend : startRecording}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: isRecording ? "#8b2500" : "#fff3ec",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
          title={isRecording ? "Stop & send" : "Voice message"}>
          {isRecording ? (
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "white", display: "block" }} />
          ) : (
            <svg width="20" height="20" fill="#c8502a" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#c8502a" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke="#c8502a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8" y1="23" x2="16" y2="23" stroke="#c8502a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* Send button */}
        <button onClick={sendMessage} disabled={!inputText.trim() || isTyping}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #c8502a, #e8733a)",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: (!inputText.trim() || isTyping) ? 0.5 : 1, flexShrink: 0,
          }}>
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24" style={{ transform: "translateX(2px)" }}>
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}