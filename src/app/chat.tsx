"use client";

import { useChat, type Message } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { ErrorMessage } from "~/components/error-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/shared/types";

interface ChatPageProps {
  chatId: string;
  userName: string;
  isAuthenticated: boolean;
  initialMessages: Message[];
}

export const ChatPage = ({
  chatId,
  userName,
  isAuthenticated,
  initialMessages,
}: ChatPageProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Mutation for saving chats
  const saveChatMutation = useMutation({
    mutationFn: async ({
      chatId,
      title,
      messages,
    }: {
      chatId: string;
      title: string;
      messages: Message[];
    }) => {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title, messages }),
      });
      if (!response.ok) {
        throw new Error("Failed to save chat");
      }
      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      // Invalidate chats query to refresh the sidebar
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      console.error("Failed to save chat:", error);
    },
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    data,
  } = useChat({
    initialMessages,
    body: { chatId },
    onFinish: (message) => {
      if (isAuthenticated) {
        // For new chats, the chatId will be created by the API
        // For existing chats, use the current chatId
        const currentChatId =
          chatId ?? data?.find((item) => isNewChatCreated(item))?.chatId;
        if (currentChatId) {
          const allMessages = [...messages, message];
          const title = allMessages[0]?.content?.slice(0, 50) ?? "New Chat";

          saveChatMutation.mutate({
            chatId: currentChatId,
            title,
            messages: allMessages,
          });
        }
      }
    },
  });

  // Listen for NEW_CHAT_CREATED events and redirect
  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];
    console.log("lastDataItem", lastDataItem);

    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      console.log("Redirecting to new chat:", lastDataItem.chatId);
      // Dispatch custom event to notify sidebar to refresh
      window.dispatchEvent(new CustomEvent("new-chat-created"));
      router.push(`/?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    handleSubmit(e);
  };

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  return (
    <>
      <div className="flex h-screen min-h-0 flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {userName &&
            isAuthenticated &&
            messages.map((message, index) => {
              return (
                <ChatMessage
                  key={index}
                  parts={message.parts}
                  role={message.role}
                  userName={userName}
                />
              );
            })}
        </div>
        <div className="sticky bottom-0 z-10 border-t border-gray-700 bg-gray-950">
          <form
            onSubmit={handleFormSubmit}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
