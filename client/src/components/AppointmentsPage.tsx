"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";

import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button";

type AppointmentStatus = "scheduled" | "approved" | "pending" | "rejected" | "completed";

interface AppointmentRecord {
  id: string;
  clientId?: string;
  lawyerId?: string;
  clientName?: string;
  lawyerName?: string;
  lawyer?: string;
  clientEmail?: string;
  clientPhone?: string;
  title?: string;
  notes?: string;
  time?: string;
  location?: string;
  meetingDate?: string;
  status?: string;
  date?: Timestamp | string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  approvedBy?: string;
  rejectionReason?: string;
}

interface FormState {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  status: AppointmentStatus;
}

const emptyForm: FormState = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  title: "",
  date: "",
  time: "",
  location: "",
  notes: "",
  status: "pending",
};

function toDateInput(value?: Timestamp | string | null) {
  if (!value) return "";
  if (value instanceof Timestamp) return value.toDate().toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

function formatAppointmentDate(value?: Timestamp | string | null) {
  if (!value) return "Date not set";
  try {
    const date = value instanceof Timestamp ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "Date not set";
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date not set";
  }
}

function statusClasses(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "scheduled":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "rejected":
      return "border-rose-200 bg-rose-100 text-rose-700";
    case "completed":
      return "border-violet-200 bg-violet-100 text-violet-700";
    default:
      return "border-amber-200 bg-amber-100 text-amber-700";
  }
}

