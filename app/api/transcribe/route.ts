import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { audioBase64, mimeType, targetLang } = await req.json();

  if (!audioBase64 || !targetLang) {
    return NextResponse.json({ error: "Missing audioBase64 or targetLang" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      transcribedText: "Xin chào! Đây là tin nhắn thoại mẫu.",
      translatedText: "Hello! This is a sample voice message.",
      isMock: true,
    });
  }

  try {
    const targetLangName = targetLang === "en" ? "English" : "Vietnamese";

    const translateRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `The user sent a voice message encoded in base64 (${mimeType || "audio/webm"}). Please transcribe it and translate to ${targetLangName}. Return JSON only: {"transcribedText": "...", "translatedText": "..."}`,
          },
        ],
      }),
    });

    const translateData = await translateRes.json();
    const raw = translateData.content?.[0]?.text?.trim() ?? "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return NextResponse.json({
        transcribedText: parsed.transcribedText ?? "",
        translatedText: parsed.translatedText ?? "",
        isMock: false,
      });
    } catch {
      return NextResponse.json({ transcribedText: raw, translatedText: "", isMock: false });
    }
  } catch {
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}