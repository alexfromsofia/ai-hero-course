import { auth } from "~/server/auth/index.ts";
import { ChatSidebar } from "../components/chat-sidebar.tsx";
import { ChatPage } from "./chat.tsx";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userName = session?.user.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const { id: chatId } = await searchParams;

  return (
    <div className="flex h-screen bg-gray-950">
      <ChatSidebar
        selectedChatId={chatId}
        isAuthenticated={isAuthenticated}
        userImage={session?.user.image}
      />

      <div className="flex flex-1 items-center justify-center">
        <ChatPage
          userName={userName}
          isAuthenticated={isAuthenticated}
          chatId={chatId}
        />
      </div>
    </div>
  );
}
