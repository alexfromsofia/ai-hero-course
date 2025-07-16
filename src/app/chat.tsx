"use client";

import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { useChat, type Message } from "@ai-sdk/react";
import { useAuth } from "~/components/auth-context";
import { useState } from "react";
import { ErrorMessage } from "~/components/error-message";

const initialMessages: Message[] = [
  {
    id: "1",
    content: "Hello, how are you?",
    role: "user",
  },
];

export const ChatPage = () => {
  const { userName, isAuthenticated } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({ initialMessages });

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
