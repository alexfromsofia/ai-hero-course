"use client";

import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { useChat, type Message } from "@ai-sdk/react";
import { useAuth } from "~/components/auth-context";
import { useState, useEffect } from "react";
import { ErrorMessage } from "~/components/error-message";
import { useChat as useChatData } from "~/hooks/use-chats";
import { useQueryClient, useMutation } from "@tanstack/react-query";

interface ChatPageProps {
  chatId: string | null;
}

export const ChatPage = ({ chatId }: ChatPageProps) => {
  const { userName, isAuthenticated } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const queryClient = useQueryClient();

  // Load existing chat data if chatId is provided
  const { data: existingChat, isLoading: chatLoading } = useChatData(
    chatId ?? undefined,
  );

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
    setMessages,
  } = useChat({
    initialMessages: [],
    onFinish: (message) => {
      if (chatId && isAuthenticated) {
        // Save the chat to the backend
        const allMessages = [...messages, message];
        const title = allMessages[0]?.content?.slice(0, 50) ?? "New Chat";

        saveChatMutation.mutate({ chatId, title, messages: allMessages });
      }
    },
  });

  // Load existing messages when chat data is available
  useEffect(() => {
    if (existingChat?.messages && existingChat.messages.length > 0) {
      // Convert database messages to AI SDK format
      const aiMessages: Message[] = existingChat.messages.map((dbMessage) => ({
        id: dbMessage.id,
        role: dbMessage.role as "user" | "assistant" | "system",
        content:
          Array.isArray(dbMessage.parts) &&
          dbMessage.parts[0] &&
          typeof dbMessage.parts[0] === "object" &&
          "text" in dbMessage.parts[0]
            ? String((dbMessage.parts[0] as { text: unknown }).text)
            : "",
        parts: dbMessage.parts as Message["parts"],
      }));
      setMessages(aiMessages);
    } else if (existingChat && existingChat.messages.length === 0) {
      // Clear messages if chat exists but has no messages
      setMessages([]);
    }
  }, [existingChat, setMessages]);

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

  if (chatLoading) {
    return (
      <div className="flex h-screen min-h-0 flex-1 items-center justify-center">
        <div className="text-gray-300">Loading chat...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen min-h-0 flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => {
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
