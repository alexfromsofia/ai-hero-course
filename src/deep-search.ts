import type { Message, TelemetrySettings } from "ai";
import { streamText } from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/scraper";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) => {
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

  return streamText({
    model,
    messages: opts.messages,
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
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: (result) => {
      console.log("onFinish", result);
    }, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
