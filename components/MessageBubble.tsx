"use client";

import { useState, useRef } from "react";
import { Message, Language } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  onToggleOriginal: (id: string) => void;
  preferredLang: Language;
}

export default function MessageBubble({ message, onToggleOriginal, preferredLang }: MessageBubbleProps) {
  const isMe = message.sender === "me";
  const time = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const langLabel = preferredLang === "en" ? "Vietnamese" : "English";
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [translating, setTranslating] = useState(false);
  const [photoTranslation, setPhotoTranslation] = useState<{ extracted: string; translated: string; other: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const meBubble = "linear-gradient(135deg, #c8502a 0%, #e8733a 100%)";
  const friendBubble = "#fff8f3";
  const meText = "#ffffff";
  const friendText = "#2d1a0e";

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const handleTranslatePhoto = async () => {
    if (photoTranslation || !message.photoUrl) return;
    setTranslating(true);
    try {
      const res = await fetch(message.photoUrl);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });

      const apiRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, targetLang: preferredLang }),
      });
      const data = await apiRes.json();

      if (data.noText) {
        setPhotoTranslation({ extracted: "", translated: "No text found in photo", other: "" });
      } else {
        setPhotoTranslation({
          extracted: data.extractedText ?? "",
          translated: data.translatedText ?? "",
          other: data.otherLangText ?? "",
        });
      }
    } catch {
      setPhotoTranslation({ extracted: "", translated: "Translation failed", other: "" });
    } finally {
      setTranslating(false);
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && message.photoUrl && (
        <div className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.95)" }}>
          {/* Lightbox header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            <button onClick={() => { setLightboxOpen(false); setZoom(1); }}
              className="text-white font-bold text-sm px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              ✕ Close
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleZoomOut}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ background: "rgba(255,255,255,0.15)" }}>−</button>
              <span className="text-white text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ background: "rgba(255,255,255,0.15)" }}>+</button>
              <button onClick={handleResetZoom}
                className="text-white text-xs px-2 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.15)" }}>Reset</button>
            </div>
            {/* Translate button */}
            <button onClick={handleTranslatePhoto} disabled={translating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs transition-all active:scale-95 disabled:opacity-60"
              style={{ background: photoTranslation ? "#057642" : "#c8502a", color: "white" }}>
              {translating ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Translating...
                </>
              ) : photoTranslation ? "✅ Translated" : "🌐 Translate Text"}
            </button>
          </div>

          {/* Image area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img src={message.photoUrl} alt="full size"
              className="rounded-xl shadow-2xl transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center", maxWidth: "90vw", maxHeight: "60vh", objectFit: "contain" }} />
          </div>

          {/* Translation panel */}
          {photoTranslation && (
            <div className="px-4 pb-4">
              <div className="rounded-2xl p-4 space-y-2 max-w-lg mx-auto"
                style={{ background: "#fff8f3", border: "1px solid #f0d9c8" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#c8502a" }}>
                  🌐 Text found in photo
                </p>
                {photoTranslation.extracted && (
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Original</p>
                    <p className="text-sm font-semibold" style={{ color: "#2d1a0e" }}>{photoTranslation.extracted}</p>
                  </div>
                )}
                {photoTranslation.translated && (
                  <div className="pt-1 border-t" style={{ borderColor: "#f0d9c8" }}>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                      {preferredLang === "en" ? "English" : "Vietnamese"}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "#2d1a0e" }}>{photoTranslation.translated}</p>
                  </div>
                )}
                {photoTranslation.other && (
                  <div className="pt-1 border-t" style={{ borderColor: "#f0d9c8" }}>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                      {preferredLang === "en" ? "Vietnamese" : "English"}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "#2d1a0e" }}>{photoTranslation.other}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 px-3`}>
        {!isMe && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #c8502a, #e8733a)" }}>
            A
          </div>
        )}

        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
          <div className="rounded-2xl shadow-sm overflow-hidden"
            style={{
              background: isMe ? meBubble : friendBubble,
              color: isMe ? meText : friendText,
              borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              border: isMe ? "none" : "1px solid #f0d9c8",
            }}>

            {/* Photo message — clean, just the photo */}
            {message.photoUrl && (
              <div>
                <div className="relative cursor-pointer" onClick={() => setLightboxOpen(true)}>
                  <img src={message.photoUrl} alt="uploaded"
                    className="block w-56 h-44 object-cover hover:opacity-95 transition-opacity" />
                  {/* Overlay hint */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.3)" }}>
                    <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">
                      🔍 Tap to view
                    </span>
                  </div>
                </div>
                {/* Hint text */}
                <div className="px-3 py-2 flex items-center gap-1.5"
                  style={{ background: isMe ? "rgba(0,0,0,0.15)" : "#fff3ec" }}>
                  <span className="text-sm">🌐</span>
                  <p className="text-[11px] font-medium"
                    style={{ color: isMe ? "rgba(255,255,255,0.8)" : "#8b4513" }}>
                    Tap photo → 🌐 to translate text
                  </p>
                </div>
              </div>
            )}

            {/* Voice message */}
            {message.audioUrl && (
              <div className="px-4 py-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={toggleAudio}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isMe ? "rgba(255,255,255,0.25)" : "#c8502a" }}>
                    <span className="text-white text-xs">{playing ? "⏸" : "▶"}</span>
                  </button>
                  <div className="flex-1 flex items-center gap-0.5">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="rounded-full flex-1"
                        style={{
                          height: `${6 + Math.sin(i * 0.8) * 8}px`,
                          background: isMe ? "rgba(255,255,255,0.6)" : "#e8733a",
                          opacity: playing ? 1 : 0.5,
                        }} />
                    ))}
                  </div>
                  <audio ref={audioRef} src={message.audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
                </div>
                {message.isTranscribing && (
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: isMe ? "rgba(255,255,255,0.7)" : "#c8502a", animationDelay: `${d}ms` }} />
                    ))}
                    <span className="text-[10px] opacity-60">Transcribing...</span>
                  </div>
                )}
                {message.transcribedText && !message.isTranscribing && (
                  <div className="space-y-1 pt-1 border-t"
                    style={{ borderColor: isMe ? "rgba(255,255,255,0.2)" : "#f0d9c8" }}>
                    <p className="text-xs font-medium">{message.transcribedText}</p>
                    {message.translatedAudioText && message.translatedAudioText !== message.transcribedText && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">🌐 {langLabel}</p>
                        <p className="text-xs opacity-80 italic">{message.translatedAudioText}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Regular text */}
            {!message.photoUrl && !message.audioUrl && (
              <div className="px-4 py-2.5">
                <p className="text-sm leading-relaxed">
                  {message.showOriginal ? message.text : (message.translatedText || message.text)}
                </p>
                {message.isTranslating && (
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5"
                    style={{ borderTop: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "#f0d9c8"}` }}>
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: isMe ? "rgba(255,255,255,0.7)" : "#c8502a", animationDelay: `${d}ms` }} />
                    ))}
                    <span className="text-[10px] opacity-60">Translating...</span>
                  </div>
                )}
                {message.translatedText && !message.isTranslating && (
                  <div className="mt-1.5 pt-1.5"
                    style={{ borderTop: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "#f0d9c8"}` }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">🌐 from {langLabel}</p>
                    <p className="text-[11px] opacity-60 italic mt-0.5">"{message.text}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time + toggle */}
          <div className={`flex items-center gap-2 mt-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[10px] text-gray-400">{time}</span>
            {!message.photoUrl && !message.audioUrl && message.translatedText && !message.isTranslating && (
              <button onClick={() => onToggleOriginal(message.id)}
                className="text-[10px] font-semibold" style={{ color: "#c8502a" }}>
                {message.showOriginal ? "Show translation" : "Show original"}
              </button>
            )}
          </div>
        </div>

        {isMe && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ml-2 mt-1 flex-shrink-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #8b4513, #c8502a)" }}>
            U
          </div>
        )}
      </div>
    </>
  );
}