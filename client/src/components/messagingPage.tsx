"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { MessageCircle, PencilLine, Search, SendHorizonal, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { db } from "@/firebase";
import { useAuth, type Role } from "@/context/AuthContext";
import Button from "@/components/ui/button";
import { logger } from "@/lib/activityLogger";

type Conversation = {
  id: string;
  participants?: string[];
  lastMessage?: string;
  updatedAt?: Timestamp | null;
};

type AppUserRecord = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  online?: boolean;
  lastSeen?: Timestamp | null;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt?: Timestamp | null;
  seenBy?: string[];
};

const formatTime = (value?: Timestamp | null) => {
  if (!value) return "";
  return value.toDate().toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDayLabel = (value?: Timestamp | null) => {
  if (!value) return "";

  const date = value.toDate();
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) return "Today";

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPresence = (user?: AppUserRecord | null) => {
  if (!user) return "Offline";
  if (user.online) return "Online";
  if (user.lastSeen) return `Last seen ${formatTime(user.lastSeen)}`;
  return "Offline";
};

export default function MessagingPage() {
  const { firebaseUser, currentUser } = useAuth();
  const uid = firebaseUser?.uid;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, AppUserRecord>>({});
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [roleUsers, setRoleUsers] = useState<AppUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);

  const allowedTargetRoles = useMemo<Role[]>(() => {
    switch (currentUser?.role) {
      case "client":
        return ["lawyer", "admin"];
      case "lawyer":
        return ["client", "lawyer", "admin"];
      case "admin":
        return ["client", "lawyer", "admin"];
      default:
        return [];
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (!uid) return;

    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const map: Record<string, AppUserRecord> = {};
      snap.forEach((userDoc) => {
        map[userDoc.id] = {
          id: userDoc.id,
          ...(userDoc.data() as Omit<AppUserRecord, "id">),
        };
      });
      setUsersMap(map);
    });

    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const nextConversations = snap.docs.map((conversationDoc) => ({
        id: conversationDoc.id,
        ...(conversationDoc.data() as Omit<Conversation, "id">),
      }));

      nextConversations.sort((a, b) => {
        const aMillis = a.updatedAt?.toMillis?.() ?? 0;
        const bMillis = b.updatedAt?.toMillis?.() ?? 0;
        return bMillis - aMillis;
      });

      setConversations(nextConversations);
      if (!selectedConvId && nextConversations[0]?.id) {
        setSelectedConvId(nextConversations[0].id);
      }
    });

    return () => unsub();
  }, [uid, selectedConvId]);

  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", selectedConvId),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...(messageDoc.data() as Omit<ChatMessage, "id">),
        }))
      );
    });

    return () => unsub();
  }, [selectedConvId]);

  useEffect(() => {
    if (!selectedRole) {
      setRoleUsers([]);
      return;
    }

    const q = query(collection(db, "users"), where("role", "==", selectedRole));

    const unsub = onSnapshot(q, (snap) => {
      setRoleUsers(
        snap.docs.map((userDoc) => ({
          id: userDoc.id,
          ...(userDoc.data() as Omit<AppUserRecord, "id">),
        }))
      );
    });

    return () => unsub();
  }, [selectedRole]);

  useEffect(() => {
    const requestedConversationId = searchParams.get("c");
    if (requestedConversationId && conversations.some((item) => item.id === requestedConversationId)) {
      setSelectedConvId(requestedConversationId);
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;

    const requestedRole = searchParams.get("role");
    setShowNewChatModal(true);

    if (requestedRole && allowedTargetRoles.includes(requestedRole as Role)) {
      setSelectedRole(requestedRole);
    }
  }, [allowedTargetRoles, searchParams]);

  useEffect(() => {
    if (!selectedRole) return;

    if (!allowedTargetRoles.includes(selectedRole as Role)) {
      setSelectedRole("");
      setSelectedUserId("");
      setRoleUsers([]);
      toast.error("You can only start chats with allowed contacts.");
    }
  }, [allowedTargetRoles, selectedRole]);

  const getOtherUser = (convId: string | null) => {
    if (!convId) return null;

    const conv = conversations.find((item) => item.id === convId);
    const otherId = conv?.participants?.find((participantId) => participantId !== uid);

    return otherId ? usersMap[otherId] || null : null;
  };

  const selectedConversation = conversations.find((item) => item.id === selectedConvId) ?? null;
  const selectedOtherUser = getOtherUser(selectedConvId);
  const otherParticipantId = selectedConversation?.participants?.find((participantId) => participantId !== uid);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConvId]);

  useEffect(() => {
    if (!uid || !otherParticipantId || messages.length === 0) return;

    const unseenIncomingMessages = messages.filter(
      (msg) => msg.senderId === otherParticipantId && !(msg.seenBy || []).includes(uid)
    );

    if (unseenIncomingMessages.length === 0) return;

    void Promise.all(
      unseenIncomingMessages.map((msg) =>
        updateDoc(doc(db, "messages", msg.id), {
          seenBy: arrayUnion(uid),
        })
      )
    ).catch((error) => {
      console.error("Failed to update seen state:", error);
    });
  }, [messages, otherParticipantId, uid]);

  const filteredConversations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return conversations;

    return conversations.filter((conv) => {
      const otherUser = getOtherUser(conv.id);
      const label = (
        otherUser?.name ||
        otherUser?.displayName ||
        otherUser?.email ||
        "Unknown"
      ).toLowerCase();

      return label.includes(needle) || (conv.lastMessage || "").toLowerCase().includes(needle);
    });
  }, [conversations, search, usersMap, uid]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedConvId || !uid) return;

    const messageText = text.trim();
    const conv = conversations.find((item) => item.id === selectedConvId);
    const otherUserId = conv?.participants?.find((participantId) => participantId !== uid);

    await addDoc(collection(db, "messages"), {
      conversationId: selectedConvId,
      senderId: uid,
      text: messageText,
      createdAt: serverTimestamp(),
      seenBy: [uid],
    });

    await updateDoc(doc(db, "conversations", selectedConvId), {
      lastMessage: messageText,
      updatedAt: serverTimestamp(),
      ...(otherUserId ? { [`unread.${otherUserId}`]: true } : {}),
    });

    const senderName =
      currentUser?.displayName || currentUser?.email || firebaseUser?.email || "User";
    const receiverName =
      selectedOtherUser?.name ||
      selectedOtherUser?.displayName ||
      selectedOtherUser?.email ||
      "Recipient";

    await logger.messageSent(senderName, receiverName, uid);

    setText("");
  };

  const getMessageStatus = (msg: ChatMessage) => {
    if (msg.senderId !== uid) return null;

    const seenByOtherUser = Boolean(
      otherParticipantId && (msg.seenBy || []).includes(otherParticipantId)
    );

    if (seenByOtherUser) {
      return (
        <span className="ml-2 inline-flex items-center text-[11px] font-semibold text-sky-500">
          <span>✓</span>
          <span className="-ml-1">✓</span>
        </span>
      );
    }

    return (
      <span className="ml-2 inline-flex items-center text-[11px] font-semibold text-slate-400">
        ✓
      </span>
    );
  };

  const startConversation = async () => {
    if (!selectedUserId || !uid || isStartingChat) return;

    setIsStartingChat(true);

    try {
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", uid)
      );

      const snap = await getDocs(q);

      const existing = snap.docs.find((conversationDoc) => {
        const data = conversationDoc.data() as Conversation;
        return data.participants?.includes(selectedUserId);
      });

      let convId = existing?.id;

      if (!convId) {
        const newConv = await addDoc(collection(db, "conversations"), {
          participants: [uid, selectedUserId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: "",
          unread: { [selectedUserId]: true },
        });

        convId = newConv.id;
      }

      setShowNewChatModal(false);
      setSelectedRole("");
      setSelectedUserId("");
      setRoleUsers([]);
      setSelectedConvId(convId);
      setSearchParams(convId ? { c: convId } : {});
      toast.success("Chat ready. You can send your first message.");
    } catch (err) {
      console.error("Failed to start chat:", err);
      toast.error("Could not start chat. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  if (!uid) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#efeae2] text-slate-700">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#efeae2] text-slate-900 p-4">
      <div className="mx-auto flex h-full max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <aside className="flex w-full max-w-sm flex-col border-r border-slate-200 bg-[#f8fafc]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Messages</h1>
                <p className="text-xs text-slate-500">Chat like WhatsApp</p>
              </div>
            </div>

            <Button onClick={() => setShowNewChatModal(true)} className="rounded-full px-4">
              <PencilLine className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>

          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="px-6 py-10">
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm">
                  <p className="text-sm text-slate-500">No conversations yet.</p>
                  <Button
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-4 rounded-full px-5"
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Start chat
                  </Button>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherUser = getOtherUser(conv.id);
                const label = otherUser?.name || otherUser?.displayName || otherUser?.email || "Unknown";

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-200 px-4 py-4 text-left transition-colors ${
                      selectedConvId === conv.id ? "bg-emerald-50" : "hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                      <div className="relative">
                        <UserRound className="h-5 w-5" />
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#f8fafc] ${
                            otherUser?.online ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-semibold text-slate-900">{label}</p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatTime(conv.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {conv.lastMessage || formatPresence(otherUser)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[#efeae2]">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-slate-500">
              Select a conversation or click New to start chatting.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#f0f2f5] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                    <div className="relative">
                      <UserRound className="h-5 w-5" />
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#f0f2f5] ${
                          selectedOtherUser?.online ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {selectedOtherUser?.name ||
                        selectedOtherUser?.displayName ||
                        selectedOtherUser?.email ||
                        "Chat"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedOtherUser?.online ? "Online" : formatPresence(selectedOtherUser)}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto px-5 py-6"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              >
                <div className="mx-auto max-w-3xl space-y-3">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl bg-white/80 px-5 py-4 text-center text-sm text-slate-500 shadow-sm">
                      No messages yet. Say hello to start the conversation.
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const previous = messages[index - 1];
                      const showDayDivider =
                        !previous ||
                        formatDayLabel(previous.createdAt) !== formatDayLabel(msg.createdAt);

                      return (
                        <div key={msg.id}>
                          {showDayDivider ? (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                                {formatDayLabel(msg.createdAt)}
                              </span>
                            </div>
                          ) : null}

                          <div className={`flex ${msg.senderId === uid ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                msg.senderId === uid
                                  ? "rounded-br-md bg-[#d9fdd3] text-slate-900"
                                  : "rounded-bl-md bg-white text-slate-900"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">{msg.text}</p>
                              <div className="mt-1 flex items-center justify-end text-[11px] text-slate-500">
                                {formatTime(msg.createdAt)}
                                {getMessageStatus(msg)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-slate-200 bg-[#f0f2f5] px-4 py-3">
                <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[28px] bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                  <input
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Type a message"
                  />
                  <Button
                    onClick={() => void sendMessage()}
                    disabled={!text.trim()}
                    className="rounded-full px-4"
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">Start a new chat</h2>

            <select
              className="mb-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setSelectedUserId("");
              }}
            >
              <option value="">Select Role</option>
              {allowedTargetRoles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>

            {selectedRole ? (
              roleUsers.filter((user) => user.id !== uid).length > 0 ? (
                <select
                  className="mb-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Select User</option>
                  {roleUsers
                    .filter((user) => user.id !== uid)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.displayName || user.email}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No available {selectedRole}s found to chat with right now.
                </div>
              )
            ) : null}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedRole("");
                  setSelectedUserId("");
                  setSearchParams(selectedConvId ? { c: selectedConvId } : {});
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={() => void startConversation()}
                disabled={!selectedUserId || isStartingChat}
              >
                {isStartingChat ? "Starting..." : "Start Chat"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
