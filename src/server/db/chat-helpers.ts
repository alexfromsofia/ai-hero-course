import type { Message as AIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { chats, messages } from "~/server/db/schema";

// Upsert a chat and its messages
export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: AIMessage[];
}) => {
  // Check if chat exists and belongs to user
  const chat = await db.query.chats.findFirst({
    where: (c, { eq }) => eq(c.id, opts.chatId),
  });
  if (chat) {
    if (chat.userId !== opts.userId) {
      throw new Error("Chat does not belong to user");
    }
    // Delete all messages for this chat
    await db.delete(messages).where(eq(messages.chatId, opts.chatId));
    // Update chat title and updatedAt
    await db
      .update(chats)
      .set({ title: opts.title, updatedAt: new Date() })
      .where(eq(chats.id, opts.chatId));
  } else {
    // Create new chat
    await db.insert(chats).values({
      id: opts.chatId,
      userId: opts.userId,
      title: opts.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  // Insert all messages
  if (opts.messages.length > 0) {
    await db.insert(messages).values(
      opts.messages.map((m, i) => ({
        id: m.id ?? crypto.randomUUID(),
        chatId: opts.chatId,
        role: m.role,
        parts: m.parts,
        order: i,
        createdAt: new Date(),
      })),
    );
  }
};

// Get a chat by id with all its messages
export const getChat = async (opts: { userId: string; chatId: string }) => {
  const chat = await db.query.chats.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.id, opts.chatId), eq(c.userId, opts.userId)),
    with: {
      messages: {
        orderBy: (m, { asc }) => asc(m.order),
      },
    },
  });
  return chat;
};

// Get all chats for a user (without messages)
export const getChats = async (opts: { userId: string }) => {
  return db.query.chats.findMany({
    where: (c, { eq }) => eq(c.userId, opts.userId),
    orderBy: (c, { desc }) => desc(c.updatedAt),
  });
};
