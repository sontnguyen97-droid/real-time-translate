"use client";

import { useState } from "react";
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

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && message.photoUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white text-sm font-bold hover:text-gray-300"
            >
              ✕ Close
            </button>
            <img src={message.photoUrl} alt="full size" className="w-full rounded-xl shadow-2xl" />

            {/* Text overlay on lightbox */}
            {message.translatedPhotoText && (
              <div className="mt-4 bg-white rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-500 text-sm">🌐</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Text in photo</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Original:</p>
                  <p className="text-sm text-gray-800 font-semibold">{message.photoText}</p>
                </div>
                <div className="border-t pt-2 space-y-1">
                  <p className="text-xs text-gray-500 font-medium">{preferredLang === "en" ? "English" : "Vietnamese"}:</p>
                  <p className="text-sm text-gray-800 font-semibold">{message.translatedPhotoText}</p>
                </div>
                {message.otherLangPhotoText && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs text-gray-500 font-medium">{preferredLang === "en" ? "Vietnamese" : "English"}:</p>
                    <p className="text-sm text-gray-800 font-semibold">{message.otherLangPhotoText}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3 px-3`}>
        {!isMe && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0 shadow-md">
            MA
          </div>
        )}

        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
          <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
            isMe
              ? "bg-gradient-to-br from-[#00b09b] to-[#25d366] text-white rounded-br-sm"
              : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
          }`}>

            {/* Photo message */}
            {message.photoUrl && (
              <div className="mb-2">
                <img
                  src={message.photoUrl}
                  alt="uploaded"
                  className="rounded-xl w-48 h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxOpen(true)}
                  title="Click to view full size"
                />
                <p className="text-[10px] text-white/70 mt-1 text-center">Tap to enlarge</p>
              </div>
            )}

            {/* Processing photo */}
            {message.isProcessingPhoto && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-white/70">Reading text in photo...</span>
              </div>
            )}

            {/* Photo text results */}
            {message.photoUrl && !message.isProcessingPhoto && (
              <div className="mt-1">
                {message.translatedPhotoText ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">🌐 Text found</span>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 space-y-1">
                      <p className="text-[10px] text-white/60">Original:</p>
                      <p className="text-xs text-white font-semibold">{message.photoText}</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 space-y-1">
                      <p className="text-[10px] text-white/60">{preferredLang === "en" ? "English:" : "Vietnamese:"}</p>
                      <p className="text-xs text-white font-semibold">{message.translatedPhotoText}</p>
                    </div>
                    {message.otherLangPhotoText && (
                      <div className="bg-white/20 rounded-lg p-2 space-y-1">
                        <p className="text-[10px] text-white/60">{preferredLang === "en" ? "Vietnamese:" : "English:"}</p>
                        <p className="text-xs text-white font-semibold">{message.otherLangPhotoText}</p>
                      </div>
                    )}
                    <p className="text-[9px] text-white/50 text-center">Click photo to enlarge</p>
                  </div>
                ) : (
                  <p className="text-xs text-white/60 italic">No text found in photo</p>
                )}
              </div>
            )}

            {/* Regular text message */}
            {!message.photoUrl && (
              <p className="text-sm leading-relaxed font-medium">
                {message.showOriginal ? message.text : (message.translatedText || message.text)}
              </p>
            )}

            {/* Translating indicator */}
            {!message.photoUrl && message.isTranslating && (
              <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-gray-100">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Translating...</span>
              </div>
            )}

            {/* Translation badge */}
            {!message.photoUrl && message.translatedText && !message.isTranslating && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                  🌐 Auto-translated from {langLabel}
                </span>
                <p className="text-xs text-gray-400 italic mt-1">&ldquo;{message.text}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Time + toggle */}
          <div className={`flex items-center gap-2 mt-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[10px] text-gray-400">{time}</span>
            {!message.photoUrl && message.translatedText && !message.isTranslating && (
              <button
                onClick={() => onToggleOriginal(message.id)}
                className="text-[10px] text-emerald-500 hover:text-emerald-700 font-semibold transition-colors"
              >
                {message.showOriginal ? "Show translation" : "Show original"}
              </button>
            )}
          </div>
        </div>

        {isMe && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold ml-2 mt-1 flex-shrink-0 shadow-md">
            YT
          </div>
        )}
      </div>
    </>
  );
}
