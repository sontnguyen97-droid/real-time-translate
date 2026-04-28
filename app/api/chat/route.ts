import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, preferredLang } = await req.json();

  if (!messages || !preferredLang) {
    return NextResponse.json({ error: "Missing messages or preferredLang" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const replyLang = preferredLang === "en" ? "vi" : "en";
  const replyLangName = replyLang === "vi" ? "Vietnamese" : "English";

  if (!apiKey) {
    const mockReplies: Record<string, string[]> = {
      vi: [
        "Tôi hiểu rồi! Bạn nói đúng đó.",
        "Thật thú vị! Kể thêm cho tôi nghe đi.",
        "Haha, bạn thật vui tính!",
        "Ừ, tôi cũng nghĩ vậy.",
        "Bạn đang làm gì vậy?",
      ],
      en: [
        "That's interesting! Tell me more.",
        "I totally agree with you!",
        "Haha, you're so funny!",
        "Yeah, I think so too.",
        "What are you up to?",
      ],
    };
    const pool = mockReplies[replyLang];
    const reply = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json({ reply, isMock: true });
  }

  try {
    const systemPrompt = `You are Minh Anh, a friendly and warm Vietnamese person chatting with your close friend. You are from Sai Gon, Vietnam.

IMPORTANT RULES:
- You MUST reply ONLY in ${replyLangName}
- Read the ENTIRE conversation history and respond meaningfully to what was just said
- Keep replies short and natural like a real chat message (1-3 sentences max)
- Be engaging, ask follow-up questions, show genuine interest
- Match the energy of the conversation — if they joke, joke back; if serious, be thoughtful
- NEVER translate your own reply or add any explanation
- NEVER say you are an AI`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await res.json();
    const reply = data.content?.[0]?.text?.trim() ?? "...";
    return NextResponse.json({ reply, isMock: false });
  } catch {
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}

