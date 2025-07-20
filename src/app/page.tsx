import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { getChats } from "~/server/db/chat-helpers.ts";
import { AuthButton } from "../components/auth-button.tsx";
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
  const chats = await getChats({ userId: session?.user.id });

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="mb-2 text-sm font-semibold text-gray-400">
              Your Chats
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/?id=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    chat.id === chatId
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto p-4">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={session?.user.image}
          />
        </div>
      </div>

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
