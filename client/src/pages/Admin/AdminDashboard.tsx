"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { 
  Users, Briefcase, Calendar, MessageSquare, FileText, 
  TrendingUp, Bell, Search, LogOut, User, Plus, X 
} from "lucide-react";

import { db, auth } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { logger } from "@/lib/activityLogger";
import { subscribeToUnifiedActivityFeed, type UnifiedActivityItem } from "@/lib/adminActivityFeed";

// Types
interface DashboardData {
  lawyers: number;
  clients: number;
  activeCases: number;
  totalEarnings: number;
  consultations: number;
  conversations: number;
}

interface RecentCase {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  lawyerName: string;
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  deadline: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "case" | "payment" | "user" | "system" | "audit";
  read: boolean;
  timestamp: Timestamp | Date;
}

type Activity = UnifiedActivityItem;

interface Lawyer {
  id: string;
  name: string;
}

const STATUS_COLORS = {
  Pending: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  "In Progress": "bg-teal-500/10 text-teal-400 border border-teal-500/30",
  Completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  Overdue: "bg-red-500/10 text-red-400 border border-red-500/30",
};

const CASE_TYPES = [
  "Family Law", "Land Dispute", "Criminal Defense", "Corporate Law",
  "Civil Litigation", "Employment Law", "Immigration Law", "Intellectual Property",
  "Real Estate Law", "Personal Injury", "Divorce & Separation", "Contract Dispute",
  "Probate & Estate Planning", "Constitutional Law", "Tax Law", "Commercial Law",
  "Insurance Law", "Banking Law"
];

