// src/pages/client/ClientProfile.tsx
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut, updateProfile } from "firebase/auth";
import { jsPDF } from "jspdf";

import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input 2";
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus, Star, Clock, FileText, CheckCircle2, Download, LogOut, Palette, Scale, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface Appointment {
  id: string;
  title: string;
  date: Timestamp;
  time: string;
  status: string;
  notes: string;
  amount?: number | string;
  currency?: string;
  paymentStatus?: string;
  paymentReference?: string;
  paymentDescription?: string;
  lawyerName?: string;
  location?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export default function ClientProfile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [theme, setTheme] = useState<"gold" | "navy">("gold");
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch appointments
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "appointments"),
      where("clientId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Appointment, "id">),
      }));

      data.sort((a, b) => (a.date?.toMillis() ?? Infinity) - (b.date?.toMillis() ?? Infinity));
      setAppointments(data);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    setProfileName(currentUser?.displayName?.trim() || "");
    setProfilePhone(currentUser?.phone?.trim() || currentUser?.phoneNumber?.trim() || "");
  }, [currentUser?.displayName, currentUser?.phone, currentUser?.phoneNumber]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "gold" ? "navy" : "gold"));
  };

  const handleSubmitFeedback = async () => {
    if (!currentUser || rating === 0 || !comment.trim()) {
      toast.error(rating === 0 ? "Please select stars" : "Please write feedback");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        clientId: currentUser.uid,
        clientName: currentUser.displayName?.trim() || currentUser.email?.split("@")[0] || "Client",
        clientEmail: currentUser.email || "N/A",
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        read: false,
      });
      toast.success("Thank you for your valuable feedback.");
      setRating(0);
      setComment("");
    } catch (err) {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Logout failed");
    }
  };

  const saveProfileChanges = async () => {
    if (!currentUser?.uid || !auth.currentUser) {
      toast.error("Please sign in again.");
      return;
    }

    const trimmedName = profileName.trim();
    const trimmedPhone = profilePhone.trim();

    if (!trimmedName) {
      toast.error("Full name cannot be blank.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
      });

      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: trimmedName,
        name: trimmedName,
        phone: trimmedPhone,
        phoneNumber: trimmedPhone,
        updatedAt: serverTimestamp(),
      });

      toast.success("Profile updated successfully.");
      setEditingProfile(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const startEditingAppointment = (appointment: Appointment) => {
    setEditingAppointmentId(appointment.id);
    setEditingTitle(appointment.title || "");
    setEditingTime(appointment.time || "");
    setEditingNotes(appointment.notes || "");
  };

  const cancelEditingAppointment = () => {
    setEditingAppointmentId(null);
    setEditingTitle("");
    setEditingTime("");
    setEditingNotes("");
  };

  const saveAppointmentChanges = async () => {
    if (!editingAppointmentId) return;

    setSavingAppointment(true);
    try {
      await updateDoc(doc(db, "appointments", editingAppointmentId), {
        title: editingTitle.trim() || "Legal Consultation",
        time: editingTime.trim(),
        notes: editingNotes.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Appointment updated successfully.");
      cancelEditingAppointment();
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast.error("Failed to update appointment.");
    } finally {
      setSavingAppointment(false);
    }
  };

  const downloadReceipt = (appointment: Appointment) => {
    const pdf = new jsPDF();
    const bookedDate = appointment.date ? format(appointment.date.toDate(), "EEEE, dd MMMM yyyy") : "Date TBD";
    const generatedAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const updatedAtText = appointment.updatedAt
      ? appointment.updatedAt.toDate().toLocaleString("en-KE", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Not updated";
    const amountValue = Number(appointment.amount ?? 0);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Payment Receipt", 20, 20);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Generated: ${generatedAt}`, 20, 30);

    pdf.setFont("helvetica", "bold");
    pdf.text("Client", 20, 45);
    pdf.setFont("helvetica", "normal");
    pdf.text(clientName, 20, 53);
    pdf.text(currentUser?.email || "-", 20, 60);

    pdf.setFont("helvetica", "bold");
    pdf.text("Appointment Details", 20, 75);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Case / Booking: ${appointment.title || "Legal Consultation"}`, 20, 83);
    pdf.text(`Lawyer: ${appointment.lawyerName || "Not assigned"}`, 20, 90);
    pdf.text(`Booked Date: ${bookedDate}`, 20, 97);
    pdf.text(`Booked Time: ${appointment.time || "Not set"}`, 20, 104);
    pdf.text(`Location: ${appointment.location || "Not set"}`, 20, 111);

    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Details", 20, 126);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Amount: ${(appointment.currency || "KES")} ${amountValue.toLocaleString("en-KE")}`, 20, 134);
    pdf.text(`Payment Status: ${appointment.paymentStatus || "Pending"}`, 20, 141);
    pdf.text(`Payment Reference: ${appointment.paymentReference || "Not available"}`, 20, 148);
    pdf.text(`Receipt For: ${appointment.paymentDescription || appointment.title || "Legal Consultation"}`, 20, 155);

    pdf.setFont("helvetica", "bold");
    pdf.text("Current Record Status", 20, 170);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Appointment Status: ${appointment.status || "Pending"}`, 20, 178);
    pdf.text(`Last Updated: ${updatedAtText}`, 20, 185);

    if (appointment.notes?.trim()) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Notes", 20, 200);
      pdf.setFont("helvetica", "normal");
      const wrappedNotes = pdf.splitTextToSize(appointment.notes.trim(), 170);
      pdf.text(wrappedNotes, 20, 208);
    }

    pdf.save(`receipt-${appointment.id}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ✅ Improved name fetching logic
  const clientName = currentUser?.displayName?.trim() 
    || currentUser?.email?.split("@")[0] 
    || "Valued Client";

  const firstName = clientName.split(" ")[0]; // For greeting ("Welcome back, Evans")

  const initials = clientName.charAt(0).toUpperCase();

  const isGold = theme === "gold";
  const accent = isGold ? "amber" : "blue";
  const bgClass = isGold 
    ? "from-amber-950 via-yellow-950 to-amber-900" 
    : "from-slate-950 via-blue-950 to-indigo-950";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} text-white relative overflow-hidden`}>
      {/* Elegant Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className={`absolute top-20 left-20 w-96 h-96 rounded-full bg-gradient-to-br ${isGold ? 'from-amber-400/20 to-yellow-500/10' : 'from-blue-400/20 to-indigo-500/10'} blur-3xl`}
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.85, 0.6]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className={`absolute bottom-32 right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br ${isGold ? 'from-yellow-400/10 to-amber-600/20' : 'from-indigo-400/10 to-blue-600/20'} blur-3xl`}
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.5, 0.75, 0.5]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-2xl bg-black/60">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <motion.div 
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="w-11 h-11 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-xl"
            >
              <Scale className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tighter">Muthomi Law</h1>
              <p className="text-xs text-white/60 tracking-widest">EST. 2008 • CLIENT PORTAL</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10 text-white/80 hover:text-white"
            >
              <Palette className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 ring-2 ring-white/30 hover:ring-white/70 transition-all duration-500">
                <AvatarImage src={currentUser?.photoURL ?? undefined} />
                <AvatarFallback className={`bg-gradient-to-br from-${accent}-500 to-${accent}-700 font-semibold text-2xl ring-4 ring-white/20`}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:block">
                <p className="font-medium text-lg">{clientName}</p>
                <p className="text-xs text-white/60">{currentUser?.email}</p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="flex items-center gap-2 text-white/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16 relative z-10">
        {/* Hero Greeting - Improved Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-20"
        >
          <h1 className="text-6xl lg:text-7xl font-bold tracking-tighter leading-none mb-6">
            Welcome back,<br />
            <span className={`${isGold ? "text-amber-400" : "text-blue-400"}`}>
              {firstName}
            </span>.
          </h1>
          <p className="text-2xl text-white/70 max-w-2xl">
            Justice served with excellence and integrity.
          </p>
        </motion.div>

        {/* Book Appointment CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
        >
          <Button
            onClick={() => navigate("/client/book-appointment")}
            className={`w-full sm:w-auto px-12 py-8 text-2xl font-semibold rounded-3xl shadow-2xl flex items-center gap-5 group
              ${isGold 
                ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:shadow-amber-500/50" 
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:shadow-blue-500/50"}`}
          >
            <CalendarPlus className="h-9 w-9 group-hover:rotate-12 transition-transform" />
            Book New Appointment
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 mt-20">
          {/* Appointments Section */}
          <div className="lg:col-span-7">
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden"
            >
              <div className="p-10 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${isGold ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                    <Clock className={`h-9 w-9 ${isGold ? "text-amber-400" : "text-blue-400"}`} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-semibold tracking-tight">Your Appointments</h2>
                    <p className="text-white/60 mt-1">Professional legal sessions</p>
                  </div>
                </div>
                <div className="px-7 py-3 bg-white/10 rounded-full text-sm font-medium">
                  {appointments.length} {appointments.length === 1 ? "Session" : "Sessions"}
                </div>
              </div>

              {appointments.length === 0 ? (
                <div className="py-24 text-center">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                    <CalendarPlus className="mx-auto h-24 w-24 text-white/20 mb-8" />
                  </motion.div>
                  <h3 className="text-3xl text-white/80 font-light">No appointments scheduled yet</h3>
                  <p className="mt-4 text-white/60 max-w-md mx-auto">Schedule your consultation with our expert legal team.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {appointments.map((appt, idx) => (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="p-10 hover:bg-white/5 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-8">
                        <div className="flex-1">
                          <h3 className="text-2xl font-medium flex items-center gap-4">
                            <FileText className={`h-7 w-7 ${isGold ? "text-amber-400" : "text-blue-400"}`} />
                            {appt.title || "Legal Consultation"}
                          </h3>
                          <div className="mt-4 text-lg text-white/75 flex items-center gap-6">
                            <span>{appt.date ? format(appt.date.toDate(), "EEEE, dd MMMM yyyy") : "Date TBD"}</span>
                            <span className="text-white/40">•</span>
                            <span className="font-medium">{appt.time}</span>
                          </div>
                        </div>

                        <div className={`px-8 py-4 rounded-2xl text-base font-medium border flex items-center gap-3
                          ${appt.status?.toLowerCase() === "scheduled" 
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" 
                            : appt.status?.toLowerCase() === "approved" 
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" 
                            : "border-white/20 bg-white/5 text-white/90"}`}>
                          <CheckCircle2 className="h-5 w-5" />
                          {appt.status ? appt.status.charAt(0).toUpperCase() + appt.status.slice(1) : "Pending"}
                        </div>
                      </div>

                      {appt.notes && (
                        <div className="mt-8 pt-8 border-t border-white/10 text-white/80 text-[15px]">
                          <span className="font-medium text-white">Notes:</span> {appt.notes}
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap justify-end gap-3">
                        <Button
                          onClick={() => downloadReceipt(appt)}
                          className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-white hover:bg-white/15"
                        >
                          <Download className="h-4 w-4" />
                          Download Receipt
                        </Button>
                        {appt.status?.toLowerCase() === "scheduled" && (
                          <Button
                            onClick={() => startEditingAppointment(appt)}
                            className={`${isGold
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                            } rounded-2xl px-5 py-3`}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Appointment
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          {/* Feedback Section */}
          <div className="lg:col-span-5">
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-10"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Profile Details</h2>
                  <p className="mt-2 text-white/60">Update your client profile information.</p>
                </div>
                <Button
                  onClick={() => setEditingProfile((prev) => !prev)}
                  variant="ghost"
                  className="rounded-2xl text-white hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                  {editingProfile ? "Close" : "Edit Profile"}
                </Button>
              </div>

              <div className="mt-8 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Full Name</label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    disabled={!editingProfile || savingProfile}
                    className="h-12 border-white/20 bg-white/5 text-white disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
                  <Input
                    value={currentUser?.email || ""}
                    disabled
                    className="h-12 border-white/20 bg-white/5 text-white/70 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Phone Number</label>
                  <Input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    disabled={!editingProfile || savingProfile}
                    className="h-12 border-white/20 bg-white/5 text-white disabled:opacity-70"
                  />
                </div>

                {editingProfile ? (
                  <div className="flex justify-end">
                    <Button
                      onClick={saveProfileChanges}
                      disabled={savingProfile}
                      className={`${isGold
                        ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                      } rounded-2xl px-6 py-3`}
                    >
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-10 h-full"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className={`p-4 rounded-2xl ${isGold ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                  <Star className={`h-9 w-9 ${isGold ? "text-amber-400" : "text-blue-400"}`} />
                </div>
                <h2 className="text-4xl font-semibold tracking-tight">Share Your Experience</h2>
              </div>

              <div className="flex justify-center gap-4 mb-12">
                {[1,2,3,4,5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.25, rotate: 12 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-all"
                  >
                    <Star 
                      className={`h-16 w-16 transition-all duration-300 ${star <= rating 
                        ? isGold ? "fill-amber-400 text-amber-400" : "fill-blue-400 text-blue-400"
                        : "text-white/30 hover:text-white/60"}`} 
                    />
                  </motion.button>
                ))}
              </div>

              <Textarea
                placeholder="Your feedback is important to us. How can we serve you better?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[180px] bg-white/5 border border-white/20 focus:border-amber-400 placeholder:text-white/50 text-white rounded-3xl text-lg"
              />

              <Button
                onClick={handleSubmitFeedback}
                disabled={submitting || rating === 0 || !comment.trim()}
                className={`mt-10 w-full py-8 text-xl font-semibold rounded-3xl transition-all duration-300
                  ${isGold 
                    ? "bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110"}`}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </motion.section>
          </div>
        </div>
      </main>

      {editingAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-8 text-white shadow-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Edit Scheduled Appointment</h2>
            <p className="mt-2 text-white/60">
              Update the title, time, or notes for this scheduled appointment.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Title</label>
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="h-12 border-white/20 bg-white/5 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Time</label>
                <Input
                  type="time"
                  value={editingTime}
                  onChange={(e) => setEditingTime(e.target.value)}
                  className="h-12 border-white/20 bg-white/5 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Notes</label>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="min-h-[150px] border-white/20 bg-white/5 text-white"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={cancelEditingAppointment}>
                Cancel
              </Button>
              <Button onClick={saveAppointmentChanges} disabled={savingAppointment || !editingTime.trim()}>
                {savingAppointment ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
