"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import Button from "@/components/ui/button";

interface Reply {
  text: string;
  timestamp: Timestamp | Date;
}

interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  message: string;
  timestamp?: Timestamp | Date;
  status?: "new" | "seen" | "replied" | "seen, replied";
  replies?: Reply[];
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: ContactMessage[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        let replies: Reply[] = d.replies || [];
        let status = (d.status as ContactMessage["status"]) || "new";

        if (d.reply && !d.replies) {
          replies = [{ text: d.reply, timestamp: d.timestamp || Timestamp.now() }];
          status = "seen, replied";
        }

        return {
          id: docSnap.id,
          fullName: d.fullName || "",
          email: d.email || "",
          message: d.message || "",
          timestamp: d.timestamp,
          status,
          replies,
        };
      });
      setMessages(data);
    });

    return () => unsubscribe();
  }, []);

  const handleReplyChange = (id: string, value: string) => {
    setReplyInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleReplySubmit = async (id: string) => {
    const replyText = replyInputs[id]?.trim();
    if (!replyText) return;

    setIsSubmitting((prev) => ({ ...prev, [id]: true }));

    try {
      const messageRef = doc(db, "messages", id);
      const docSnap = await getDoc(messageRef);

      if (!docSnap.exists()) {
        alert("Message not found!");
        return;
      }

      const currentData = docSnap.data();
      const currentReplies: Reply[] = currentData.replies || [];

      const newReply: Reply = {
        text: replyText,
        timestamp: Timestamp.now(),
      };

      const updatedReplies = [...currentReplies, newReply];

      // 1. Update the message with the new reply
      await updateDoc(messageRef, {
        replies: updatedReplies,
        status: "seen, replied",
      });

      // 2. Send email notification using Trigger Email extension
      const messageData = currentData;
      await addDoc(collection(db, "mail"), {
        to: messageData.email,
        message: {
          subject: `Re: Your Message - Law Firm Response`,
          text: `Dear ${messageData.fullName},\n\nThank you for reaching out.\n\nOur team replied to your message:\n\n"${replyText}"\n\nBest regards,\nLaw Firm Team`,
          html: `
            <h2>Dear ${messageData.fullName},</h2>
            <p>Thank you for contacting us.</p>
            <p><strong>Our reply:</strong></p>
            <p style="background:#f8f9fa; padding:15px; border-left:4px solid #3b82f6;">
              ${replyText}
            </p>
            <p>Best regards,<br><strong>Law Firm Team</strong></p>
          `,
        },
      });

      setReplyInputs((prev) => ({ ...prev, [id]: "" }));
      alert("Reply sent successfully and email notification triggered! ✅");

    } catch (error: any) {
      console.error("Error:", error);
      alert("Failed to send reply. Check console for details.");
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (error) {
      alert("Failed to delete message.");
    }
  };

  const StatusBadge = ({ status }: { status?: string }) => {
    let colorClass = "bg-gray-100 text-gray-600";
    let label = "New";

    switch (status) {
      case "new":
        colorClass = "bg-yellow-100 text-yellow-700 border border-yellow-300";
        label = "New";
        break;
      case "seen":
        colorClass = "bg-blue-100 text-blue-700 border border-blue-300";
        label = "Seen";
        break;
      case "replied":
      case "seen, replied":
        colorClass = "bg-green-100 text-green-700 border border-green-300";
        label = "Replied";
        break;
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
        <p className="text-sm text-gray-500">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-start p-6 pb-4 border-b">
                <div>
                  <h2 className="font-semibold text-xl text-gray-900">{msg.fullName}</h2>
                  <p className="text-sm text-gray-500 mt-1">{msg.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={msg.status} />
                  <Button onClick={() => handleDelete(msg.id)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-sm rounded-lg">
                    Delete
                  </Button>
                </div>
              </div>

              <div className="p-6 pt-4">
                <div className="bg-gray-50 p-5 rounded-xl">
                  <p className="text-gray-700 leading-relaxed">{msg.message}</p>
                  <p className="mt-4 text-xs text-gray-400">
                    {msg.timestamp instanceof Timestamp
                      ? msg.timestamp.toDate().toLocaleString()
                      : new Date(msg.timestamp as any).toLocaleString()}
                  </p>
                </div>

                {msg.replies && msg.replies.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Admin Replies</h3>
                    <div className="space-y-4">
                      {[...msg.replies].reverse().map((reply, idx) => (
                        <div key={idx} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-xl">
                          <p className="font-medium text-blue-900 mb-1">Admin Reply:</p>
                          <p className="text-gray-800">{reply.text}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {reply.timestamp instanceof Timestamp
                              ? reply.timestamp.toDate().toLocaleString()
                              : new Date(reply.timestamp as any).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <textarea
                    placeholder="Type your reply here..."
                    value={replyInputs[msg.id] || ""}
                    onChange={(e) => handleReplyChange(msg.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-4 min-h-[110px] resize-y focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={() => handleReplySubmit(msg.id)}
                      disabled={!replyInputs[msg.id]?.trim() || isSubmitting[msg.id]}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-medium"
                    >
                      {isSubmitting[msg.id] ? "Sending..." : "Send Reply & Notify"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}