export default function AppointmentsPage() {
  const { currentUser, firebaseUser } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isAssignedToCurrentLawyer = (appointment: AppointmentRecord) => {
    if (!firebaseUser?.uid) return false;
    return appointment.lawyerId === firebaseUser.uid;
  };

  const canReviewAppointment = (appointment: AppointmentRecord) => {
    if (!isAssignedToCurrentLawyer(appointment)) return false;
    return (appointment.status || "pending").toLowerCase() === "pending";
  };

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("lawyerId", "==", firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const nextAppointments = snapshot.docs
          .map((appointmentDoc) => ({
            id: appointmentDoc.id,
            ...(appointmentDoc.data() as Omit<AppointmentRecord, "id">),
          }))
          .sort((a, b) => {
            const aTime =
              a.date instanceof Timestamp
                ? a.date.toMillis()
                : a.createdAt instanceof Timestamp
                  ? a.createdAt.toMillis()
                  : 0;
            const bTime =
              b.date instanceof Timestamp
                ? b.date.toMillis()
                : b.createdAt instanceof Timestamp
                  ? b.createdAt.toMillis()
                  : 0;
            return bTime - aTime;
          });

        setAppointments(nextAppointments);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load lawyer appointments:", error);
        toast.error("Could not load appointments.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  const summary = useMemo(() => {
    return appointments.reduce(
      (acc, appointment) => {
        const status = (appointment.status || "pending").toLowerCase();
        acc.total += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "scheduled") acc.scheduled += 1;
        if (status === "pending") acc.pending += 1;
        if (status === "rejected") acc.rejected += 1;
        return acc;
      },
      { total: 0, approved: 0, scheduled: 0, pending: 0, rejected: 0 }
    );
  }, [appointments]);

  if (!currentUser || currentUser.role !== "lawyer") {
    return <Navigate to="/lawyer/dashboard" replace />;
  }

  const resetModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEditModal = (appointment: AppointmentRecord) => {
    if (!isAssignedToCurrentLawyer(appointment)) {
      toast.error("You can only edit bookings assigned to you.");
      return;
    }

    setEditingId(appointment.id);
    setForm({
      clientName: appointment.clientName || "",
      clientEmail: appointment.clientEmail || "",
      clientPhone: appointment.clientPhone || "",
      title: appointment.title || "",
      date: toDateInput(appointment.date),
      time: appointment.time || "",
      location: appointment.location || "",
      notes: appointment.notes || "",
      status: ((appointment.status as AppointmentStatus) || "pending"),
    });
    setShowModal(true);
  };

  const saveAppointment = async () => {
    if (!editingId) return;
    if (!form.title.trim() || !form.date || !form.time.trim()) {
      toast.error("Title, date, and time are required.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "appointments", editingId), {
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientPhone: form.clientPhone.trim(),
        title: form.title.trim(),
        date: Timestamp.fromDate(new Date(`${form.date}T00:00:00`)),
        time: form.time.trim(),
        location: form.location.trim(),
        notes: form.notes.trim(),
        status: form.status,
        updatedAt: serverTimestamp(),
      });

      toast.success("Appointment updated.");
      resetModal();
    } catch (error) {
      console.error("Failed to save appointment:", error);
      toast.error("Could not save appointment.");
    } finally {
      setSaving(false);
    }
  };

  const approveAppointment = async (appointment: AppointmentRecord) => {
    if (!firebaseUser?.uid || !currentUser) {
      toast.error("Please sign in again.");
      return;
    }

    if (!isAssignedToCurrentLawyer(appointment)) {
      toast.error("You can only approve bookings assigned to you.");
      return;
    }

    try {
      await updateDoc(doc(db, "appointments", appointment.id), {
        status: "approved",
        approvedBy:
          currentUser.displayName ||
          firebaseUser.displayName ||
          currentUser.email ||
          "Lawyer",
        updatedAt: serverTimestamp(),
      });
      toast.success("Appointment approved.");
    } catch (error) {
      console.error("Failed to approve appointment:", error);
      toast.error("Could not approve appointment.");
    }
  };

  const rejectAppointment = async (appointment: AppointmentRecord) => {
    if (!firebaseUser?.uid || !currentUser) {
      toast.error("Please sign in again.");
      return;
    }

    if (!isAssignedToCurrentLawyer(appointment)) {
      toast.error("You can only reject bookings assigned to you.");
      return;
    }

    const reason = prompt("Enter rejection reason");
    if (!reason?.trim()) return;

    try {
      await updateDoc(doc(db, "appointments", appointment.id), {
        status: "rejected",
        rejectionReason: reason.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Appointment rejected.");
    } catch (error) {
      console.error("Failed to reject appointment:", error);
      toast.error("Could not reject appointment.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef6f1_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-emerald-200/60 bg-slate-950 px-8 py-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_26%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-200">
                <Sparkles className="h-4 w-4" />
                Lawyer Appointment Desk
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Manage your assigned consultations with clarity.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Review incoming requests, refine the details, and approve bookings without leaving your lawyer workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total", value: summary.total, tone: "text-white" },
                { label: "Pending", value: summary.pending, tone: "text-amber-300" },
                { label: "Approved", value: summary.approved, tone: "text-emerald-300" },
                { label: "Rejected", value: summary.rejected, tone: "text-rose-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  <p className={`mt-2 text-3xl font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "Scheduled", value: summary.scheduled, color: "from-sky-500/15 to-sky-100", text: "text-sky-700" },
            { label: "Approved", value: summary.approved, color: "from-emerald-500/15 to-emerald-100", text: "text-emerald-700" },
            { label: "Pending", value: summary.pending, color: "from-amber-500/15 to-amber-100", text: "text-amber-700" },
            { label: "Rejected", value: summary.rejected, color: "from-rose-500/15 to-rose-100", text: "text-rose-700" },
            { label: "You", value: currentUser.displayName || currentUser.email || "Lawyer", color: "from-slate-500/10 to-slate-100", text: "text-slate-700" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-[28px] border border-white/70 bg-gradient-to-br ${item.color} p-5 shadow-sm`}
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-3 ${item.label === "You" ? "text-lg" : "text-3xl"} font-semibold ${item.text}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Your appointment records</h2>
              <p className="mt-1 text-sm text-slate-500">Only consultations assigned to your account are shown here.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              Live Firestore updates
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-20 text-center text-slate-500">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="px-6 py-20 text-center text-slate-500">No appointments assigned to you yet.</div>
          ) : (
            <div className="grid gap-5 p-6 lg:grid-cols-2">
              {appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="group rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {(() => {
                    const isAssigned = isAssignedToCurrentLawyer(appointment);
                    const canReview = canReviewAppointment(appointment);

                    return (
                      <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClasses(appointment.status)}`}>
                          {appointment.status || "pending"}
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                        {appointment.title || "Untitled appointment"}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {appointment.approvedBy ? `Approved by ${appointment.approvedBy}` : "Awaiting lawyer decision"}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <CalendarCheck2 className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">Client</p>
                      <p className="flex items-center gap-2 font-medium text-slate-800">
                        <UserRound className="h-4 w-4 text-slate-500" />
                        {appointment.clientName || appointment.clientId || "Unknown client"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">Schedule</p>
                      <p className="flex items-center gap-2 font-medium text-slate-800">
                        <Clock3 className="h-4 w-4 text-slate-500" />
                        {formatAppointmentDate(appointment.date)} at {appointment.time || "Time not set"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {appointment.clientEmail || "No client email provided"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {appointment.clientPhone || "No client phone provided"}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {appointment.location || "Location not set"}
                    </p>
                  </div>

                  {appointment.notes ? (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-600">
                      {appointment.notes}
                    </div>
                  ) : null}

                  {appointment.rejectionReason ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      Rejection reason: {appointment.rejectionReason}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      onClick={() => openEditModal(appointment)}
                      disabled={!isAssigned}
                      className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => approveAppointment(appointment)}
                      disabled={!canReview}
                      className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => rejectAppointment(appointment)}
                      disabled={!canReview}
                      className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_25%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-600">Refine Booking</p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900">Edit Appointment</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Update the consultation details before you approve the request.
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CalendarCheck2 className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Client Name</span>
                <input
                  value={form.clientName}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Client Email</span>
                <input
                  value={form.clientEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientEmail: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Client Phone</span>
                <input
                  value={form.clientPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientPhone: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Location</span>
                <input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Time</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                >
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
              <Button onClick={resetModal} className="rounded-2xl bg-slate-200 text-slate-900 hover:bg-slate-300">
                Cancel
              </Button>
              <Button
                onClick={saveAppointment}
                disabled={saving}
                className="rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}