"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  doc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import toast from "react-hot-toast";

import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logger } from "@/lib/activityLogger";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import MiniCalendar from "@/components/calendar";
import logo from "@/assets/logo.jpg";

import {
  Briefcase,
  Users,
  Clock,
  MessageSquare,
  Calendar as CalendarIcon,
  Bell,
  Plus,
  Calendar,
  Sun,
  Moon,
  User,
  LogOut,
} from "lucide-react";

import type { Case } from "@/components/case";

interface Appointment {
  id: string;
  clientName?: string;
  clientId?: string;
  client?: string;
  proposedDate?: Timestamp | string;
  date?: string;
  time?: string;
  title?: string;
  caseTitle?: string;
  case?: string;
  status?: string;
  lawyerId?: string;
}

interface Notification {
  id: string;
  message: string;
  title?: string;
  timestamp?: Timestamp;
  createdAt?: Timestamp;
  type?: string;
  read?: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByUid?: string;
  targetName?: string;
  details: string;
  timestamp: Timestamp | any;
}

const getDateValue = (value?: any): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatRelativeTime = (ts: any): string => {
  if (!ts) return "just now";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

const formatAppointmentSlot = (appointment: Appointment) => {
  const appointmentDate = getDateValue(appointment.date);
  if (appointmentDate && appointment.time) {
    return `${appointmentDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} at ${appointment.time}`;
  }

  if (typeof appointment.date === "string" && appointment.time) {
    return `${appointment.date} at ${appointment.time}`;
  }

  if (appointment.proposedDate) {
    return formatRelativeTime(appointment.proposedDate);
  }

  return "Time pending";
};

const formatDeadlineLabel = (deadline?: any) => {
  const date = getDateValue(deadline);
  if (!date) return "No deadline";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AnimatedCounter = ({ end, suffix = "" }: { end: number; suffix?: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const increment = Math.ceil(end / (duration / 16)) || 1;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else setCount(start);
    }, 16);

    return () => clearInterval(timer);
  }, [end]);

  return <span className="tabular-nums">{count.toLocaleString()}{suffix}</span>;
};

