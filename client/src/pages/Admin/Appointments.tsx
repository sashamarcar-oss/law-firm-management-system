"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { logger } from "@/lib/activityLogger";

type AppointmentStatusValue =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

interface UserRecord {
  id: string;
  displayName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface AppointmentRecord {
  id: string;
  clientId?: string;
  clientName?: string;
  lawyerId?: string;
  lawyerName?: string;
  caseType?: string;
  title?: string;
  type?: string;
  date?: string;
  time?: string;
  notes?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isRescheduled?: boolean;
  previousAppointmentId?: string | null;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

interface AppointmentViewModel extends AppointmentRecord {
  clientDisplayName: string;
  lawyerDisplayName: string;
  subject: string;
  appointmentType: string;
  statusValue: AppointmentStatusValue;
  statusLabel: string;
}

const STATUS_OPTIONS: Array<{ value: AppointmentStatusValue; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const STATUS_STYLES: Record<AppointmentStatusValue, string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  confirmed: "bg-sky-500/10 text-sky-300 border-sky-400/30",
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-rose-500/10 text-rose-300 border-rose-400/30",
  no_show: "bg-slate-500/10 text-slate-300 border-slate-400/30",
};

function getUserDisplayName(user?: UserRecord): string {
  if (!user) return "Unknown User";
  return (
    user.displayName?.trim() ||
    user.fullName?.trim() ||
    user.name?.trim() ||
    user.email?.trim() ||
    "Unknown User"
  );
}

function normalizeStatus(status?: string): AppointmentStatusValue {
  const value = (status || "pending").trim().toLowerCase().replace(/\s+/g, "_");

  if (value === "confirmed" || value === "accepted" || value === "approved") return "confirmed";
  if (value === "completed" || value === "done") return "completed";
  if (value === "cancelled" || value === "canceled" || value === "denied" || value === "rejected") {
    return "cancelled";
  }
  if (value === "no_show") return "no_show";
  return "pending";
}

function getStatusLabel(status: AppointmentStatusValue): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || "Pending";
}

function formatDate(dateValue?: string | Timestamp): string {
  if (!dateValue) return "Date not set";
  const parsed = dateValue instanceof Timestamp ? dateValue.toDate() : new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return typeof dateValue === "string" ? dateValue : "Date not set";

  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCreatedAt(value?: Timestamp | Date | null): string {
  if (!value) return "Recent";
  const date = value instanceof Timestamp ? value.toDate() : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Recent";

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAppointments() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserRecord>>({});
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusValue | "all">("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const nextUsers: Record<string, UserRecord> = {};

      snapshot.docs.forEach((userDoc) => {
        nextUsers[userDoc.id] = {
          id: userDoc.id,
          ...(userDoc.data() as Omit<UserRecord, "id">),
        };
      });

      setUsersMap(nextUsers);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser?.uid || !isAdmin) {
      setLoadingAppointments(false);
      return;
    }

    const appointmentsQuery = query(
      collection(db, "appointments"),
      orderBy("date", "desc"),
      orderBy("time", "asc")
    );

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const nextAppointments: AppointmentRecord[] = snapshot.docs.map((appointmentDoc) => ({
          id: appointmentDoc.id,
          ...(appointmentDoc.data() as Omit<AppointmentRecord, "id">),
        }));

        setAppointments(nextAppointments);
        setLoadingAppointments(false);
      },
      (error) => {
        console.error("Failed to load appointments:", error);
        toast.error("Failed to load appointments from Firebase");
        setLoadingAppointments(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, currentUser, isAdmin]);

  const enrichedAppointments = useMemo<AppointmentViewModel[]>(() => {
    return appointments.map((appointment) => {
      const clientRecord = appointment.clientId ? usersMap[appointment.clientId] : undefined;
      const lawyerRecord = appointment.lawyerId ? usersMap[appointment.lawyerId] : undefined;
      const statusValue = normalizeStatus(appointment.status);

      return {
        ...appointment,
        clientDisplayName: appointment.clientName?.trim() || getUserDisplayName(clientRecord),
        lawyerDisplayName: appointment.lawyerName?.trim() || getUserDisplayName(lawyerRecord),
        subject: appointment.caseType?.trim() || appointment.title?.trim() || "Legal Consultation",
        appointmentType: appointment.type?.trim() || appointment.caseType?.trim() || "Consultation",
        statusValue,
        statusLabel: getStatusLabel(statusValue),
      };
    });
  }, [appointments, usersMap]);

  const filteredAppointments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return enrichedAppointments.filter((appointment) => {
      const matchesSearch =
        !term ||
        appointment.clientDisplayName.toLowerCase().includes(term) ||
        appointment.lawyerDisplayName.toLowerCase().includes(term) ||
        appointment.subject.toLowerCase().includes(term) ||
        appointment.id.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || appointment.statusValue === statusFilter;
      const matchesDate = !dateFilter || appointment.date === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [dateFilter, enrichedAppointments, searchTerm, statusFilter]);

  const stats = useMemo(
    () => [
      {
        label: "Total Appointments",
        value: enrichedAppointments.length,
        helper: "All live records from Firebase",
      },
      {
        label: "Pending Review",
        value: enrichedAppointments.filter((item) => item.statusValue === "pending").length,
        helper: "Awaiting action",
      },
      {
        label: "Confirmed",
        value: enrichedAppointments.filter((item) => item.statusValue === "confirmed").length,
        helper: "Ready to attend",
      },
      {
        label: "Completed",
        value: enrichedAppointments.filter((item) => item.statusValue === "completed").length,
        helper: "Closed successfully",
      },
    ],
    [enrichedAppointments]
  );

  const updateAppointmentStatus = async (
    appointmentId: string,
    newStatus: AppointmentStatusValue
  ) => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      const appointment = enrichedAppointments.find((entry) => entry.id === appointmentId);
      if (appointment) {
        await logger.appointmentStatusUpdated(
          currentUser?.displayName || "Admin",
          appointment.clientDisplayName,
          getStatusLabel(newStatus),
          currentUser?.uid || ""
        );
      }

      toast.success(`Appointment updated to ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Could not update appointment status");
    }
  };

  if (authLoading || loadingAppointments) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 shadow-xl">
          <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" />
          <span>Loading appointments from Firebase...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_42%,#020617_100%)] shadow-2xl shadow-black/30">
          <div className="border-b border-slate-800 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-300/80">
                  Admin Control
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Appointments Management
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Review every appointment in real time, monitor current statuses,
                  and update bookings without leaving the dashboard.
                </p>
              </div>

              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-100">
                <div className="font-medium">Live Firestore feed</div>
                <div className="mt-1 text-cyan-100/75">
                  {filteredAppointments.length} appointments currently visible
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-800 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5"
              >
                <div className="text-sm text-slate-400">{stat.label}</div>
                <div className="mt-3 text-3xl font-semibold text-white">{stat.value}</div>
                <div className="mt-2 text-xs text-slate-500">{stat.helper}</div>
              </div>
            ))}
          </div>

          <div className="border-b border-slate-800 px-6 py-6 sm:px-8">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by client, lawyer, case type, or appointment ID"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as AppointmentStatusValue | "all")
                }
                className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                className="rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {filteredAppointments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-500" />
                <h2 className="mt-4 text-lg font-semibold text-white">
                  No appointments found
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Try adjusting the search terms or filters to view more records.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10 transition hover:border-cyan-400/30"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-200">
                            {appointment.subject}
                          </span>
                          {appointment.isRescheduled ? (
                            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-200">
                              Rescheduled
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                              <UserRound className="h-4 w-4" />
                              Client
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {appointment.clientDisplayName}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                              <UserRound className="h-4 w-4" />
                              Lawyer
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {appointment.lawyerDisplayName}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                              <CalendarDays className="h-4 w-4" />
                              Date
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {formatDate(appointment.date)}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <Clock3 className="h-3.5 w-3.5" />
                              {appointment.time || "Time not set"}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                              <WalletCards className="h-4 w-4" />
                              Payment
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {appointment.paymentStatus || "Not recorded"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {appointment.paymentMethod || "Method not set"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>ID: {appointment.id}</span>
                          <span>Type: {appointment.appointmentType}</span>
                          <span>Created: {formatCreatedAt(appointment.createdAt)}</span>
                        </div>

                        {appointment.notes ? (
                          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                            {appointment.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="xl:w-60">
                        <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                            <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                            Appointment Status
                          </div>

                          <div
                            className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[appointment.statusValue]}`}
                          >
                            {appointment.statusLabel}
                          </div>

                          <select
                            value={appointment.statusValue}
                            onChange={(event) =>
                              updateAppointmentStatus(
                                appointment.id,
                                event.target.value as AppointmentStatusValue
                              )
                            }
                            className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
