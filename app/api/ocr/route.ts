import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { imageBase64, targetLang } = await req.json();

  if (!imageBase64 || !targetLang) {
    return NextResponse.json({ error: "Missing imageBase64 or targetLang" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ noText: true, isMock: true });
  }

  const targetLangName = targetLang === "en" ? "English" : "Vietnamese";
  const otherLangName = targetLang === "en" ? "Vietnamese" : "English";

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
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              {
                type: "text",
                text: `Look at this image and extract any visible text.

Then return a JSON object with exactly this format (no markdown, no extra text):
{
  "extractedText": "the exact text you see in the image",
  "translatedText": "translation of that text in ${targetLangName}",
  "otherLangText": "translation of that text in ${otherLangName}"
}

If there is NO text in the image, return:
{ "noText": true }`,
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim() ?? "{}";

    // Clean up potential markdown fences
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (parsed.noText) {
      return NextResponse.json({ noText: true });
    }

    return NextResponse.json({
      extractedText: parsed.extractedText ?? "",
      translatedText: parsed.translatedText ?? "",
      otherLangText: parsed.otherLangText ?? "",
      isMock: false,
    });
  } catch {
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
