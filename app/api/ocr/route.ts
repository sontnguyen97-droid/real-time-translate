import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { imageBase64, targetLang } = await req.json();

  if (!imageBase64 || !targetLang) {
    return NextResponse.json({ error: "Missing imageBase64 or targetLang" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const targetLangName = targetLang === "en" ? "English" : "Vietnamese";

  if (!apiKey) {
    return NextResponse.json({ noText: true, isMock: true });
  }

  try {
    console.log("Base64 length:", imageBase64?.length);
    console.log("First 50 chars:", imageBase64?.substring(0, 50));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: (imageBase64.startsWith("/9j") ? "image/jpeg" : imageBase64.startsWith("iVBOR") ? "image/png" : "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: imageBase64 },
              },
              {
                type: "text",
                text: `Analyze this image and find all text. For each distinct text block, estimate its position as a percentage of the image dimensions (0-100).

Return a JSON array only — no markdown, no explanation:
[
  {
    "original": "exact text as it appears",
    "translated": "translation in ${targetLangName}",
    "x": 50,
    "y": 20,
    "width": 40,
    "fontSize": "large"
  }
]

Where:
- x, y = center position as % of image width/height
- width = approximate width as % of image width  
- fontSize = "small", "medium", or "large" based on text size in image

If no text found, return: []`,
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    console.log("Claude full response:", JSON.stringify(data));
    console.log("Claude response:", JSON.stringify(data).substring(0, 200));
    const raw = data.content?.[0]?.text?.trim() ?? "[]";
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      const blocks = JSON.parse(clean);
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return NextResponse.json({ noText: true });
      }
      return NextResponse.json({ blocks, isMock: false });
    } catch {
      return NextResponse.json({ noText: true });
    }
  } catch {
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}