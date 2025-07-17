import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getChat } from "~/server/db/chat-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const chat = await getChat({
    userId: session.user.id,
    chatId: params.chatId,
  });
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(chat);
}