export default function AdminDashboard() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DashboardData>({
    lawyers: 0,
    clients: 0,
    activeCases: 0,
    totalEarnings: 0,
    consultations: 0,
    conversations: 0,
  });

  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [availableLawyers, setAvailableLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // New Case Form
  const [newCaseForm, setNewCaseForm] = useState({
    title: "",
    caseNumber: "",
    clientName: "",
    lawyerId: "",
    caseType: "",
    deadline: "",
    initialFee: "",
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/unauthorized", { replace: true });
    }
  }, [authLoading, isAdmin, navigate]);

  // Real-time Firestore listeners
  useEffect(() => {
    if (!isAdmin || !currentUser?.uid) return;

    const unsubs: (() => void)[] = [];

    // Users count & Lawyers list
    unsubs.push(
      onSnapshot(collection(db, "users"), (snap) => {
        const lawyers = snap.docs.filter((d) => d.data()?.role === "lawyer").length;
        const clients = snap.docs.filter((d) => d.data()?.role === "client").length;
        setDashboard((prev) => ({ ...prev, lawyers, clients }));
      })
    );

    unsubs.push(
      onSnapshot(query(collection(db, "users"), where("role", "==", "lawyer")), (snap) => {
        const lawyersList = snap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().displayName || doc.data().fullName || doc.data().name || "Unnamed Lawyer",
        }));
        setAvailableLawyers(lawyersList);
      })
    );

    // Cases
    unsubs.push(
      onSnapshot(collection(db, "cases"), (snap) => {
        const active = snap.docs.filter(
          (d) => !d.data().deleted && (d.data().status === "Pending" || d.data().status === "In Progress")
        ).length;

        const recent: RecentCase[] = snap.docs
          .sort((a, b) => {
            const timeA = a.data().createdAt?.toMillis?.() || 0;
            const timeB = b.data().createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          })
          .slice(0, 5)
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              caseNumber: data.caseNumber || `CASE-${new Date().getFullYear()}-${String(100 + Math.floor(Math.random() * 900)).padStart(3, "0")}`,
              title: data.title || "Untitled Case",
              clientName: data.clientName || "Unknown Client",
              lawyerName: data.lawyerName || "Unassigned",
              status: (data.status as any) || "Pending",
              deadline: data.deadline
                ? new Date(data.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "No deadline",
            };
          });

        setDashboard((prev) => ({ ...prev, activeCases: active }));
        setRecentCases(recent);
      })
    );

    // ✅ TOTAL EARNINGS - Fetched from "payments" collection
    unsubs.push(
      onSnapshot(collection(db, "payments"), (snap) => {
        let total = 0;

        snap.docs.forEach((doc) => {
          const data = doc.data();

          // Main logic: Only sum paid payments using amount2 field
          if (data.status === "paid") {
            if (typeof data.amount2 === "number") {
              total += data.amount2;
            } 
            // Fallback fields in case amount2 is missing in some documents
            else if (typeof data.amount === "number") {
              total += data.amount;
            } 
            else if (typeof data.total === "number") {
              total += data.total;
            } 
            else if (typeof data.fee === "number") {
              total += data.fee;
            }
          }
        });

        setDashboard((prev) => ({ ...prev, totalEarnings: Math.round(total) }));
      })
    );

    // Consultations
    unsubs.push(
      onSnapshot(collection(db, "consultations"), (snap) => {
        setDashboard((prev) => ({ ...prev, consultations: snap.size }));
      })
    );

    // Conversations
    unsubs.push(
      onSnapshot(collection(db, "conversations"), (snap) => {
        setDashboard((prev) => ({ ...prev, conversations: snap.size }));
      })
    );

    // Notifications
    const notifQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("timestamp", "desc"),
      limit(15)
    );
    unsubs.push(
      onSnapshot(notifQuery, (snap) => {
        const notifs = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];
        setNotifications(notifs);
      })
    );

    unsubs.push(
      subscribeToUnifiedActivityFeed(
        8,
        (items) => setActivities(items),
        (error) => console.error("Failed to subscribe to unified activity feed:", error)
      )
    );

    setLoading(false);

    return () => unsubs.forEach((unsub) => unsub());
  }, [isAdmin, currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseForm.title || !newCaseForm.caseType || !newCaseForm.lawyerId) {
      toast.error("Please fill required fields: Title, Case Type, and Lawyer");
      return;
    }

    const selectedLawyer = availableLawyers.find((l) => l.id === newCaseForm.lawyerId);

    try {
      const caseNumber = newCaseForm.caseNumber.trim() || `CASE-${Date.now().toString().slice(-6)}`;

      await addDoc(collection(db, "cases"), {
        title: newCaseForm.title.trim(),
        caseNumber,
        clientName: newCaseForm.clientName.trim() || "New Client",
        lawyerId: newCaseForm.lawyerId,
        lawyerName: selectedLawyer?.name || "Unassigned",
        caseType: newCaseForm.caseType,
        deadline: newCaseForm.deadline ? new Date(newCaseForm.deadline) : null,
        initialFee: Number(newCaseForm.initialFee) || 0,
        status: "Pending",
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid,
      });

      await logger.caseCreated(
        "Admin",
        caseNumber,
        newCaseForm.title,
        currentUser!.uid
      );

      toast.success("Case created successfully!");

      setShowNewCaseModal(false);
      setNewCaseForm({
        title: "",
        caseNumber: "",
        clientName: "",
        lawyerId: "",
        caseType: "",
        deadline: "",
        initialFee: "",
      });
    } catch (error: any) {
      console.error("Error creating case:", error);
      toast.error("Failed to create case. Please try again.");
    }
  };

  const formatTimeAgo = (ts: any): string => {
    if (!ts) return "just now";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-teal-400">Loading AdvocateHub Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a1428] text-white overflow-hidden font-sans">
      {/* LEFT SIDEBAR */}
      <div className="w-72 bg-[#0a1428] border-r border-slate-800/80 flex flex-col h-screen">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 via-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              ⚖️
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tighter">AdvocateHub</div>
              <div className="text-xs text-slate-400 -mt-1">LEGAL PRACTICE OS • KENYA</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-8 space-y-1">
          {[
            { label: "Dashboard", icon: <Users size={20} />, active: true, path: "/admin/dashboard" },
            { label: "Manage Users", icon: <Users size={20} />, path: "/admin/manage-users" },
            { label: "Case Management", icon: <Briefcase size={20} />, path: "/admin/assign-cases" },
            { label: "Conversations", icon: <MessageSquare size={20} />, path: "/admin/viewconversations" },
            { label: "Appointments", icon: <Calendar size={20} />, path: "/admin/appointments" },
            { label: "Reports & Analytics", icon: <TrendingUp size={20} />, path: "/admin/reports-and-analytics" },
            { label: "Messages", icon: <User size={20} />, path: "/admin/messages" },
            { label: "Feedback", icon: <FileText size={20} />, path: "/admin/feedback" },
            { label: "AuditLogs", icon: <FileText size={20} />, path: "/admin/audit-logs" },
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all cursor-pointer group select-none ${
                item.active
                  ? "bg-teal-500/10 text-teal-400 border-l-4 border-teal-400 shadow-sm"
                  : "hover:bg-slate-800/70 text-slate-300 hover:text-white"
              }`}
            >
              <div className="text-slate-400 group-hover:text-teal-400 transition-colors">
                {item.icon}
              </div>
              {item.label}
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800 text-xs text-slate-500 text-center">
          AdvocateHub © 2026 • Nairobi, Kenya
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <div className="h-16 bg-[#0a1428] border-b border-slate-800 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
            <div className="px-3 py-1 text-xs bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/20">
              April 8, 2026 • Wednesday
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search cases, clients, lawyers..."
                className="w-full bg-slate-900 border border-slate-700 pl-11 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-teal-400 placeholder:text-slate-500"
              />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <Bell size={22} className="text-slate-300" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center ring-2 ring-[#0a1428]">
                    {unreadCount}
                  </div>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-96 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h4 className="font-semibold">Notifications</h4>
                    <X size={18} className="cursor-pointer" onClick={() => setShowNotifications(false)} />
                  </div>
                  <div className="max-h-96 overflow-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-slate-800 hover:bg-slate-800/70">
                          <div className="font-medium">{notif.title}</div>
                          <div className="text-sm text-slate-400 mt-1">{notif.message}</div>
                          <div className="text-xs text-slate-500 mt-2">{formatTimeAgo(notif.timestamp)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-slate-400">No new notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ADMIN PROFILE */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 hover:bg-slate-800 px-3 py-1.5 rounded-2xl transition-all group"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-xl ring-2 ring-teal-500/30">
                  🇰🇪
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm group-hover:text-white">Admin User</div>
                  <div className="text-xs text-slate-400 -mt-0.5">Super Admin</div>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl py-2 z-50">
                  <div
                    onClick={() => {
                      navigate("/admin/profile");
                      setShowProfileMenu(false);
                    }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800 cursor-pointer"
                  >
                    <User size={20} className="text-slate-400" />
                    <span>View Profile</span>
                  </div>

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-5 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto p-8 space-y-8">
          <div>
            <p className="text-slate-400">Good evening, Admin</p>
            <h2 className="text-4xl font-semibold tracking-tight">Welcome back to Albert Smith Law Firm • Nairobi</h2>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { title: "Lawyers", value: dashboard.lawyers, icon: "👨‍⚖️", color: "text-purple-400" },
              { title: "Clients", value: dashboard.clients, icon: "👥", color: "text-teal-400" },
              { title: "Active Cases", value: dashboard.activeCases, icon: "📋", color: "text-amber-400" },
              {
                title: "Total Earnings",
                value: `KES ${dashboard.totalEarnings.toLocaleString()}`,
                icon: "💰",
                color: "text-emerald-400",
              },
              { title: "Conversations", value: dashboard.conversations, icon: "💬", color: "text-sky-400", path: "/admin/viewconversations" },
            ].map((stat, i) => {
              const statPath = "path" in stat ? (stat as any).path : null;

              return (
                <div
                  key={i}
                  onClick={statPath ? () => navigate(statPath) : undefined}
                  className={`bg-slate-900/80 border border-slate-700/80 rounded-3xl p-7 hover:border-teal-400/40 transition-all group ${statPath ? "cursor-pointer" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-slate-400 tracking-wide">{stat.title}</div>
                      <div className={`text-4xl font-semibold mt-4 tracking-tighter ${stat.color}`}>
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-5xl opacity-75 group-hover:scale-110 transition-transform duration-300">
                      {stat.icon}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Cases */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-700/80 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-semibold">Recent Cases</h3>
                <button
                  onClick={() => setShowNewCaseModal(true)}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 transition-all px-6 py-2.5 rounded-2xl text-sm font-medium"
                >
                  <Plus size={18} /> New Case
                </button>
              </div>

              <div className="space-y-3">
                {recentCases.length > 0 ? (
                  recentCases.map((c) => {
                    const statusClass = STATUS_COLORS[c.status] || STATUS_COLORS.Pending;
                    return (
                      <div
                        key={c.id}
                        className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center justify-between transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-slate-500">{c.caseNumber}</div>
                          <div className="font-semibold mt-1 text-lg leading-tight pr-4">{c.title}</div>
                          <div className="text-sm text-slate-400 mt-2.5 flex items-center gap-2">
                            <span>{c.clientName}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-teal-400">{c.lawyerName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className={`px-5 py-1.5 text-xs font-medium rounded-2xl ${statusClass}`}>
                            {c.status}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Due</div>
                            <div className="text-sm font-medium">{c.deadline}</div>
                          </div>
                          <button className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-2xl transition font-medium">
                            View Case
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400">No cases found. Create your first case above.</div>
                )}
              </div>
            </div>

            {/* Recent Activity + Quick Action */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-8">
                <h3 className="font-semibold text-lg mb-6">Recent Activity</h3>
                <div className="space-y-6 text-sm">
                  {activities.length > 0 ? (
                    activities.map((act) => (
                      <div key={act.id} className="flex gap-4">
                        <div className="w-2 h-2 mt-2 rounded-full bg-teal-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-slate-300 leading-relaxed">{act.message}</div>
                          <div className="text-xs text-slate-500 mt-1.5">{formatTimeAgo(act.timestamp)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 py-8 text-center">No recent activity yet.</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowNewCaseModal(true)}
                className="w-full bg-gradient-to-br from-teal-500 to-cyan-500 p-7 rounded-3xl text-left hover:scale-[1.015] active:scale-[0.985] transition-all duration-200 shadow-lg shadow-teal-500/20 group"
              >
                <div className="text-4xl mb-6 group-hover:rotate-12 transition-transform">📋</div>
                <div className="font-semibold text-xl">New Case</div>
                <div className="text-sm text-white/80 mt-1">Create and assign a new legal matter</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE NEW CASE MODAL */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold">Create New Case</h3>
                <button
                  onClick={() => setShowNewCaseModal(false)}
                  className="text-3xl leading-none text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Case Title *</label>
                  <input
                    type="text"
                    value={newCaseForm.title}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                    placeholder="e.g. Divorce Settlement - Mwangi vs Kamau"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Case Number</label>
                  <input
                    type="text"
                    value={newCaseForm.caseNumber}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, caseNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                    placeholder="CASE-2026-XXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Client Name</label>
                  <input
                    type="text"
                    value={newCaseForm.clientName}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, clientName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                    placeholder="e.g. Jane Mwangi"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Assign Lawyer *</label>
                  <select
                    value={newCaseForm.lawyerId}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, lawyerId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                  >
                    <option value="">Select Lawyer</option>
                    {availableLawyers.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Case Type *</label>
                <select
                  value={newCaseForm.caseType}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, caseType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                >
                  <option value="">Select Case Type</option>
                  {CASE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={newCaseForm.deadline}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, deadline: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Initial Fee (KES)</label>
                  <input
                    type="number"
                    value={newCaseForm.initialFee}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, initialFee: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-400"
                    placeholder="45000"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-700 flex gap-4">
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="flex-1 py-4 border border-slate-700 hover:bg-slate-800 rounded-2xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                className="flex-1 py-4 bg-teal-600 hover:bg-teal-500 rounded-2xl text-sm font-medium transition"
              >
                Create & Save Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
