"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Bell } from "lucide-react";

export default function WhatsAppClone() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  if (!currentUser?.uid) return <div>Loading...</div>;

  // ─── Conversations ────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    return onSnapshot(q, (snap) => {
      setConversations(
        snap.docs.map((doc) => ({
          id: doc.id,
          conversationId: doc.data().conversationId,
          participants: doc.data().participants,
          lastMessage: doc.data().lastMessage,
          lastMessageAt: doc.data().lastMessageAt,
          lastSenderId: doc.data().lastSenderId,
        }))
      );
    });
  }, [currentUser.uid]);

  // ─── Notifications ────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid)
    );

    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [currentUser.uid]);

  // ─── Messages ────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", activeChat.conversationId),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // mark unread as read
      msgs.forEach(async (m: any) => {
        if (m.senderId !== currentUser.uid && !m.read) {
          await updateDoc(doc(db, "messages", m.id), { read: true });
        }
      });
    });
  }, [activeChat]);

  // ─── Scroll to bottom ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Unread count ────────────────────────────────
  const getUnreadCount = (conversationId: string) =>
    messages.filter(
      (m) =>
        m.conversationId === conversationId &&
        !m.read &&
        m.senderId !== currentUser.uid
    ).length;

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  // ─── Send message ────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || !activeChat) return;

    const receiverId = activeChat.participants.replace(currentUser.uid, "").trim();

    await addDoc(collection(db, "messages"), {
      conversationId: activeChat.conversationId,
      senderId: currentUser.uid,
      receiverId,
      text,
      createdAt: serverTimestamp(),
      status: "sent",
      read: false,
    });

    await updateDoc(doc(db, "conversations", activeChat.id), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastSenderId: currentUser.uid,
    });

    setText("");
  };

  // ─── Handle notification click ────────────────────────────────
  const handleNotifClick = async (n: any) => {
    if (!n.read) await updateDoc(doc(db, "notifications", n.id), { read: true });

    const convo = conversations.find(
      (c) => c.conversationId === n.conversationId
    );
    if (convo) setActiveChat(convo);

    setNotifOpen(false);

    // Scroll to bottom after loading messages
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ─── Layout ────────────────────────────────
  return (
    <div className="h-screen flex bg-[#111b21] text-white">
      {/* Sidebar */}
      <div className="w-1/3 bg-[#202c33] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold">Chats</h2>
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-full hover:bg-[#2a3942]"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-black shadow-xl rounded-lg max-h-64 overflow-y-auto z-50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-600">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                        !n.read ? "bg-indigo-50" : ""
                      }`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-gray-700">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.conversationId}
              className={`p-4 border-b cursor-pointer hover:bg-[#2a3942] flex justify-between items-center ${
                activeChat?.conversationId === c.conversationId ? "bg-[#2a3942]" : ""
              }`}
              onClick={() => setActiveChat(c)}
            >
              <div>
                <div className="font-medium truncate">{c.participants}</div>
                <div className="text-sm text-slate-300 truncate">{c.lastMessage}</div>
              </div>
              {getUnreadCount(c.conversationId) > 0 && (
                <div className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {getUnreadCount(c.conversationId)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a chat
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] p-2 rounded-lg ${isMe ? "bg-[#056162]" : "bg-[#262d31]"}`}>
                      <div>{msg.text}</div>
                      <div className="text-xs text-slate-400 mt-1 text-right">
                        {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && msg.read ? " ✓✓" : ""}
                        {isMe && !msg.read ? " ✓" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 flex gap-2 bg-[#202c33]">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 p-2 rounded-lg text-black"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-green-500 px-4 py-2 rounded-lg font-semibold"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}