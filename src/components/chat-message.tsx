import type { Message } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  message: Message;
  userName: string;
}

const components: Components = {
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

function renderPart(part: MessagePart, index: number) {
  // Encourage user to hover for more info
  const hoverHint =
    "Hover to see the MessagePart type. Try exploring the code for all possible part types!";

  switch (part.type) {
    case "text":
      return (
        <div key={index} title={hoverHint} className="mb-2">
          <Markdown>{part.text}</Markdown>
        </div>
      );
    case "tool-invocation":
      return (
        <div
          key={index}
          title={hoverHint}
          className="mb-2 rounded bg-gray-700/60 p-2 font-mono text-sm text-blue-200"
        >
          <div className="mb-1 font-semibold text-blue-300">
            Tool Call:{" "}
            <span className="font-mono">{part.toolInvocation.toolName}</span>
          </div>
          <div>
            <span className="text-gray-400">Arguments:</span>
            <pre className="overflow-x-auto rounded bg-gray-800 p-2 text-xs text-gray-200">
              {JSON.stringify(part.toolInvocation.args, null, 2)}
            </pre>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            ToolCallId: {part.toolInvocation.toolCallId}
          </div>
        </div>
      );
    // Add more cases for other part types if needed
    default:
      return (
        <div
          key={index}
          title={hoverHint}
          className="mb-2 italic text-gray-400"
        >
          [Unsupported part type: {part.type}]
        </div>
      );
  }
}

export const ChatMessage = ({ message, userName }: ChatMessageProps) => {
  const isAI = message.role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>
        <div className="prose prose-invert max-w-none">
          {Array.isArray(message.parts)
            ? message.parts.map((part, i) => renderPart(part, i))
            : message.content && <Markdown>{String(message.content)}</Markdown>}
        </div>
      </div>
    </div>
  );
};
