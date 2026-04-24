import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json();

  if (!text || !targetLang) {
    return NextResponse.json({ error: "Missing text or targetLang" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const targetLangName = targetLang === "en" ? "English" : "Vietnamese";

  if (!apiKey) {
    const mockTranslations: Record<string, string> = {
      "Xin chào! Bạn có khỏe không?": "Hello! How are you?",
      "Hôm nay trời đẹp quá!": "The weather is so beautiful today!",
      "Tôi rất vui được gặp bạn.": "I am very happy to meet you.",
      "Bạn đang làm gì vậy?": "What are you doing?",
      "Tôi đang học lập trình.": "I am studying programming.",
      "Chúc bạn một ngày tốt lành!": "Have a great day!",
      "Ăn cơm chưa?": "Have you eaten yet?",
      "Nhớ bạn lắm!": "I miss you so much!",
      "Hello! How are you doing today?": "Xin chào! Hôm nay bạn thế nào?",
      "What are you up to?": "Bạn đang làm gì vậy?",
      "Hope you have a great day!": "Chúc bạn một ngày tốt lành!",
      "Xin chào! Rất vui được gặp bạn 😊": "Hello! Nice to meet you 😊",
      "Hello! Nice to meet you 😊": "Xin chào! Rất vui được gặp bạn 😊",
    };
    const translated = mockTranslations[text] ?? `[Translation: "${text}"]`;
    return NextResponse.json({ translatedText: translated, isMock: true });
  }

  try {
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
        messages: [
          {
            role: "user",
            content: `Translate the following text to ${targetLangName}. Output ONLY the translated text, nothing else. No explanations, no quotes.\n\nText: ${text}`,
          },
        ],
      }),
    });

    const data = await res.json();
    const translatedText = data.content?.[0]?.text?.trim() ?? text;
    return NextResponse.json({ translatedText, isMock: false });
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
