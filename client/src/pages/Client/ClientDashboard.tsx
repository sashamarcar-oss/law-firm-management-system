"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/Layout/NotificationBell";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

type Case = {
  id: string;
  title: string;
  progress: number;
  status: string;
};

type Appointment = {
  id?: string;
  date: Timestamp | null;
  time: string;
  title?: string;
  lawyer?: string;
  status?: string;
};

const ClientDashboard = () => {
  const { currentUser, loading, logout } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const appointmentsRef = useRef<HTMLDivElement>(null);
  const casesRef = useRef<HTMLDivElement>(null);

  const [cases, setCases] = useState<Case[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [themeColor, setThemeColor] = useState<"blue" | "green" | "yellow" | "purple">("blue");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Client";

  const formatAppointmentDate = (value: Timestamp | null) => {
    if (!value) return "No date";
    return value.toDate().toLocaleDateString("en-KE", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Accent Color Helpers
  const getThemeDotClass = (color: typeof themeColor): string => {
    const map: Record<typeof themeColor, string> = {
      blue: "bg-blue-500", green: "bg-green-500", yellow: "bg-yellow-500", purple: "bg-purple-500",
    };
    return map[color];
  };

  const getAccentBg = (color: typeof themeColor): string => {
    const map: Record<typeof themeColor, string> = {
      blue: "bg-blue-600", green: "bg-green-600", yellow: "bg-yellow-600", purple: "bg-purple-600",
    };
    return map[color];
  };

  const getButtonClass = (color: typeof themeColor): string => {
    const map: Record<typeof themeColor, string> = {
      blue: "bg-blue-600 hover:bg-blue-700",
      green: "bg-green-600 hover:bg-green-700",
      yellow: "bg-yellow-500 hover:bg-yellow-600 text-gray-900",
      purple: "bg-purple-600 hover:bg-purple-700",
    };
    return map[color];
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case "Pending": return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "In Progress": return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "Completed": return "bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  // Firestore real-time sync
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubCases = onSnapshot(
      query(collection(db, "cases"), where("clientId", "==", currentUser.uid)),
      (snap) =>
        setCases(
          snap.docs.map((caseDoc) => ({
            id: caseDoc.id,
            ...(caseDoc.data() as Omit<Case, "id">),
          }))
        ),
      (error) => {
        console.error("Failed to load client cases:", error);
        toast.error("Could not load your cases.");
      }
    );

    const unsubAppointments = onSnapshot(
      query(collection(db, "appointments"), where("clientId", "==", currentUser.uid)),
      (snap) => {
        setAppointments(
          snap.docs.map((appointmentDoc) => {
            const data = appointmentDoc.data() as Partial<Appointment> & {
              lawyer?: string;
              status?: string;
            };

            return {
              id: appointmentDoc.id,
              date: data.date instanceof Timestamp ? data.date : null,
              time: data.time || "",
              title: data.title || undefined,
              lawyer: data.lawyer || undefined,
              status: data.status || "scheduled",
            };
          })
        );
      },
      (error) => {
        console.error("Failed to load client appointments:", error);
        toast.error("Could not load your appointments.");
      }
    );

    return () => { unsubCases(); unsubAppointments(); };
  }, [currentUser?.uid]);

  // Improved GSAP Animations - Re-runs when data changes
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial fade-in for static elements
      gsap.from(".fade-in", { 
        y: 30, 
        opacity: 0, 
        stagger: 0.12, 
        duration: 0.6, 
        ease: "power3.out" 
      });

      // Stat cards
      gsap.fromTo(".stat-card", 
        { scale: 0.92, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "back.out(1.4)" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Animate dynamic lists when cases or appointments update
  useEffect(() => {
    if (appointmentsRef.current) {
      gsap.fromTo(appointmentsRef.current.children,
        { opacity: 0, y: 25, scale: 0.96 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          stagger: 0.07, 
          duration: 0.5, 
          ease: "power2.out",
          overwrite: true 
        }
      );
    }

    if (casesRef.current) {
      gsap.fromTo(casesRef.current.children,
        { opacity: 0, x: -20 },
        { 
          opacity: 1, 
          x: 0, 
          stagger: 0.06, 
          duration: 0.5, 
          ease: "power2.out",
          overwrite: true 
        }
      );
    }
  }, [appointments.length, cases.length]);

  // Profile menu animation
  useEffect(() => {
    if (open) {
      gsap.fromTo(".profile-menu", 
        { y: -10, opacity: 0, scale: 0.95 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
  };

  const sortedAppointments = [...appointments].sort((a, b) => 
    (a.date?.toMillis() ?? Infinity) - (b.date?.toMillis() ?? Infinity)
  );

  const nextAppointment = sortedAppointments[0];

  // Navigation
  const goToProfile = () => navigate("/client/profile");
  const goToBookAppointment = () => navigate("/client/book-appointment");
  const goToMessages = () => navigate("/client/messages?new=1");
  const goToCaseDetail = (caseId: string) => navigate(`/client/cases/${caseId}`);

  const goToAppointmentDetail = (apptId?: string) => {
    if (apptId) navigate(`/client/appointments/${apptId}`);
    else goToBookAppointment();
  };

  const handleProfileClick = () => {
    setOpen(false);
    setTimeout(() => goToProfile(), 80);
  };

  const handleLogoutClick = () => {
    setOpen(false);
    handleLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-red-500">Please log in to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 pb-10">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-white">Dashboard</h1>

        <div className="flex items-center gap-4">
          {/* Accent Color Switcher */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
            {(["blue", "green", "yellow", "purple"] as const).map((color) => (
              <button
                key={color}
                onClick={() => setThemeColor(color)}
                className={`w-8 h-8 rounded-2xl transition-all duration-300 shadow-inner ${getThemeDotClass(color)} ${
                  themeColor === color ? "ring-2 ring-offset-2 ring-white dark:ring-gray-900 scale-110" : "hover:scale-110"
                }`}
              />
            ))}
          </div>

          {/* Dark Mode Button */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-3 rounded-3xl shadow-lg transition-all border border-gray-200 dark:border-gray-700 font-medium"
          >
            <span className="text-2xl">{isDarkMode ? "☀️" : "🌙"}</span>
            <span className="text-sm font-medium">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <NotificationBell />
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-3xl shadow-lg hover:shadow-xl transition-all"
            >
              <div className={`w-9 h-9 rounded-2xl ${getAccentBg(themeColor)} text-white flex items-center justify-center font-bold text-lg shadow-inner`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col items-start text-sm">
                <span className="font-medium text-gray-800 dark:text-white">
                  {displayName}
                </span>
              </div>
            </button>

            {open && (
              <div className="profile-menu absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-2 border border-gray-100 dark:border-gray-700 z-50">
                <button onClick={handleProfileClick} className="w-full text-left px-5 py-3.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl flex items-center gap-3">
                  👤 My Profile
                </button>
                <button onClick={handleLogoutClick} className="w-full text-left px-5 py-3.5 text-sm font-medium text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl flex items-center gap-3">
                  ⭍ Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome */}
      <div className="fade-in mb-8">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">
          Welcome back, {displayName} 👋
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg mt-1">Here’s your activity overview</p>
      </div>

      {/* Quick Action Buttons */}
      <div className="fade-in grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <button onClick={goToProfile} className={`p-6 rounded-3xl font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl hover:shadow-2xl ${getButtonClass(themeColor)}`}>
          👤 My Profile
        </button>
        <button onClick={goToBookAppointment} className={`p-6 rounded-3xl font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl hover:shadow-2xl ${getButtonClass(themeColor)}`}>
          📅 Book Appointment
        </button>
        <button onClick={goToMessages} className="p-6 rounded-3xl font-semibold text-lg flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 transition-all active:scale-95 shadow-xl hover:shadow-2xl">
          ✉️ Start Chat
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="stat-card fade-in bg-gradient-to-r from-blue-500 to-blue-700 text-white p-6 rounded-3xl shadow-2xl hover:-translate-y-1 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-75">Total Cases</p>
              <h2 className="text-4xl font-bold mt-2">{cases.length}</h2>
            </div>
            <span className="text-5xl opacity-20">📂</span>
          </div>
        </div>

        <div className="stat-card fade-in bg-gradient-to-r from-green-500 to-green-700 text-white p-6 rounded-3xl shadow-2xl hover:-translate-y-1 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-75">Next Appointment</p>
              <h2 className="text-2xl font-semibold mt-2">
                {nextAppointment ? `${formatAppointmentDate(nextAppointment.date)} • ${nextAppointment.time}` : "No upcoming appointments"}
              </h2>
            </div>
            <span className="text-5xl opacity-20">🗓️</span>
          </div>
        </div>

        <div className="stat-card fade-in bg-gradient-to-r from-purple-500 to-purple-700 text-white p-6 rounded-3xl shadow-2xl hover:-translate-y-1 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-75">Active Cases</p>
              <h2 className="text-4xl font-bold mt-2">
                {cases.filter((c) => c.status !== "Completed").length}
              </h2>
            </div>
            <span className="text-5xl opacity-20">⚖️</span>
          </div>
        </div>
      </div>

      {/* Case Status Overview */}
      <div className="fade-in mb-10 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Case Status Overview</h2>
        <div className="flex flex-wrap gap-3">
          {["Pending", "In Progress", "Completed"].map((status) => {
            const count = cases.filter((c) => c.status === status).length;
            return (
              <div key={status} className={`px-6 py-4 rounded-3xl flex items-center gap-3 text-sm font-medium ${getStatusClass(status)}`}>
                <span>{status}</span>
                <span className="bg-white/70 dark:bg-black/30 px-3 py-1 rounded-2xl text-xs font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Appointments */}
      <div className="fade-in mb-10 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">📅 Scheduled Appointments</h2>
          <button
            onClick={goToBookAppointment}
            className={`px-6 py-3 text-sm font-semibold rounded-2xl transition-all ${getButtonClass(themeColor)}`}
          >
            + Book New
          </button>
        </div>

        {sortedAppointments.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-3xl">
            <p className="text-2xl text-gray-400 mb-4">No appointments scheduled yet</p>
            <button
              onClick={goToBookAppointment}
              className={`px-10 py-4 rounded-3xl font-semibold text-lg ${getButtonClass(themeColor)}`}
            >
              Schedule Your First Appointment →
            </button>
          </div>
        ) : (
          <div ref={appointmentsRef} className="grid md:grid-cols-2 gap-6">
            {sortedAppointments.slice(0, 4).map((appt) => (
              <div
                key={appt.id}   // Stable key using Firestore ID
                onClick={() => goToAppointmentDetail(appt.id)}
                className="group p-7 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatAppointmentDate(appt.date)}</div>
                    <div className="text-2xl font-medium text-gray-600 dark:text-gray-400 mt-1">{appt.time}</div>
                  </div>
                  <div className="text-5xl opacity-20">🗓️</div>
                </div>

                {appt.title && <p className="font-semibold text-lg text-gray-800 dark:text-white mb-2">{appt.title}</p>}
                {appt.lawyer && <p className="text-gray-500 dark:text-gray-400">With Advocate {appt.lawyer}</p>}

                <div className="mt-6 inline-flex items-center px-5 py-2 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {appt.status || "scheduled"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Cases List */}
      <div className="fade-in bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">My Cases</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{cases.length} total</span>
        </div>

        {cases.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No cases yet</div>
        ) : (
          <div ref={casesRef} className="space-y-5">
            {cases.map((c) => (
              <div
                key={c.id}
                onClick={() => goToCaseDetail(c.id)}
                className="group p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl bg-white dark:bg-gray-800 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-medium text-gray-800 dark:text-white">{c.title}</p>
                  <span className={`text-xs px-5 py-2 rounded-3xl font-semibold ${getStatusClass(c.status)}`}>
                    {c.status}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-3 ${getAccentBg(themeColor)} rounded-full transition-all`}
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {c.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
