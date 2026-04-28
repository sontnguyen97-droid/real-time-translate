import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { transcribedText, targetLang } = await req.json();

  if (!transcribedText || !targetLang) {
    return NextResponse.json({ error: "Missing transcribedText or targetLang" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      translatedText: `[Translation of: "${transcribedText}"]`,
      isMock: true,
    });
  }

  try {
    const targetLangName = targetLang === "en" ? "English" : "Vietnamese";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Translate to ${targetLangName}. Output ONLY the translated text, nothing else.\n\nText: ${transcribedText}`,
        }],
      }),
    });

    const data = await res.json();
    const translatedText = data.content?.[0]?.text?.trim() ?? transcribedText;
    return NextResponse.json({ translatedText, isMock: false });
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
