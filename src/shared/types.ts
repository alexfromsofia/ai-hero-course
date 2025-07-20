// Shared types for frontend and backend
// These types are safe to use on both sides (serializable)
import type { DB } from "~/server/db/schema";

export type Chat = DB.Chat;
export type Message = DB.Message;
export type ChatWithMessages = Chat & { messages: Message[] };

export function isNewChatCreated(data: unknown): data is {
  type: "NEW_CHAT_CREATED";
  chatId: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "NEW_CHAT_CREATED" &&
    "chatId" in data &&
    typeof (data as { chatId: unknown }).chatId === "string"
  );
}
