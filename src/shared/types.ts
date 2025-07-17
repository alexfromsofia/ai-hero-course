// Shared types for frontend and backend
// These types are safe to use on both sides (serializable)
import type { DB } from "~/server/db/schema";

export type Chat = DB.Chat;
export type Message = DB.Message;
export type ChatWithMessages = Chat & { messages: Message[] };
