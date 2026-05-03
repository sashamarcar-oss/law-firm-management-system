// src/components/layout/NotificationBell.tsx
import { useState, useEffect, useRef } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { Timestamp } from "firebase/firestore";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;     // caseId / conversationId / etc.
  read: boolean;
  createdAt: Timestamp;
}

export function NotificationBell() {
  const { currentUser } = useAuth();    // ← fixed: changed from user → currentUser
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time listener for notifications
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid),   // ← fixed
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      const newUnread = items.filter((n) => !n.read).length;

      // Only trigger sound/toast when unread count actually increases
      if (newUnread > unreadCount) {
        // Notification sound
        const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3");
        audio.volume = 0.4;
        audio.play().catch(() => {});

        // Vibration on mobile
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }

        toast("New notification received", {
          icon: <Bell className="h-5 w-5 text-blue-600" />,
          duration: 4000,
        });
      }

      setUnreadCount(newUnread);
      setNotifications(items);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, unreadCount]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);

    if (notif.relatedId) {
      // Adjust route according to your app structure
      // Examples:
      // navigate(`/client/cases/${notif.relatedId}`);
      // navigate(`/client/messages?c=${notif.relatedId}`);
      navigate(`/client/messages?c=${notif.relatedId}`);
    }

    setIsOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-full hover:bg-accent/80"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 min-w-[1.4rem] h-5 px-1.5 text-xs font-bold flex items-center justify-center rounded-full animate-pulse"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-blue-600">
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notif.read ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {notif.createdAt?.toDate?.() &&
                          formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
