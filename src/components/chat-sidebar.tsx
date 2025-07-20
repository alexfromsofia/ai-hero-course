"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthButton } from "./auth-button";
import type { Chat } from "~/shared/types";

export function ChatSidebar({
  selectedChatId,
  isAuthenticated,
  userImage,
  chats,
}: {
  selectedChatId?: string;
  isAuthenticated: boolean;
  userImage?: string | null;
  chats: Chat[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleNewChat = () => {
    // Navigate to the home page without a chat ID to start a new chat
    router.push("/");
  };

  // Listen for custom events when new chats are created
  useEffect(() => {
    const handleNewChatCreated = () => {
      // Invalidate chats query to refresh the sidebar
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    };

    // Add event listener for custom new chat events
    window.addEventListener("new-chat-created", handleNewChatCreated);

    return () => {
      window.removeEventListener("new-chat-created", handleNewChatCreated);
    };
  }, [queryClient]);

  if (!chats) return <div className="p-4">No chats found.</div>;

  return (
    <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
          <button
            className="rounded-lg bg-gray-700 p-2 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleNewChat}
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {chats.map((chat: Chat) => (
            <div key={chat.id} className="flex items-center gap-2">
              <Link
                href={`/?id=${chat.id}`}
                className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  chat.id === selectedChatId
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
        <AuthButton isAuthenticated={isAuthenticated} userImage={userImage} />
      </div>
    </div>
  );
}
