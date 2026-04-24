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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);

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
      setMessages((prev) =>
        prev.map((m) => m.id === msgId
          ? { ...m, translatedText: data.translatedText, isTranslating: false }
          : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, isTranslating: false, translatedText: "[Translation failed]" } : m)
      );
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
        id: generateId(),
        text: data.reply,
        sender: "friend",
        timestamp: new Date(),
        isTranslating: true,
      };

      chatHistoryRef.current = [
        ...chatHistoryRef.current,
        { role: "assistant", content: data.reply },
      ];

      setIsTyping(false);
      setMessages((prev) => [...prev, replyMsg]);
      setTimeout(() => translateMessage(replyMsg.id, data.reply, lang), 300);
    } catch {
      setIsTyping(false);
    }
  }, [translateMessage]);

  // Opening message from Minh Anh
  useEffect(() => {
    const openingText = "Xin chào! Rất vui được gặp bạn 😊";
    const openingMsg: Message = {
      id: generateId(),
      text: openingText,
      sender: "friend",
      timestamp: new Date(),
      isTranslating: true,
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

    const newMsg: Message = {
      id: generateId(),
      text,
      sender: "me",
      timestamp: new Date(),
    };

    chatHistoryRef.current = [
      ...chatHistoryRef.current,
      { role: "user", content: text },
    ];

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    await getMinhAnhReply(preferredLang);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleOriginal = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, showOriginal: !m.showOriginal } : m)));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];

      const photoMsg: Message = {
        id: generateId(),
        text: "",
        sender: "me",
        timestamp: new Date(),
        photoUrl: dataUrl,
        isProcessingPhoto: true,
      };

      setMessages((prev) => [...prev, photoMsg]);

      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, targetLang: preferredLang }),
        });
        const data = await res.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === photoMsg.id
              ? {
                  ...m,
                  isProcessingPhoto: false,
                  photoText: data.extractedText,
                  translatedPhotoText: data.noText ? undefined : data.translatedText,
                  otherLangPhotoText: data.noText ? undefined : data.otherLangText,
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => m.id === photoMsg.id ? { ...m, isProcessingPhoto: false } : m)
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleLang = () => setPreferredLang((prev) => (prev === "en" ? "vi" : "en"));

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5] font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00b09b] to-[#25d366] text-white px-4 py-3 flex items-center gap-3 shadow-lg z-10">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm border-2 border-white/30">
          {FRIEND_PROFILE.avatar}
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-base">{FRIEND_PROFILE.name}</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs text-white/80">Online • Auto-translate ON</span>
          </div>
        </div>
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 transition-all rounded-full px-3 py-1.5 border border-white/30 cursor-pointer"
        >
          <span className="text-sm">🌐</span>
          <span className="text-xs font-bold">{preferredLang === "en" ? "VI → EN" : "EN → VI"}</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
        <span className="text-amber-500 text-sm">✨</span>
        <p className="text-xs text-amber-700 font-medium">
          Auto-translating to <strong>{preferredLang === "en" ? "English" : "Vietnamese"}</strong> — tap 🌐 to switch
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onToggleOriginal={toggleOriginal} preferredLang={preferredLang} />
        ))}
        {isTyping && (
          <div className="flex justify-start px-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">MA</div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 flex items-center gap-2 shadow-md">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[#f0f2f5] hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          title="Upload photo"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

        <div className="flex-1 flex items-center bg-[#f0f2f5] rounded-full px-4 py-2 gap-2 border border-gray-200 focus-within:border-[#25d366] transition-colors">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in ${preferredLang === "en" ? "English" : "Vietnamese"}...`}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || isTyping}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00b09b] to-[#25d366] flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
