"use client";

import { useState, useRef } from "react";
import { Message, Language, TextBlock } from "@/lib/types";

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
  const [translating, setTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [blocks, setBlocks] = useState<TextBlock[] | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const meBubble = "linear-gradient(135deg, #c8502a 0%, #e8733a 100%)";
  const friendBubble = "#fff8f3";

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const handleTranslate = async () => {
    if (translating || !message.photoUrl) return;
    if (blocks) { setShowOriginal(p => !p); return; }
    setTranslating(true);
    try {
      const base64 = message.photoUrl.split(",")[1];
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, targetLang: preferredLang }),
      });
      const data = await res.json();
      if (data.noText || !data.blocks) {
        setBlocks([]);
      } else {
        setBlocks(data.blocks);
      }
      setShowOriginal(false);
    } catch {
      setBlocks([]);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && message.photoUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
          touchAction: "none",
        }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(0,0,0,0.8)", flexShrink: 0 }}>
            <button onClick={() => { setLightboxOpen(false); }}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              ✕ Close
            </button>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              {blocks && blocks.length > 0 ? `${blocks.length} text block${blocks.length > 1 ? "s" : ""} found` : ""}
            </span>
            <button onClick={handleTranslate} disabled={translating}
              style={{
                background: blocks && blocks.length > 0 ? "#057642" : "#c8502a",
                border: "none", color: "white", padding: "6px 14px", borderRadius: 20,
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                opacity: translating ? 0.7 : 1,
              }}>
              {translating ? "Reading..." : blocks && blocks.length > 0 ? (showOriginal ? "Show Translation" : "Show Original") : "🌐 Translate"}
            </button>
          </div>

          {/* Image container — fills remaining space */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            {/* Wrapper — relative container for overlay positioning */}
            <div style={{ position: "relative", display: "inline-block", maxWidth: "90vw", maxHeight: "70vh" }}>
              <img
                ref={imgRef}
                src={message.photoUrl}
                alt="full size"
                style={{ display: "block", maxWidth: "90vw", maxHeight: "70vh", objectFit: "contain", borderRadius: 12 }}
              />

              {/* Text overlays — absolutely positioned over image */}
              {blocks && blocks.length > 0 && blocks.map((block, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${block.x - block.width / 2}%`,
                    top: `${block.y - 3}%`,
                    width: `${block.width}%`,
                    background: showOriginal ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.92)",
                    borderRadius: 4,
                    padding: "2px 5px",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{
                    display: "block",
                    fontSize: block.fontSize === "large" ? 14 : block.fontSize === "medium" ? 11 : 9,
                    fontWeight: 700,
                    color: showOriginal ? "white" : "#1a0800",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {showOriginal ? block.original : block.translated}
                  </span>
                </div>
              ))}

              {/* No text found */}
              {blocks && blocks.length === 0 && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", borderRadius: "0 0 12px 12px", padding: "8px 14px" }}>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center", margin: 0, fontStyle: "italic" }}>No text found in photo</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom hint */}
          {blocks && blocks.length > 0 && (
            <div style={{ flexShrink: 0, padding: "10px 16px", background: "rgba(0,0,0,0.7)", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0 }}>
                Tap 🌐 to toggle between original and translation
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chat bubble */}
      <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8, padding: "0 12px" }}>
        {!isMe && (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #c8502a, #e8733a)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, marginRight: 8, marginTop: 4, flexShrink: 0, overflow: "hidden" }}>
            <img src="/friend-avatar.jpg" alt="friend" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
          <div style={{
            background: isMe ? meBubble : friendBubble,
            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            border: isMe ? "none" : "1px solid #f0d9c8",
            overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}>
            {/* Photo bubble */}
            {message.photoUrl && (
              <div>
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setLightboxOpen(true)}>
                  <img src={message.photoUrl} alt="uploaded" style={{ display: "block", width: 224, height: 176, objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", transition: "background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0)")} />
                </div>
                <div style={{ padding: "6px 12px", background: isMe ? "rgba(0,0,0,0.15)" : "#fff3ec", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11 }}>🌐</span>
                  <p style={{ fontSize: 11, fontWeight: 500, color: isMe ? "rgba(255,255,255,0.75)" : "#8b4513", margin: 0 }}>
                    Tap photo → Translate text
                  </p>
                </div>
              </div>
            )}

            {/* Voice bubble */}
            {message.audioUrl && (
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={toggleAudio} style={{ width: 36, height: 36, borderRadius: "50%", background: isMe ? "rgba(255,255,255,0.25)" : "#c8502a", border: "none", cursor: "pointer", color: "white", fontSize: 13, flexShrink: 0 }}>
                    {playing ? "⏸" : "▶"}
                  </button>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} style={{ flex: 1, borderRadius: 2, height: `${30 + Math.sin(i * 0.9) * 50}%`, background: isMe ? "rgba(255,255,255,0.7)" : "#e8733a", opacity: playing ? 1 : 0.4 }} />
                    ))}
                  </div>
                  <audio ref={audioRef} src={message.audioUrl} onEnded={() => setPlaying(false)} style={{ display: "none" }} />
                </div>
                {message.isTranscribing && <p style={{ fontSize: 11, color: isMe ? "rgba(255,255,255,0.6)" : "#8b4513", fontStyle: "italic", margin: "8px 0 0" }}>Transcribing...</p>}
                {message.transcribedText && !message.isTranscribing && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "#f0d9c8"}` }}>
                    <p style={{ fontSize: 13, color: isMe ? "white" : "#2d1a0e", margin: 0 }}>{message.transcribedText}</p>
                    {message.translatedAudioText && message.translatedAudioText !== message.transcribedText && (
                      <p style={{ fontSize: 12, color: isMe ? "rgba(255,255,255,0.7)" : "#8b4513", fontStyle: "italic", margin: "4px 0 0" }}>🌐 {message.translatedAudioText}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Text bubble */}
            {!message.photoUrl && !message.audioUrl && (
              <div style={{ padding: "10px 16px" }}>
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: isMe ? "white" : "#2d1a0e" }}>
                  {message.showOriginal ? message.text : (message.translatedText || message.text)}
                </p>
                {message.isTranslating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "#f0d9c8"}` }}>
                    {[0, 150, 300].map(d => (
                      <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: isMe ? "rgba(255,255,255,0.7)" : "#c8502a", display: "inline-block", animationDelay: `${d}ms` }} />
                    ))}
                    <span style={{ fontSize: 10, opacity: 0.5, color: isMe ? "white" : "#2d1a0e" }}>Translating...</span>
                  </div>
                )}
                {message.translatedText && !message.isTranslating && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "#f0d9c8"}` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5, margin: "0 0 2px", color: isMe ? "white" : "#2d1a0e" }}>
                      🌐 from {langLabel}
                    </p>
                    <p style={{ fontSize: 11, fontStyle: "italic", margin: 0, color: isMe ? "rgba(255,255,255,0.85)" : "#5a3a1a" }}>
                      &ldquo;{message.text}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time + toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexDirection: isMe ? "row-reverse" : "row" }}>
            <span style={{ fontSize: 10, color: "#999" }}>{time}</span>
            {!message.photoUrl && !message.audioUrl && message.translatedText && !message.isTranslating && (
              <button onClick={() => onToggleOriginal(message.id)}
                style={{ fontSize: 10, fontWeight: 600, color: "#c8502a", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {message.showOriginal ? "Show translation" : "Show original"}
              </button>
            )}
          </div>
        </div>

        {isMe && (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #8b4513, #c8502a)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, marginLeft: 8, marginTop: 4, flexShrink: 0, overflow: "hidden" }}>
            <img src="/my-avatar.jpg" alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>
    </>
  );
}