"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
  Menu,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

import { db, auth } from "@/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
  QuerySnapshot,type 
  DocumentData,
  getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
type WithId<T> = T & { id: string };

interface Case {
  id: string;
  title: string;
  status: string;
  // ... other fields as needed
}

interface AppointmentBase {
  clientId?: string;
  clientName?: string;
  date?: string;
  meetingDate?: string;
  lawyerId?: string;
  status: string;
  approvedBy?: string;
  approvedByName?: string;
}

interface Appointment extends WithId<AppointmentBase> {
  clientEmail?: string;
}

interface ClientBase {
  name: string;
  phone: string;
  email: string;
  role?: string;
}

interface Client extends WithId<ClientBase> {}

interface PaymentBase {
  case: string;
  amount: string;
  paidAt?: any;
  paymentMethod?: string;
  paystackReference?: string;
  status?: string;
}

interface Payment extends WithId<PaymentBase> {}

// ────────────────────────────────────────────────
export default function LawyerSidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, firebaseUser } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usersCount, setUsersCount] = useState(0);

  const [counts, setCounts] = useState({
    cases: 0,
    appointments: 0,
    clients: 0,
    payments: 0,
  });
console.log("All cases:", cases); 
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);
  const [pendingAppointmentsOpen, setPendingAppointmentsOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  // ────────────────────────────────────────────────
  // REAL-TIME LISTENERS
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const uid = firebaseUser.uid;

    console.log("[Sidebar] Lawyer UID for filtering:", uid);

    const mapWithId = <T extends DocumentData>(snap: QuerySnapshot) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<T>));

    // Cases (just for count)
    const unsubCases = onSnapshot(collection(db, "cases"), (snap) => {
      setCases(mapWithId<Case>(snap));
      setCounts((prev) => ({ ...prev, cases: snap.size }));
    });

    // Scheduled appointments
    const scheduledQ = query(
      collection(db, "appointments"),
      where("lawyerId", "==", uid),
      where("status", "==", "scheduled")
    );

    const unsubScheduled = onSnapshot(scheduledQ, async (snap) => {
      console.log(`[Scheduled] Found ${snap.size} appointments for lawyer ${uid}`);
      const enriched = await enrichAppointments(mapWithId<AppointmentBase>(snap));
      setScheduledAppointments(enriched);
      setCounts((prev) => ({ ...prev, appointments: enriched.length }));
    }, (err) => {
      console.error("[Scheduled Listener Error]:", err);
    });

    // Pending appointments
    const pendingQ = query(
      collection(db, "appointments"),
      where("lawyerId", "==", uid),
      where("status", "in", ["pending", "requested", "submitted"])
    );

    const unsubPending = onSnapshot(pendingQ, async (snap) => {
      console.log(`[Pending] Found ${snap.size} appointments for lawyer ${uid}`);
      const enriched = await enrichAppointments(mapWithId<AppointmentBase>(snap));
      setPendingAppointments(enriched);
    }, (err) => {
      console.error("[Pending Listener Error]:", err);
    });

    // Clients
    const clientsQ = query(collection(db, "users"), where("role", "==", "client"));
    const unsubClients = onSnapshot(clientsQ, (snap) => {
      setClients(mapWithId<ClientBase>(snap));
      setCounts((prev) => ({ ...prev, clients: snap.size }));
    });

    // Payments
    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(mapWithId<PaymentBase>(snap));
      setCounts((prev) => ({ ...prev, payments: snap.size }));
    });

    // Users count
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsersCount(snap.size);
    });

    return () => {
      unsubCases();
      unsubScheduled();
      unsubPending();
      unsubClients();
      unsubPayments();
      unsubUsers();
    };
  }, [firebaseUser?.uid]);

  // ────────────────────────────────────────────────
  // Client enrichment helper (FIXED typing here)
  // ────────────────────────────────────────────────
  const enrichAppointments = async (
    appointments: WithId<AppointmentBase>[]
  ): Promise<Appointment[]> => {
    return Promise.all(
      appointments.map(async (appt) => {
        if (!appt.clientId) {
          return appt as Appointment;
        }

        try {
          const userSnap = await getDoc(doc(db, "users", appt.clientId));
          if (userSnap.exists()) {
            const data = userSnap.data() as ClientBase;
            return {
              ...appt,
              clientName: data.name || appt.clientName || "Client",
              clientEmail: data.email || undefined,
            } as Appointment;
          } else {
            console.warn(`Client not found: ${appt.clientId} (appointment ${appt.id})`);
          }
        } catch (err) {
          console.warn(
            `Failed to fetch client ${appt.clientId} for appointment ${appt.id}:`,
            err
          );
        }

        return appt as Appointment;
      })
    );
  };

  // ────────────────────────────────────────────────
  // APPROVE APPOINTMENT
  // ────────────────────────────────────────────────
  const approveAppointment = async (appt: Appointment) => {
    if (!firebaseUser) {
      alert("You must be logged in to approve appointments.");
      return;
    }

    if (appt.status === "scheduled" || appt.status === "approved") {
      alert("This appointment has already been processed.");
      return;
    }

    const dateStr = window.prompt(
      "Enter appointment date & time\nExample: 2026-03-25 14:30",
      appt.meetingDate || appt.date || ""
    );

    if (!dateStr || dateStr.trim() === "") return;

    if (!/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(dateStr.trim())) {
      alert("Please use format: YYYY-MM-DD HH:MM (24-hour)");
      return;
    }

    try {
      await updateDoc(doc(db, "appointments", appt.id), {
        status: "scheduled",
        approvedBy: firebaseUser.uid,
        approvedByName: currentUser?.displayName || "Lawyer",
        approvedAt: new Date(),
        meetingDate: dateStr.trim(),
        lawyerId: firebaseUser.uid,
      });

      console.log(`Successfully approved appointment ${appt.id}`);
    } catch (err: any) {
      console.error("Failed to approve appointment:", err);
      alert(
        err.code === "permission-denied"
          ? "Permission denied – check Firestore rules"
          : "Failed to approve appointment. Please try again."
      );
    }
  };

  const approvePayment = async (payment: Payment) => {
    if (!firebaseUser || payment.status === "approved") return;

    try {
      await updateDoc(doc(db, "payments", payment.id), {
        status: "approved",
        approvedBy: firebaseUser.uid,
        approvedByName: currentUser?.displayName || "Lawyer",
        approvedAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to approve payment:", err);
      alert("Failed to approve payment");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ────────────────────────────────────────────────
  // MENU ITEMS
  // ────────────────────────────────────────────────
  const menu = useMemo(
    () => [
      { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { name: "Cases", icon: Briefcase, path: "/cases", count: counts.cases },
      {
        name: "Appointments",
        icon: CalendarIcon,
        path: "#",
        hasSubMenu: true,
        count: counts.appointments,
      },
      { name: "Pending Appointments", icon: CalendarIcon, path: "#", hasSubMenu: true },
      { name: "Clients", icon: Users, path: "#", hasSubMenu: true, count: counts.clients },
      { name: "Payments", icon: CreditCard, path: "#", hasSubMenu: true, count: counts.payments },
      { name: "Users", icon: Users, path: "/users", count: usersCount },
    ],
    [counts, usersCount]
  );

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────
  return (
    <aside
      className={`h-screen bg-white border-r flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        {!collapsed && <h1 className="text-orange-600 font-bold text-xl">LawFirm</h1>}
        <button onClick={() => setCollapsed(!collapsed)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Menu */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          if (item.hasSubMenu) {
            const isOpen =
              item.name === "Appointments" ? appointmentsOpen :
              item.name === "Pending Appointments" ? pendingAppointmentsOpen :
              item.name === "Clients" ? clientsOpen :
              paymentsOpen;

            const setIsOpen =
              item.name === "Appointments" ? setAppointmentsOpen :
              item.name === "Pending Appointments" ? setPendingAppointmentsOpen :
              item.name === "Clients" ? setClientsOpen :
              setPaymentsOpen;

            let submenu: JSX.Element | null = null;

            if (item.name === "Appointments") {
              submenu = (
                <div className="pl-6 space-y-2 max-h-64 overflow-auto">
                  {scheduledAppointments.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No scheduled appointments</p>
                  ) : (
                    scheduledAppointments.map((a) => (
                      <div key={a.id} className="flex flex-col gap-1 py-1 border-b last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{a.clientName || "Client"}</p>
                            {a.clientEmail && <p className="text-xs text-gray-500">{a.clientEmail}</p>}
                            <p className="text-xs text-gray-500">
                              {a.meetingDate || a.date || "No date set"}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            Scheduled
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            } else if (item.name === "Pending Appointments") {
              submenu = (
                <div className="pl-6 space-y-2 max-h-64 overflow-auto">
                  {pendingAppointments.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No pending appointments</p>
                  ) : (
                    pendingAppointments.map((a) => (
                      <div key={a.id} className="flex flex-col gap-1 py-1 border-b last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{a.clientName || "Client"}</p>
                            {a.clientEmail && <p className="text-xs text-gray-500">{a.clientEmail}</p>}
                            <p className="text-xs text-gray-500">
                              {a.meetingDate || a.date || "No date set"}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => approveAppointment(a)}>
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            } else if (item.name === "Clients") {
              submenu = (
                <div className="pl-6 space-y-3 max-h-64 overflow-auto">
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No clients yet</p>
                  ) : (
                    clients.map((c) => (
                      <div key={c.id} className="text-sm">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-gray-600">{c.phone}</p>
                        <p className="text-gray-400 text-xs">{c.email}</p>
                      </div>
                    ))
                  )}
                </div>
              );
            } else if (item.name === "Payments") {
              submenu = (
                <div className="pl-6 space-y-2 max-h-64 overflow-auto">
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No payments</p>
                  ) : (
                    payments.map((p) => (
                      <div key={p.id} className="py-2 border-b last:border-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.case}</p>
                            <p className="text-sm">KES {p.amount}</p>
                            <p className="text-xs text-gray-500">
                              {p.paymentMethod || "?"} • Ref: {p.paystackReference || "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                                p.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {p.status === "approved" ? "Approved" : "Pending"}
                            </span>
                            {p.status !== "approved" && (
                              <Button size="sm" onClick={() => approvePayment(p)}>
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            }

            return (
              <div key={item.name}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full flex justify-between items-center px-3 py-2 hover:bg-gray-100 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    {!collapsed && item.name}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {isOpen && !collapsed && submenu}
              </div>
            );
          }

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md ${
                isActive ? "bg-orange-50 text-orange-700 font-medium" : "hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} />
                {!collapsed && item.name}
              </div>
              {!collapsed && item.count ? (
                <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={firebaseUser?.photoURL ?? undefined} alt="User" />
            <AvatarFallback>
              {currentUser?.displayName?.charAt(0) ?? "L"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div>
              <p className="font-medium text-sm">
                {currentUser?.displayName || "Lawyer"}
              </p>
              <p className="text-xs text-gray-500">Lawyer</p>
            </div>
          )}
        </div>

        <Button
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </aside>
  );
}