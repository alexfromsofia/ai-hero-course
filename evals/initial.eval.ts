import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[]; expected: string }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content: "What is the latest version of TypeScript?",
          },
        ],
        expected:
          "TypeScript 5.6 is the latest stable version released in September 2024, featuring improved type inference, better performance, and enhanced support for modern JavaScript features.",
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content: "What are the main features of Next.js 15?",
          },
        ],
        expected:
          "Next.js 15 introduces React 19 support, improved caching strategies, enhanced performance optimizations, better developer experience with faster builds, and new experimental features for server components.",
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Regex pattern to match markdown links: [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);

        return containsLinks ? 1 : 0;
      },
    },
    {
      name: "Contains URLs",
      description:
        "Checks if the output contains any URLs (including malformed links).",
      scorer: ({ output }) => {
        // Regex pattern to match any HTTP(S) URLs
        const anyUrlPattern = /https?:\/\/[^\s\]]+/;
        const containsUrls = anyUrlPattern.test(output);

        return containsUrls ? 1 : 0;
      },
    },
    Levenshtein,
  ],
});
