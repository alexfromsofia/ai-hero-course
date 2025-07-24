import type { Message } from "ai";
import { appendResponseMessages, createDataStreamResponse } from "ai";
import { between, eq } from "drizzle-orm";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { streamFromDeepSearch } from "~/deep-search";
import { auth } from "~/server/auth/index.ts";
import { db } from "~/server/db";
import { upsertChat } from "~/server/db/chat-helpers";
import { requestLogs } from "~/server/db/schema";
import {
  checkRateLimit,
  recordRateLimit,
  type RateLimitConfig,
} from "~/server/rate-limit";

export const maxDuration = 60;

const REQUEST_LIMIT_PER_DAY = 100;

// Global LLM rate limit configuration - for testing: 1 request per 5 seconds
const LLM_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 1,
  maxRetries: 3,
  windowMs: 5000, // 5 seconds
  keyPrefix: "global_llm",
};

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

  // Create Langfuse trace (will update sessionId later)
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  // Check if user is admin
  const userLookupSpan = trace.span({
    name: "user-admin-check",
    input: { userId },
  });
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  });
  const isAdmin = user?.isAdmin;
  userLookupSpan.end({
    output: { isAdmin, userFound: !!user },
  });

  if (!isAdmin) {
    // Count requests for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const requestCountSpan = trace.span({
      name: "check-daily-request-limit",
      input: { userId, startOfDay, endOfDay, limit: REQUEST_LIMIT_PER_DAY },
    });
    const todayLogs = await db
      .select()
      .from(requestLogs)
      .where(
        eq(requestLogs.userId, userId) &&
          between(requestLogs.requestedAt, startOfDay, endOfDay),
      );
    requestCountSpan.end({
      output: {
        requestCount: todayLogs.length,
        limitExceeded: todayLogs.length >= REQUEST_LIMIT_PER_DAY,
      },
    });

    if (todayLogs.length >= REQUEST_LIMIT_PER_DAY) {
      return new Response("Too Many Requests", { status: 429 });
    }
  }

  const logRequestSpan = trace.span({
    name: "log-request",
    input: { userId },
  });
  await db.insert(requestLogs).values({ userId });
  logRequestSpan.end({
    output: { success: true },
  });

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

    const createChatSpan = trace.span({
      name: "create-new-chat",
      input: {
        userId,
        chatId: currentChatId,
        title,
        messageCount: requestMessages.length,
      },
    });
    await upsertChat({
      userId,
      chatId: currentChatId,
      title,
      messages: requestMessages,
    });
    createChatSpan.end({
      output: { success: true, chatCreated: true },
    });
  }

  // Update trace with sessionId now that we have chatId
  trace.update({
    sessionId: currentChatId,
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

      // Check global LLM rate limit before making the request
      const rateLimitSpan = trace.span({
        name: "check-global-llm-rate-limit",
        input: { config: LLM_RATE_LIMIT_CONFIG },
      });

      const rateLimitCheck = await checkRateLimit(LLM_RATE_LIMIT_CONFIG);

      if (!rateLimitCheck.allowed) {
        console.log("Global LLM rate limit exceeded, waiting for reset...");
        const isAllowed = await rateLimitCheck.retry();

        if (!isAllowed) {
          rateLimitSpan.end({
            output: { allowed: false, maxRetriesExceeded: true },
          });
          throw new Error(
            "Global LLM rate limit exceeded after maximum retries",
          );
        }
      }

      // Record the request
      await recordRateLimit(LLM_RATE_LIMIT_CONFIG);

      rateLimitSpan.end({
        output: {
          allowed: true,
          remaining: rateLimitCheck.remaining,
          totalHits: rateLimitCheck.totalHits,
          resetTime: rateLimitCheck.resetTime,
        },
      });

      const result = streamFromDeepSearch({
        messages: requestMessages,
        telemetry: {
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

          const saveChatSpan = trace.span({
            name: "save-chat-with-response",
            input: {
              userId,
              chatId: currentChatId,
              title,
              messageCount: updatedMessages.length,
            },
          });
          await upsertChat({
            userId,
            chatId: currentChatId,
            title,
            messages: updatedMessages,
          });
          saveChatSpan.end({
            output: { success: true, chatUpdated: true },
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
