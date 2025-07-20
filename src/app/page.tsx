import { auth } from "~/server/auth/index.ts";
import { getChat, getChats } from "~/server/db/chat-helpers";
import { ChatSidebar } from "../components/chat-sidebar.tsx";
import { ChatPage } from "./chat.tsx";
import type { Message } from "ai";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userName = session?.user.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const { id: chatId } = await searchParams;

  // Fetch chats for sidebar (empty array if not authenticated)
  const chats = isAuthenticated
    ? await getChats({ userId: session.user.id })
    : [];

  // Fetch specific chat if chatId is provided and user is authenticated
  let initialMessages: Message[] = [];
  if (chatId && isAuthenticated && session?.user?.id) {
    const chat = await getChat({
      userId: session.user.id,
      chatId,
    });

    if (chat?.messages) {
      initialMessages = chat.messages.map((msg) => ({
        id: msg.id,
        // msg.role is typed as string, so we
        // need to cast it to the correct type
        role: msg.role as "user" | "assistant",
        // msg.parts is typed as unknown[], so we
        // need to cast it to the correct type
        parts: msg.parts as Message["parts"],
        // content is not persisted, so we can
        // safely pass an empty string, because
        // parts are always present, and the AI SDK
        // will use the parts to construct the content
        content: "",
      }));
    }
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <ChatSidebar
        selectedChatId={chatId}
        isAuthenticated={isAuthenticated}
        userImage={session?.user.image}
        chats={chats}
      />

      <div className="flex flex-1 items-center justify-center">
        <ChatPage
          userName={userName}
          isAuthenticated={isAuthenticated}
          chatId={chatId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
