// src/pages/admin/ConversationView.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { CheckCheck, Check } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "client" | "lawyer";
  createdAt?: Timestamp;
  readBy?: string[];
  readByClient?: boolean;
  readByLawyer?: boolean;
}

export default function ConversationView() {
  const { caseId } = useParams<{ caseId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!caseId) return;

    const messagesCollectionRef = collection(db, "cases", caseId, "messages");

    const q = query(
      messagesCollectionRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data: Message[] = snap.docs.map((d) => {
          const msg = d.data() as Omit<Message, "id">;

          return {
            id: d.id,
            ...msg,
            readByClient: msg.readBy?.includes("client") || false,
            readByLawyer: msg.readBy?.includes("lawyer") || false,
          };
        });

        setMessages(data);
      },
      (err) => {
        console.error("Messages listener error:", err);
      }
    );

    return unsubscribe;
  }, [caseId]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Conversation – Case #{caseId?.slice(0, 8)}
      </h1>

      <div className="bg-white rounded-xl shadow border p-6 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "lawyer" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm relative ${
                  msg.sender === "lawyer"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.text}

                <div className="text-xs opacity-70 mt-1 flex items-center justify-end gap-1">
                  {msg.createdAt?.toDate()?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}

                  {msg.sender === "lawyer" && (
                    <span className="ml-2">
                      {msg.readByClient ? (
                        <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                      ) : msg.readByLawyer ? (
                        <Check className="h-3.5 w-3.5 text-blue-300" />
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}