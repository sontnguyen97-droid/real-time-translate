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

  const mediaType = imageBase64.startsWith("/9j") ? "image/jpeg"
    : imageBase64.startsWith("iVBOR") ? "image/png"
    : imageBase64.startsWith("R0lGOD") ? "image/gif"
    : imageBase64.startsWith("UklGR") ? "image/webp"
    : "image/jpeg";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Look at this image. Find ALL visible text and return their positions.

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Limit to the 15 most important text blocks only.

Format:
[{"original":"text here","translated":"${targetLangName} translation","x":50,"y":30,"width":40,"fontSize":"medium"}]

Rules:
- x,y = center position as % of image (0-100)
- width = text block width as % of image width
- fontSize = "small", "medium", or "large"
- If NO text exists: []
- Translate to ${targetLangName}
- Keep numbers/prices/names unchanged if not translatable`,
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim() ?? "";

    if (!raw) {
      return NextResponse.json({ noText: true });
    }

    // Try multiple parsing strategies
    let blocks = null;

    // Strategy 1: Direct parse
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) blocks = parsed;
    } catch { /* try next */ }

    // Strategy 2: Extract array with regex
    if (!blocks) {
      const match = raw.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          blocks = JSON.parse(match[0]);
        } catch { /* try next */ }
      }
    }

    // Strategy 3: Find first [ and try to parse, fixing truncation
    if (!blocks) {
      const start = raw.indexOf("[");
      if (start !== -1) {
        let jsonStr = raw.substring(start);
        // Remove markdown fences if present
        jsonStr = jsonStr.replace(/```[\s\S]*$/, "").trim();
        // Fix truncated JSON - find last complete object
        const lastClosing = jsonStr.lastIndexOf("}");
        if (lastClosing !== -1) {
          jsonStr = jsonStr.substring(0, lastClosing + 1) + "]";
        }
        try {
          blocks = JSON.parse(jsonStr);
        } catch { /* failed */ }
      }
    }

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json({ noText: true });
    }

    // Validate and clean blocks
    const validBlocks = blocks
      .filter((b: { original?: unknown; translated?: unknown; x?: unknown; y?: unknown; width?: unknown }) =>
        b && typeof b.original === "string" && typeof b.translated === "string" &&
        typeof b.x === "number" && typeof b.y === "number"
      )
      .slice(0, 15) // max 15 blocks
      .map((b: { original: string; translated: string; x: number; y: number; width?: number; fontSize?: string }) => ({
        original: b.original,
        translated: b.translated,
        x: Math.max(0, Math.min(100, b.x)),
        y: Math.max(0, Math.min(100, b.y)),
        width: Math.max(5, Math.min(100, b.width ?? 30)),
        fontSize: ["small", "medium", "large"].includes(b.fontSize ?? "") ? b.fontSize : "medium",
      }));

    if (validBlocks.length === 0) {
      return NextResponse.json({ noText: true });
    }

    return NextResponse.json({ blocks: validBlocks, isMock: false });

  } catch (err) {
    console.log("OCR error:", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}