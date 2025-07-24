import type { Message } from "ai";
import {
  appendResponseMessages,
  createDataStreamResponse,
  streamText,
} from "ai";
import { between, eq } from "drizzle-orm";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/scraper";
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

  // Initialize Langfuse client
  const langfuse = new Langfuse({
    environment: env.NODE_ENV,
  });

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
    chatId: string;
    isNewChat: boolean;
  };

  const { messages: requestMessages, chatId, isNewChat } = body;

  // Create or get chat ID
  const currentChatId = chatId;
  if (isNewChat) {
    // Create new chat with user's message
    // Extract title from the first message's parts since content is empty
    const firstMessage = requestMessages[0];
    let title = "New Chat";

    if (firstMessage?.parts && Array.isArray(firstMessage.parts)) {
      const textPart = firstMessage.parts.find(
        (part) => typeof part === "object" && part !== null && "text" in part,
      );
      if (textPart && typeof textPart === "object" && "text" in textPart) {
        title = String(textPart.text).slice(0, 50);
      }
    }

    await upsertChat({
      userId,
      chatId: currentChatId,
      title,
      messages: requestMessages,
    });
  }

  // Create Langfuse trace
  const trace = langfuse.trace({
    sessionId: currentChatId,
    name: "chat",
    userId: session.user.id,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Send the new chat ID if we created one
      if (isNewChat) {
        console.log(
          "Sending NEW_CHAT_CREATED event with chatId:",
          currentChatId,
        );
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }

      const now = new Date();
      const formattedDate = now.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });

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
                { q: query, num: 15 }, // Increased from 10 to 15
                abortSignal,
              )) as {
                organic: Array<{
                  title: string;
                  link: string;
                  snippet: string;
                  date?: string | null;
                }>;
              };

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
                date: result.date ?? null,
              }));
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z
                .array(z.string())
                .describe("Array of URLs to scrape for full content"),
            }),
            execute: async ({ urls }: { urls: string[] }) => {
              const crawlResult = await bulkCrawlWebsites({ urls });

              if (!crawlResult.success) {
                return {
                  error: crawlResult.error,
                  results: crawlResult.results.map((r) => ({
                    url: r.url,
                    success: r.result.success,
                    data: r.result.success ? r.result.data : r.result.error,
                  })),
                };
              }

              return {
                success: true,
                results: crawlResult.results.map((r) => ({
                  url: r.url,
                  data: r.result.data,
                })),
              };
            },
          },
        },
        maxSteps: 10,
        system: `You are a helpful AI assistant with access to real-time web search and web scraping capabilities.

                CURRENT DATE AND TIME: ${formattedDate}

                1. Always search the web for up-to-date information when relevant.
                2. When users ask for "current", "latest", "recent", or "up-to-date" information, use the current date above to craft specific search queries (e.g., "weather today ${formattedDate.split(",")[0]}", "latest news December 2024").
                3. Pay attention to publication dates in search results - prioritize more recent articles when users ask for current information.
                4. Cite your sources using inline links [like this](url) and always format URLs as markdown links.
                5. Be thorough but concise in your responses.
                6. If you're unsure about something, search the web to verify.
                7. When providing information, always include the source where you found it and mention the publication date when available.
                8. For each query, select and cite information from 4-6 different URLs, prioritizing a diverse set of sources (different domains) in your answers. Avoid relying on a single website or domain.

                Available tools:
                - searchWeb: ALWAYS use this to find relevant web pages and get snippets of content. Results include publication dates when available.
                - scrapePages: Use this to extract the full content of specific web pages. This is useful when you need detailed information from articles, documentation, or other content-rich pages. Only use this tool when you have specific URLs that you want to analyze in detail.

                Workflow:
                1. Use searchWeb to find relevant pages for the user's query
                2. If you need more detailed information from specific pages, use scrapePages to get the full content
                3. Always cite your sources and provide comprehensive answers based on the scraped content
                4. When selecting sources, ensure you include a variety of domains to maximize diversity and reliability.
                5. When users ask for current/recent information, prioritize sources with recent publication dates.

                Remember to use the searchWeb tool first to find relevant information, then use scrapePages for detailed analysis when needed.`,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        onFinish: async ({ response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages: requestMessages,
            responseMessages,
          });

          // Save the updated messages to the database
          // Extract title from the first message's parts since content is empty
          const firstMessage = updatedMessages[0];
          let title = "New Chat";

          if (firstMessage?.parts && Array.isArray(firstMessage.parts)) {
            const textPart = firstMessage.parts.find(
              (part) =>
                typeof part === "object" && part !== null && "text" in part,
            );
            if (
              textPart &&
              typeof textPart === "object" &&
              "text" in textPart
            ) {
              title = String(textPart.text).slice(0, 50);
            }
          }

          await upsertChat({
            userId,
            chatId: currentChatId,
            title,
            messages: updatedMessages,
          });

          // Flush the trace to Langfuse
          await langfuse.flushAsync();
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
