import type { Message } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getChats, upsertChat } from "~/server/db/chat-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const chats = await getChats({ userId: session.user.id });
  return NextResponse.json(chats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    chatId: string;
    title: string;
    messages: Message[];
  };
  await upsertChat({
    userId: session.user.id,
    chatId: body.chatId,
    title: body.title,
    messages: body.messages,
  });
  return NextResponse.json({ success: true });
}
