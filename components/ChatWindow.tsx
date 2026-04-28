"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message, Language, FRIEND_PROFILE } from "@/lib/types";
import MessageBubble from "./MessageBubble";

// Fix TypeScript errors for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

let msgCounter = 0;
function generateId() { return `msg-${Date.now()}-${msgCounter++}`; }

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [preferredLang, setPreferredLang] = useState<Language>("en");
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>("");

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

  const startRecording = async () => {
    try {
      transcriptRef.current = "";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start();

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = preferredLang === "en" ? "vi-VN" : "en-US";
        recognition.onresult = (e: SpeechRecognitionEvent) => {
          transcriptRef.current = Array.from(e.results).map(r => r[0].transcript).join(" ");
        };
        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    setIsRecording(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);

      await new Promise(r => setTimeout(r, 600));
      const transcript = transcriptRef.current;

      const voiceMsgId = generateId();
      const voiceMsg: Message = {
        id: voiceMsgId, text: "", sender: "me",
        timestamp: new Date(), audioUrl,
        transcribedText: transcript || "(No speech detected)",
        isTranscribing: !!transcript,
      };

      setMessages(prev => [...prev, voiceMsg]);

      if (transcript) {
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
      }
    };
  };

  const toggleLang = () => setPreferredLang(prev => prev === "en" ? "vi" : "en");

  return (
    <div className="flex flex-col h-screen font-sans" style={{ background: "#fdf6f0" }}>
      {/* Header */}
      <div className="text-white px-4 py-3 flex items-center gap-3 shadow-md z-10"
        style={{ background: "linear-gradient(135deg, #8b2500 0%, #c8502a 60%, #e8733a 100%)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" }}>
          {FRIEND_PROFILE.avatar}
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-base leading-tight">{FRIEND_PROFILE.name}</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>Online • Auto-translate ON</span>
          </div>
        </div>
        <button onClick={toggleLang}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border cursor-pointer transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }}>
          <span className="text-sm">🌐</span>
          <span className="text-xs font-bold">{preferredLang === "en" ? "VI → EN" : "EN → VI"}</span>
        </button>
      </div>

      {/* Banner */}
      <div className="px-4 py-2 flex items-center gap-2 border-b"
        style={{ background: "#fff3ec", borderColor: "#f0d9c8" }}>
        <span className="text-sm">🇻🇳</span>
        <p className="text-xs font-medium" style={{ color: "#8b4513" }}>
          Auto-translating to <strong>{preferredLang === "en" ? "English" : "Vietnamese"}</strong> — tap 🌐 to switch
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(200,80,42,0.06) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} onToggleOriginal={toggleOriginal} preferredLang={preferredLang} />
        ))}
        {isTyping && (
          <div className="flex justify-start px-3 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-1"
              style={{ background: "linear-gradient(135deg, #c8502a, #e8733a)" }}>
              {FRIEND_PROFILE.avatar}
            </div>
            <div className="px-4 py-3 rounded-2xl shadow-sm border"
              style={{ background: "#fff8f3", borderColor: "#f0d9c8", borderRadius: "18px 18px 18px 4px" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "#c8502a", animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 flex items-center gap-2 border-t"
        style={{ background: "white", borderColor: "#f0d9c8" }}>
        <button onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ background: "#fff3ec" }}>
          <svg className="w-5 h-5" style={{ color: "#c8502a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

        <div className="flex-1 flex items-center rounded-full px-4 py-2 gap-2 border"
          style={{ background: "#fff8f3", borderColor: "#f0d9c8" }}>
          <input type="text" value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in ${preferredLang === "en" ? "English" : "Vietnamese"}...`}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#2d1a0e" }} />
        </div>

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={e => { e.preventDefault(); startRecording(); }}
          onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm"
          style={{ background: isRecording ? "#8b2500" : "#fff3ec" }}
          title="Hold to record">
          <svg className="w-5 h-5" style={{ color: isRecording ? "white" : "#c8502a" }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <button onClick={sendMessage} disabled={!inputText.trim() || isTyping}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #c8502a, #e8733a)" }}>
          <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {isRecording && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50"
          style={{ background: "#8b2500", color: "white" }}>
          <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Recording... release to send</span>
        </div>
      )}
    </div>
  );
}