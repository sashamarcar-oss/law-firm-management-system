import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  loading?: boolean;
  avatarUrl?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  placeholder = "Type your message...",
  loading = false,
  avatarUrl,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-3 p-4 border-t bg-white dark:bg-gray-900">
      {/* Avatar */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="User"
          className="w-9 h-9 rounded-full object-cover"
        />
      )}

      {/* Input Box */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none rounded-2xl border px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || loading}
          className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;