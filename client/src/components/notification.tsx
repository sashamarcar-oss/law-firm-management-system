"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  conversationId?: string;
}

interface NotificationBellProps {
  // Optional props. If provided, component acts controlled
  notifications?: Notification[];
  unreadCount?: number;
  onClickNotification?: (notif: Notification) => void;
}

export const NotificationBell = ({
  notifications: externalNotifications,
  unreadCount: externalUnreadCount,
  onClickNotification: externalClick,
}: NotificationBellProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const isControlled = !!externalNotifications;

  // ── Real-time listener (only if uncontrolled) ───────────────
  useEffect(() => {
    if (isControlled) return; // skip if parent provides notifications
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[]
      );
    });

    return () => unsubscribe();
  }, [currentUser?.uid, isControlled]);

  const handleClick = async (notif: Notification) => {
    try {
      // Mark as read only if uncontrolled
      if (!isControlled && !notif.read) {
        await updateDoc(doc(db, "notifications", notif.id), {
          read: true,
        });
      }

      setOpen(false);

      // Call external click handler if provided
      if (externalClick) {
        externalClick(notif);
      } else {
        // Default navigation
        if (notif.conversationId) {
          navigate(`/client/messages?c=${notif.conversationId}`);
        } else {
          navigate("/client/messages");
        }
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  const currentNotifications = isControlled ? externalNotifications! : notifications;
  const unreadCount = isControlled
    ? externalUnreadCount ?? currentNotifications.filter((n) => !n.read).length
    : currentNotifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white shadow-xl border rounded-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {currentNotifications.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No notifications
            </div>
          ) : (
            currentNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                  !n.read ? "bg-indigo-50/40" : ""
                }`}
                onClick={() => handleClick(n)}
              >
                <p className="font-medium text-slate-900">{n.title}</p>
                <p className="text-sm text-slate-600 mt-1">{n.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
