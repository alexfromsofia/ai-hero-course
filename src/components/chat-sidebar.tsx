import { useChats } from "~/hooks/use-chats";
import type { Chat } from "~/shared/types";

export function ChatSidebar({
  selectedChatId,
  onSelectChat,
}: {
  selectedChatId?: string;
  onSelectChat: (id: string) => void;
}) {
  const { data: chats, isLoading } = useChats();

  if (isLoading) return <div className="p-4">Loading chats...</div>;
  if (!chats) return <div className="p-4">No chats found.</div>;

  return (
    <aside className="h-full w-64 overflow-y-auto border-r border-gray-800 bg-gray-950 p-4">
      <h2 className="mb-4 text-lg font-bold">Chats</h2>
      <ul>
        {chats.map((chat: Chat) => (
          <li key={chat.id}>
            <button
              className={`block w-full rounded px-2 py-1 text-left ${
                chat.id === selectedChatId
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              {chat.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
