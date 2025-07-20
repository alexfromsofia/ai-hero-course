import type { Message } from "ai";
import {
  appendResponseMessages,
  createDataStreamResponse,
  streamText,
} from "ai";
import { between, eq } from "drizzle-orm";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth/index.ts";
import { db } from "~/server/db";
import { upsertChat } from "~/server/db/chat-helpers";
import { requestLogs } from "~/server/db/schema";

export const maxDuration = 60;

const REQUEST_LIMIT_PER_DAY = 100;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  // Check if user is admin
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  });
  const isAdmin = user?.isAdmin;

  if (!isAdmin) {
    // Count requests for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const todayLogs = await db
      .select()
      .from(requestLogs)
      .where(
        eq(requestLogs.userId, userId) &&
          between(requestLogs.requestedAt, startOfDay, endOfDay),
      );
    if (todayLogs.length >= REQUEST_LIMIT_PER_DAY) {
      return new Response("Too Many Requests", { status: 429 });
    }
  }

  await db.insert(requestLogs).values({ userId });

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
  };

  const { messages: requestMessages, chatId } = body;

  // Create or get chat ID
  let currentChatId = chatId;
  if (!currentChatId) {
    // Create new chat with user's message
    currentChatId = crypto.randomUUID();
    const title = requestMessages[0]?.content?.slice(0, 50) ?? "New Chat";

    await upsertChat({
      userId,
      chatId: currentChatId,
      title,
      messages: requestMessages,
    });
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Send the new chat ID if we created one
      if (!chatId) {
        console.log(
          "Sending NEW_CHAT_CREATED event with chatId:",
          currentChatId,
        );
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }

      const result = streamText({
        model,
        messages: requestMessages,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }: { query: string }, { abortSignal }) => {
              const results = (await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              )) as {
                organic: Array<{
                  title: string;
                  link: string;
                  snippet: string;
                }>;
              };

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        maxSteps: 10,
        system: `You are a helpful AI assistant with access to real-time web search.
                1. Always search the web for up-to-date information when relevant.
                2. Cite your sources using inline links [like this](url) and always format URLs as markdown links.
                3. Be thorough but concise in your responses.
                4. If you're unsure about something, search the web to verify.
                5. When providing information, always include the source where you found it.

                Remember to use the searchWeb tool whenever you need to find current information.`,
        onFinish: async ({ response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages: requestMessages,
            responseMessages,
          });

          // Save the updated messages to the database
          const title = updatedMessages[0]?.content?.slice(0, 50) ?? "New Chat";

          await upsertChat({
            userId,
            chatId: currentChatId,
            title,
            messages: updatedMessages,
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
