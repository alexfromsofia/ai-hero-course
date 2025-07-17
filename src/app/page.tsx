"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { useAuth } from "~/components/auth-context";
import { useChats } from "~/hooks/use-chats";
import { useQueryClient, useMutation } from "@tanstack/react-query";

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { data: chats, isLoading: chatsLoading } = useChats();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeChatId = searchParams.get("chatId");

  // Mutation for creating new chats
  const createChatMutation = useMutation({
    mutationFn: async ({
      chatId,
      title,
      messages,
    }: {
      chatId: string;
      title: string;
      messages: never[];
    }) => {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title, messages }),
      });
      if (!response.ok) {
        throw new Error("Failed to create chat");
      }
      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: (_, { chatId }) => {
      // Invalidate chats query to refresh the sidebar
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      // Navigate to the new chat
      router.push(`/?chatId=${chatId}`);
    },
    onError: (error) => {
      console.error("Failed to create chat:", error);
    },
  });

  const handleNewChat = () => {
    const newChatId = crypto.randomUUID();
    createChatMutation.mutate({
      chatId: newChatId,
      title: "New Chat",
      messages: [],
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
            {isAuthenticated && (
              <button
                onClick={handleNewChat}
                disabled={createChatMutation.isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                title="New Chat"
              >
                <PlusIcon className="size-5" />
              </button>
            )}
          </div>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          {chatsLoading ? (
            <div className="text-sm text-gray-500">Loading chats...</div>
          ) : chats && chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/?chatId=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    chat.id === activeChatId
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {isAuthenticated
                ? "No chats yet. Start a new conversation!"
                : "Sign in to start chatting"}
            </p>
          )}
        </div>
        <div className="p-4">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={user?.image}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {isAuthenticated ? (
          <ChatPage key={activeChatId ?? "no-chat"} chatId={activeChatId} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg text-gray-300">
              Sign in with Discord to start chatting!
            </p>
            <AuthButton isAuthenticated={false} userImage={null} />
          </div>
        )}
      </div>
    </div>
  );
}
