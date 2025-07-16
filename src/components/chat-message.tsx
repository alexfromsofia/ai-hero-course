import type { Message } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";

export type MessagePart = NonNullable<Message["parts"]>[number];
type ToolInvocationType = Extract<
  MessagePart,
  { type: "tool-invocation" }
>["toolInvocation"];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
}

const ToolInvocation = ({
  toolInvocation,
}: {
  toolInvocation: ToolInvocationType;
}) => (
  <div
    className="mb-2 rounded bg-gray-700/60 p-2 font-mono text-sm text-blue-200"
    title="Hover to see the MessagePart type. Try exploring the code for all possible part types!"
  >
    <div className="mb-1 font-semibold text-blue-300">
      Tool Call: <span className="font-mono">{toolInvocation.toolName}</span>
    </div>
    <div>
      <span className="text-gray-400">Arguments:</span>
      <pre className="overflow-x-auto rounded bg-gray-800 p-2 text-xs text-gray-200">
        {JSON.stringify(toolInvocation.args, null, 2)}
      </pre>
    </div>
    {"result" in toolInvocation && toolInvocation.result !== undefined && (
      <div className="mt-2">
        <span className="text-gray-400">Result:</span>
        <pre className="overflow-x-auto rounded bg-gray-800 p-2 text-xs text-green-200">
          {JSON.stringify(toolInvocation.result, null, 2)}
        </pre>
      </div>
    )}
    <div className="mt-1 text-xs text-gray-400">
      ToolCallId: {toolInvocation.toolCallId}
    </div>
    <div className="mt-1 text-xs text-gray-400">
      State: {toolInvocation.state}
    </div>
  </div>
);

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
    case "tool-invocation": {
      // Show state, tool name, args, and result if present
      return (
        <ToolInvocation key={index} toolInvocation={part.toolInvocation} />
      );
    }
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

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

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
          {parts.map((part, i) => renderPart(part, i))}
        </div>
      </div>
    </div>
  );
};