export default function LawyerDashboard() {
  const { firebaseUser, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsPendingCount, setAppointmentsPendingCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, AppUserRecord>>({});

  // Dark Mode
  useEffect(() => {
    const saved = localStorage.getItem("darkMode") !== "false";
    setDarkMode(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    document.documentElement.classList.toggle("dark", newMode);
    toast.success(newMode ? "Dark mode enabled" : "Light mode enabled");
  };

  // Real-time user directory for client names
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const nextUsers: Record<string, AppUserRecord> = {};
      snap.forEach((entry) => {
        nextUsers[entry.id] = {
          id: entry.id,
          ...(entry.data() as Omit<AppUserRecord, "id">),
        };
      });
      setUsersMap(nextUsers);
    });

    return () => unsub();
  }, []);

  // Real-time Cases
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const casesByLawyerId = query(collection(db, "cases"), where("lawyerId", "==", firebaseUser.uid));
    const casesByAssignedLawyerId = query(
      collection(db, "cases"),
      where("assignedLawyerId", "==", firebaseUser.uid)
    );

    const mergeCaseSnapshots = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
      const mergedCases = new Map<string, Case>();

      docs.forEach((entry) => {
        mergedCases.set(entry.id, {
          id: entry.id,
          ...(entry.data() as Omit<Case, "id">),
        });
      });

      setCases(Array.from(mergedCases.values()));
    };

    let lawyerIdDocs: QueryDocumentSnapshot<DocumentData>[] = [];
    let assignedLawyerIdDocs: QueryDocumentSnapshot<DocumentData>[] = [];

    const unsubLawyerId = onSnapshot(casesByLawyerId, (snap) => {
      lawyerIdDocs = snap.docs;
      mergeCaseSnapshots([...lawyerIdDocs, ...assignedLawyerIdDocs]);
    });

    const unsubAssignedLawyerId = onSnapshot(casesByAssignedLawyerId, (snap) => {
      assignedLawyerIdDocs = snap.docs;
      mergeCaseSnapshots([...lawyerIdDocs, ...assignedLawyerIdDocs]);
    });

    return () => {
      unsubLawyerId();
      unsubAssignedLawyerId();
    };
  }, [firebaseUser?.uid]);

  // Real-time Pending Appointments
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const q = query(
      collection(db, "appointments"),
      where("lawyerId", "==", firebaseUser.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: Appointment[] = snap.docs.map((d) => {
        const payload = d.data() as Omit<Appointment, "id">;
        const clientRecord = payload.clientId ? usersMap[payload.clientId] : null;
        return {
          id: d.id,
          ...payload,
          clientName:
            payload.clientName ||
            payload.client ||
            clientRecord?.displayName ||
            clientRecord?.name ||
            clientRecord?.email ||
            "Unknown Client",
        };
      });
      setAppointments(data);
      setAppointmentsPendingCount(data.length);
    });
    return () => unsub();
  }, [firebaseUser?.uid, usersMap]);

  // Real-time Notifications
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", firebaseUser.uid),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setNotifications(data);
    });
    return () => unsub();
  }, [firebaseUser?.uid]);

  // Real-time messages count from conversations/messages
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", firebaseUser.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const conversations: Conversation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Conversation, "id">),
      }));

      if (conversations.length === 0) {
        setMessagesCount(0);
        return;
      }

      try {
        const counts = await Promise.all(
          conversations.map(async (conversation) => {
            const messagesQuery = query(
              collection(db, "messages"),
              where("conversationId", "==", conversation.id)
            );
            const messagesSnap = await getDocs(messagesQuery);
            return messagesSnap.size;
          })
        );

        setMessagesCount(counts.reduce((sum, count) => sum + count, 0));
      } catch (error) {
        console.error("Failed to count messages:", error);
      }
    });

    return () => unsub();
  }, [firebaseUser?.uid]);

  // Real-time Recent Activity from auditLogs
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const q = query(
      collection(db, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(6)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: AuditLog[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setRecentActivity(data);
    }, (err) => {
      console.error("Recent activity listener error:", err);
    });

    return () => unsub();
  }, [firebaseUser?.uid]);

  const handleAccept = async (apptId: string, clientName: string) => {
    try {
      await updateDoc(doc(db, "appointments", apptId), {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });
      await logger.appointmentStatusUpdated(
        currentUser?.displayName || "Lawyer",
        clientName,
        "accepted",
        firebaseUser?.uid || ""
      );
      toast.success(`Appointment with ${clientName} accepted`);
    } catch (err) {
      toast.error("Failed to accept appointment");
    }
  };

  const handleDecline = async (apptId: string, clientName: string) => {
    try {
      await updateDoc(doc(db, "appointments", apptId), {
        status: "denied",
        updatedAt: serverTimestamp(),
      });
      await logger.appointmentStatusUpdated(
        currentUser?.displayName || "Lawyer",
        clientName,
        "denied",
        firebaseUser?.uid || ""
      );
      toast.success(`Appointment with ${clientName} declined`);
    } catch (err) {
      toast.error("Failed to decline appointment");
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const totalCases = cases.length;
  const pendingCases = cases.filter((c) => (c.status || "").toLowerCase().includes("pending")).length;
  const uniqueClients = new Set(cases.map((c) => c.clientName || "")).size;
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const filteredCases = cases.filter(
    (c) =>
      (c.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.clientName || "").toLowerCase().includes(search.toLowerCase())
  );
  const upcomingDeadlines = cases
    .map((c) => ({
      ...c,
      deadlineDate: getDateValue(c.deadline),
    }))
    .filter(
      (c) =>
        c.deadlineDate &&
        c.deadlineDate >= now &&
        c.deadlineDate <= sevenDaysFromNow
    )
    .sort((a, b) => a.deadlineDate!.getTime() - b.deadlineDate!.getTime())
    .slice(0, 7);

  const rootBg = darkMode ? "bg-[#0a2540] text-white" : "bg-[#f8f9fa] text-[#0a2540]";
  const cardBg = darkMode ? "bg-[#132f52]" : "bg-[#f8f9fa]";
  const cardBorder = darkMode ? "border-[#1e3a5f]" : "border-[#e5e7eb]";
  const textMuted = darkMode ? "text-[#94a3c0]" : "text-[#64748b]";

  return (
    <div className={`min-h-screen ${rootBg} font-sans transition-colors duration-300`}>
      {/* HEADER */}
      <header className={`sticky top-0 z-50 ${darkMode ? "bg-[#0a2540]/95" : "bg-white/95"} backdrop-blur-xl border-b ${cardBorder} px-8 py-5`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Firm Logo" className="h-11 w-auto rounded-xl shadow-md" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome back, <span className="text-[#c9a66b]">{currentUser?.displayName || "Lawyer"}</span>
              </h1>
              <p className={`${textMuted} text-sm`}>Law Firm Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-96">
              <input
                type="text"
                placeholder="Search cases and clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full ${darkMode ? "bg-[#132f52] border-[#1e3a5f]" : "bg-white border-[#e5e7eb]"} border rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-[#00b8a9]`}
              />
            </div>

            <button onClick={toggleDarkMode} className="p-3 rounded-2xl hover:bg-[#1e3a5f] transition">
              {darkMode ? <Sun size={24} className="text-[#c9a66b]" /> : <Moon size={24} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 rounded-2xl hover:bg-[#1e3a5f] transition"
              >
                <Bell className="w-6 h-6 text-[#94a3c0]" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {notifications.length}
                  </div>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#132f52] border border-[#1e3a5f] rounded-3xl shadow-2xl py-2 z-50 max-h-[420px] overflow-auto">
                  <div className="px-5 py-3 border-b border-[#1e3a5f] font-medium text-[#c9a66b]">Notifications</div>
                  {notifications.length === 0 ? (
                    <p className="px-5 py-8 text-center text-[#64748b]">No new notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="px-5 py-4 hover:bg-[#1e3a5f]/50 flex gap-3">
                        <div className="w-2 h-2 mt-2 bg-[#00b8a9] rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm">{n.title ? `${n.title}: ${n.message}` : n.message}</p>
                          <p className="text-xs text-[#64748b] mt-1">{formatRelativeTime(n.timestamp || n.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 bg-gradient-to-br from-[#c9a66b] to-[#00b8a9] rounded-full flex items-center justify-center text-[#0a2540] font-semibold text-lg ring-2 ring-[#c9a66b]/30 hover:ring-offset-2 transition"
              >
                {currentUser?.displayName?.[0] || "EM"}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-[#132f52] border border-[#1e3a5f] rounded-3xl shadow-2xl py-2 z-50">
                  <button onClick={() => navigate("/lawyer/profile")} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#1e3a5f]/50 text-left">
                    <User size={18} /> View Profile
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#1e3a5f]/50 text-left text-red-400">
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {[
            { title: "Total Cases", value: totalCases, icon: <Briefcase className="w-8 h-8" /> },
            { title: "Pending Cases", value: pendingCases, icon: <Clock className="w-8 h-8" /> },
            { title: "Total Clients", value: uniqueClients, icon: <Users className="w-8 h-8" /> },
            { title: "Messages", value: messagesCount, icon: <MessageSquare className="w-8 h-8" />, path: "/lawyer/messages" },
            { title: "Pending Appointments", value: appointmentsPendingCount, icon: <CalendarIcon className="w-8 h-8" />, highlight: true },
          ].map((stat, i) => (
            <Card
              key={i}
              onClick={stat.path ? () => navigate(stat.path!) : undefined}
              className={`p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 rounded-3xl border ${cardBorder} ${stat.highlight ? "ring-2 ring-[#c9a66b]" : ""} ${cardBg} ${stat.path ? "cursor-pointer" : ""}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-medium tracking-widest ${textMuted}`}>{stat.title}</p>
                  <p className="text-4xl font-semibold mt-4 tracking-tighter">
                    <AnimatedCounter end={stat.value} />
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/80 text-[#0a2540]">{stat.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Appointments & Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-4xl font-semibold tracking-tight">Manage Appointments</h2>
                <p className={`${textMuted} text-lg mt-1`}>You have {appointmentsPendingCount} pending appointment requests.</p>
              </div>
              <Button onClick={() => navigate("/lawyer/appointments")} className="bg-[#00b8a9] hover:bg-[#00a99a] text-white px-8 py-6 rounded-2xl text-lg font-semibold">
                Open Full Calendar →
              </Button>
            </div>

            <Card className={`${cardBg} border ${cardBorder} rounded-3xl overflow-hidden`}>
              <CardContent className="p-0">
                {appointments.length === 0 ? (
                  <div className="p-12 text-center text-[#64748b]">No pending appointments</div>
                ) : (
                  appointments.map((appt) => {
                    const client = appt.clientName || appt.client || "Unknown Client";
                    return (
                      <div key={appt.id} className={`flex items-center justify-between border-b ${cardBorder} px-8 py-6 last:border-none hover:bg-[#1e3a5f]/30 transition`}>
                        <div className="flex-1">
                          <div className="font-medium text-lg">{client}</div>
                          <div className={textMuted}>{appt.title || appt.caseTitle || "General Matter"}</div>
                        </div>
                        <div className="text-right text-[#c9a66b] font-medium mr-8">
                          {formatAppointmentSlot(appt)}
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => handleDecline(appt.id, client)} className="border-red-400 text-red-400 hover:bg-red-500/10 px-7">
                            Decline
                          </Button>
                          <Button onClick={() => handleAccept(appt.id, client)} className="bg-[#00b8a9] hover:bg-[#00a99a] px-7">
                            Accept
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mini Calendar */}
          <div className="lg:col-span-4">
            <Card className={`${cardBg} border ${cardBorder} rounded-3xl h-full`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-[#c9a66b]">
                  <Calendar className="w-5 h-5" /> Next 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                <div className="space-y-3">
                  {upcomingDeadlines.length === 0 ? (
                    <p className={textMuted}>No upcoming deadlines in the next 7 days.</p>
                  ) : (
                    upcomingDeadlines.map((caseItem) => (
                      <div
                        key={caseItem.id}
                        className={`flex items-center justify-between gap-4 py-3 border-b ${cardBorder} last:border-none`}
                      >
                        <div>
                          <p className="font-medium">{caseItem.title || "Untitled Case"}</p>
                          <p className={`text-xs ${textMuted}`}>{caseItem.clientName || "Unknown Client"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#c9a66b] font-medium">
                            {caseItem.deadlineDate?.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <p className={`text-xs ${textMuted}`}>
                            {caseItem.deadlineDate?.toLocaleDateString("en-GB", { weekday: "short" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <MiniCalendar cases={cases.map((caseItem) => ({
                  ...caseItem,
                  deadline: getDateValue(caseItem.deadline)?.toISOString(),
                }))} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Active Cases + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-semibold">Active Cases</h2>
              <span className={textMuted}>{filteredCases.length} shown</span>
            </div>

            <div className="space-y-6">
              {filteredCases.length === 0 ? (
                <Card className={`${cardBg} p-12 text-center ${textMuted}`}>No matching cases found</Card>
              ) : (
                filteredCases.slice(0, 3).map((c) => (
                  <Card key={c.id} className={`${cardBg} border ${cardBorder} rounded-3xl p-8 hover:border-[#00b8a9]/50 transition`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold">{c.title}</h3>
                        <p className={`${textMuted} mt-1`}>Client: {c.clientName || "Unknown"}</p>
                      </div>
                      <div className={`px-5 py-2 rounded-3xl text-xs font-medium uppercase tracking-widest ${c.status?.toLowerCase() === "in-progress" ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {c.status || "Pending"}
                      </div>
                    </div>

                    <div className="mt-8 text-sm flex justify-between items-center">
                      <div className={textMuted}>
                        Deadline: <span className="text-white">{formatDeadlineLabel(c.deadline)}</span>
                      </div>
                      <Button
                        onClick={() => navigate(`/case/${c.id}`)}
                        className="bg-[#c9a66b] hover:bg-[#b8965a] text-[#0a2540] font-semibold"
                      >
                        View Case Details
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-8">
            <Card className={`${cardBg} border ${cardBorder} rounded-3xl p-8`}>
              <CardTitle className="mb-6">Performance Overview</CardTitle>
              <div className="h-64 bg-[#0a2540]/30 dark:bg-white/10 rounded-2xl flex items-center justify-center border border-dashed border-[#1e3a5f]">
                <p className={textMuted}>📈 Monthly Earnings Chart (coming soon)</p>
              </div>
            </Card>

            <Card className={`${cardBg} border ${cardBorder} rounded-3xl p-8`}>
              <CardTitle className="mb-6">Recent Activity</CardTitle>
              <div className="space-y-5 text-sm">
                {recentActivity.length === 0 ? (
                  <p className={textMuted}>No recent activity yet.</p>
                ) : (
                  recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="w-2 h-2 mt-2 bg-[#00b8a9] rounded-full flex-shrink-0" />
                      <div>
                        <p>{log.action} {log.targetName && `- ${log.targetName}`}</p>
                        <p className="text-xs text-[#64748b] mt-0.5">{formatRelativeTime(log.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-8 right-8 flex gap-3 z-50">
        <Button onClick={() => navigate("/lawyer/case")} className="bg-[#c9a66b] hover:bg-[#b8965a] text-[#0a2540] px-8 py-7 rounded-2xl shadow-2xl flex items-center gap-3 text-lg font-semibold">
          <Plus className="w-6 h-6" /> New Case
        </Button>
        <Button onClick={() => navigate("/lawyer/appointments")} className="bg-[#00b8a9] hover:bg-[#00a99a] px-8 py-7 rounded-2xl shadow-2xl flex items-center gap-3 text-lg font-semibold">
          <Calendar className="w-6 h-6" /> Schedule Appointment
        </Button>
      </div>
    </div>
  );
}

interface Conversation {
  id: string;
  participants?: string[];
}

interface AppUserRecord {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
}
