// src/pages/LawyerAI.tsx

import { useState, useRef, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase"; // Adjust path if needed

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIResponse = {
  reply: string;
};

export default function LawyerAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom whenever a new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const chatWithLawyerAI = httpsCallable(functions, "chatWithLawyerAI");
      const result = await chatWithLawyerAI({ message: userMessage });

      // Type-safe access to AI reply
      const aiReply: string = (result.data as AIResponse)?.reply || 
        "Sorry, I couldn't generate a response.";

      setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
    } catch (error: any) {
      console.error("AI Error:", error);

      const errorMsg = error.message?.includes("already booked")
        ? "This time slot is already taken."
        : error.message || "Failed to get response from AI. Please try again.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${errorMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 Legal AI Assistant</h1>

      {/* Chat Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl h-96 p-4 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            Ask me anything about Kenyan law, legal procedures, or your case...
          </p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`inline-block max-w-[80%] p-3 rounded-lg break-words ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your legal question here..."
          className="flex-1 border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}