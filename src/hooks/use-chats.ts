import { useQuery } from "@tanstack/react-query";
import type { Chat, ChatWithMessages } from "~/shared/types";

export function useChats() {
  return useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: async (): Promise<Chat[]> => {
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to fetch chats");
      return (await res.json()) as Chat[];
    },
  });
}

export function useChat(chatId: string | undefined) {
  return useQuery<ChatWithMessages | null>({
    queryKey: ["chat", chatId],
    queryFn: async (): Promise<ChatWithMessages | null> => {
      if (!chatId) return null;
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) throw new Error("Failed to fetch chat");
      return (await res.json()) as ChatWithMessages;
    },
    enabled: !!chatId,
  });
}
