"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input 2";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  CreditCard,
  Flag,
  LoaderCircle,
  Smartphone,
  Moon,
  Scale,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

import { CASE_TYPES } from "@/components/caseTypes";

type ThemeColor = "amber" | "blue" | "red" | "orange";
type WorkingHours = {
  start: string;
  end: string;
};
type PaymentMethod = "paystack" | "mpesa";

interface Lawyer {
  id: string;
  displayName: string;
  name?: string;
  professional?: string;
  email?: string;
  barNumber?: string;
  bio?: string;
  phone?: string;
  phoneNumber?: string;
  accessLevel?: string;
  role?: string;
  online?: boolean;
  createdAt?: unknown;
  lastSeen?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const getLawyerLabel = (lawyer: Lawyer) => lawyer.name || lawyer.displayName || "Unknown Lawyer";
const normalizeLawyerRecord = (
  id: string,
  data: Record<string, unknown>
): Lawyer | null => {
  const role = String(data.role || "").toLowerCase();
  if (role !== "lawyer") {
    return null;
  }

  const displayName = String(data.displayName || data.name || "").trim();
  const name = String(data.name || data.displayName || "").trim();
  const lawyerId = String(data.uid || id).trim();

  if (!lawyerId) {
    return null;
  }

  return {
    id: lawyerId,
    displayName: displayName || name || "Unknown Lawyer",
    name: name || displayName || "Unknown Lawyer",
    professional:
      typeof data.professional === "string"
        ? data.professional
        : typeof data.specialization === "string"
          ? data.specialization
          : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
    barNumber: typeof data.barNumber === "string" ? data.barNumber : undefined,
    bio: typeof data.bio === "string" ? data.bio : undefined,
    phone:
      typeof data.phone === "string"
        ? data.phone
        : typeof data.phoneNumber === "string"
          ? data.phoneNumber
          : undefined,
    phoneNumber:
      typeof data.phoneNumber === "string"
        ? data.phoneNumber
        : typeof data.phone === "string"
          ? data.phone
          : undefined,
    accessLevel: typeof data.accessLevel === "string" ? data.accessLevel : undefined,
    role,
    online: Boolean(data.online),
    createdAt: data.createdAt,
    lastSeen: data.lastSeen,
  };
};
const WORKING_HOURS: WorkingHours = {
  start: "09:00",
  end: "17:00",
};
const MIN_BOOKING_NOTICE_DAYS = 2;
const KENYA_PUBLIC_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-03-21",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-05-27",
  "2026-06-01",
  "2026-10-10",
  "2026-10-20",
  "2026-11-08",
  "2026-12-12",
  "2026-12-25",
  "2026-12-26",
]);

const formatDateInputValue = (value: Date) => value.toISOString().split("T")[0];
const isWeekend = (value: Date) => value.getDay() === 0 || value.getDay() === 6;
const isKenyanHoliday = (value: Date) => KENYA_PUBLIC_HOLIDAYS_2026.has(formatDateInputValue(value));
const isBusinessDay = (value: Date) => !isWeekend(value) && !isKenyanHoliday(value);
const addDays = (value: Date, days: number) => {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
};
const getNextBookableDate = (value: Date) => {
  let candidate = addDays(value, MIN_BOOKING_NOTICE_DAYS);
  candidate.setHours(0, 0, 0, 0);

  while (!isBusinessDay(candidate)) {
    candidate = addDays(candidate, 1);
    candidate.setHours(0, 0, 0, 0);
  }

  return candidate;
};
const isWithinWorkingHours = (selectedTime: string) =>
  selectedTime >= WORKING_HOURS.start && selectedTime <= WORKING_HOURS.end;

const isInactiveAppointment = (status: string, paymentStatus: string) => {
  const normalizedStatus = status.toLowerCase();
  const normalizedPaymentStatus = paymentStatus.toLowerCase();

  return ["cancelled", "canceled", "rejected"].includes(normalizedStatus) ||
    ["failed", "refunded"].includes(normalizedPaymentStatus);
};

export default function BookAppointment() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [caseType, setCaseType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("Nairobi");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState<number>(2);
  const [paymentEmail, setPaymentEmail] = useState(currentUser?.email?.trim() || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [paymentPhone, setPaymentPhone] = useState(
    currentUser?.phone || currentUser?.phoneNumber || ""
  );

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loadingLawyers, setLoadingLawyers] = useState(true);
  const [selectedLawyerId, setSelectedLawyerId] = useState("");
  const [slotUnavailable, setSlotUnavailable] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState<ThemeColor>("amber");

  const userName =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Valued Client";
  const clientRole = String(currentUser?.role || "").toLowerCase();
  const selectedLawyer = useMemo(
    () => lawyers.find((lawyer) => lawyer.id === selectedLawyerId) ?? null,
    [lawyers, selectedLawyerId]
  );
  const normalizedPaymentEmail = paymentEmail.trim().toLowerCase();
  const earliestBookingDate = getNextBookableDate(new Date());
  const earliestBookingDateString = formatDateInputValue(earliestBookingDate);

  useEffect(() => {
    setPaymentEmail(currentUser?.email?.trim() || "");
  }, [currentUser?.email]);

  useEffect(() => {
    setPaymentPhone(currentUser?.phone || currentUser?.phoneNumber || "");
  }, [currentUser?.phone, currentUser?.phoneNumber]);

  useEffect(() => {
    setLoadingLawyers(true);

    const lawyersQuery = query(collection(db, "users"), where("role", "==", "lawyer"));
    const unsubscribe = onSnapshot(
      lawyersQuery,
      (snapshot) => {
        const lawyerList = snapshot.docs
          .map((lawyerDoc) =>
            normalizeLawyerRecord(lawyerDoc.id, lawyerDoc.data() as Record<string, unknown>)
          )
          .filter((lawyer): lawyer is Lawyer => lawyer !== null)
          .sort((a, b) => getLawyerLabel(a).localeCompare(getLawyerLabel(b)));

        setLawyers(lawyerList);
        setSelectedLawyerId((currentSelectedLawyerId) => {
          if (
            currentSelectedLawyerId &&
            lawyerList.some((lawyer) => lawyer.id === currentSelectedLawyerId)
          ) {
            return currentSelectedLawyerId;
          }

          return lawyerList[0]?.id ?? "";
        });
        setLoadingLawyers(false);
      },
      (error) => {
        console.error("Error fetching lawyers:", error);
        toast.error("Failed to load lawyers. Please try again.");
        setLawyers([]);
        setLoadingLawyers(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(savedMode);
    document.documentElement.classList.toggle("dark", savedMode);
  }, []);

  useEffect(() => {
    if (!selectedLawyerId || !date || !time) {
      setSlotUnavailable(false);
      setCheckingAvailability(false);
      return;
    }

    setCheckingAvailability(true);
    const slotQuery = query(
      collection(db, "appointments"),
      where("lawyerId", "==", selectedLawyerId),
      where("appointmentDateKey", "==", date),
      where("time", "==", time)
    );

    const unsubscribe = onSnapshot(
      slotQuery,
      (snapshot) => {
        const taken = snapshot.docs.some((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const status = String(data.status || "").toLowerCase();
          const paymentStatus = String(data.paymentStatus || "").toLowerCase();
          return !isInactiveAppointment(status, paymentStatus);
        });

        setSlotUnavailable(taken);
        setCheckingAvailability(false);
      },
      (error) => {
        console.error("Real-time availability error:", error);
        setSlotUnavailable(false);
        setCheckingAvailability(false);
      }
    );

    return () => unsubscribe();
  }, [selectedLawyerId, date, time]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    document.documentElement.classList.toggle("dark", newMode);
  };

  const checkCollision = async (selectedDate: string, selectedTime: string, lawyerId: string) => {
    if (!lawyerId) return false;

    const q = query(
      collection(db, "appointments"),
      where("lawyerId", "==", lawyerId),
      where("appointmentDateKey", "==", selectedDate),
      where("time", "==", selectedTime)
    );

    try {
      const snapshot = await getDocs(q);

      return snapshot.docs.some((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const status = String(data.status || "").toLowerCase();
        const paymentStatus = String(data.paymentStatus || "").toLowerCase();
        return !isInactiveAppointment(status, paymentStatus);
      });
    } catch (error) {
      console.error("Collision check failed:", error);
      return false;
    }
  };

  const hasExistingClientBooking = async (
    selectedDate: string,
    selectedTime: string,
    lawyerId: string
  ) => {
    if (!currentUser?.uid || !lawyerId) return false;

    const existingBookingQuery = query(
      collection(db, "appointments"),
      where("clientId", "==", currentUser.uid),
      where("lawyerId", "==", lawyerId),
      where("appointmentDateKey", "==", selectedDate),
      where("time", "==", selectedTime)
    );

    try {
      const snapshot = await getDocs(existingBookingQuery);

      return snapshot.docs.some((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const status = String(data.status || "").toLowerCase();
        const paymentStatus = String(data.paymentStatus || "").toLowerCase();
        return !isInactiveAppointment(status, paymentStatus);
      });
    } catch (error) {
      console.error("Existing booking check failed:", error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!currentUser?.uid) return toast.error("Please log in again.");
    if (clientRole !== "client") {
      return toast.error("Only clients can book appointments.");
    }
    if (!selectedLawyerId) {
      return toast.error("No lawyer is currently available.");
    }
    if (!caseType || !date || !time) {
      return toast.error("Please select a case type, date and time.");
    }
    if (!normalizedPaymentEmail) {
      return toast.error("Please enter your email before paying.");
    }
    if (!EMAIL_PATTERN.test(normalizedPaymentEmail)) {
      return toast.error("Please enter a valid email address before paying.");
    }
    if (paymentMethod === "mpesa" && !paymentPhone.trim()) {
      return toast.error("Please enter the phone number for the M-Pesa prompt.");
    }
    if (amount < 2) return toast.error("Minimum fee is KES 2.");

    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0, 0, 0, 0);

    if (selectedDateObj.getTime() < earliestBookingDate.getTime()) {
      return toast.error(
        `Appointments must be booked at least ${MIN_BOOKING_NOTICE_DAYS} days ahead.`
      );
    }

    if (isWeekend(selectedDateObj)) {
      return toast.error("Appointments are not available on weekends.");
    }

    if (isKenyanHoliday(selectedDateObj)) {
      return toast.error("Appointments are not available on public holidays.");
    }

    if (!isWithinWorkingHours(time)) {
      return toast.error(
        `Appointments are only available between ${WORKING_HOURS.start} and ${WORKING_HOURS.end}.`
      );
    }

    setSubmitting(true);

    try {
      if (slotUnavailable) {
        toast.error("That lawyer is no longer available at the selected date and time.");
        return;
      }

      const isTaken = await checkCollision(date, time, selectedLawyerId);
      if (isTaken) {
        toast.error("This lawyer already has an appointment at the same time on that day.");
        return;
      }

      const alreadyBooked = await hasExistingClientBooking(date, time, selectedLawyerId);
      if (alreadyBooked) {
        toast.error("You have already booked and paid for this appointment slot.");
        navigate("/client/profile");
        return;
      }

      navigate("/client/paystack-payment", {
        state: {
          amount,
          email: normalizedPaymentEmail,
          lawyerId: selectedLawyerId,
          lawyerName: selectedLawyer ? getLawyerLabel(selectedLawyer) : "Selected Lawyer",
          lawyerBarNumber: selectedLawyer?.barNumber || "",
          lawyerPhone: selectedLawyer?.phone || "",
          lawyerAccessLevel: selectedLawyer?.accessLevel || "View",
          caseType,
          date,
          time,
          location,
          notes,
          paymentMethod,
          paymentPhone: paymentPhone.trim(),
        },
      });
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const accentClasses = {
    amber: "from-amber-500 to-yellow-500",
    blue: "from-blue-500 to-indigo-500",
    red: "from-red-500 to-rose-500",
    orange: "from-orange-500 to-amber-500",
  };

  return (
    <div
      className={`min-h-screen overflow-hidden relative transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-950 via-zinc-950 to-black text-white"
          : "bg-gradient-to-br from-zinc-100 via-white to-slate-50 text-gray-900"
      }`}
    >
      {isDarkMode && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className={`absolute top-[-15%] left-[-10%] w-[1000px] h-[1000px] rounded-full bg-gradient-to-br ${accentClasses[accentColor]}/10 blur-[160px]`}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-yellow-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
              <Scale className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Muthomi Law Firm</h2>
              <p className="text-sm opacity-60 flex items-center gap-1.5 text-emerald-500">
                <Shield className="h-4 w-4" />
                Justice • Integrity • Excellence
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-sm opacity-70">
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4 text-red-500" />
              <span>Republic of Kenya</span>
            </div>
            <div className="h-px w-6 bg-current opacity-30" />
            <span>The Judiciary</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-2xl font-medium">
            Welcome back, <span className="text-amber-400">{userName}</span>
          </p>
          <p className="opacity-60">Complete your secure legal booking via Paystack</p>
        </motion.div>

        <div className="fixed md:absolute top-6 right-6 z-50 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full hover:bg-white/10 w-11 h-11 border border-white/10"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className="hidden sm:flex gap-2 bg-white/10 backdrop-blur-md rounded-full p-1.5 border border-white/10">
            {(["amber", "blue", "red", "orange"] as ThemeColor[]).map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${
                  accentColor === color ? "ring-2 ring-white scale-110" : ""
                }`}
                style={{
                  background:
                    color === "amber"
                      ? "#f59e0b"
                      : color === "blue"
                        ? "#3b82f6"
                        : color === "red"
                          ? "#ef4444"
                          : "#f97316",
                }}
              />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 md:p-14 shadow-2xl"
        >
          <div className="grid lg:grid-cols-12 gap-14">
            <div className="lg:col-span-5">
              <div className="sticky top-12">
                <h2 className="text-4xl font-semibold tracking-tight mb-6">Consultation Request</h2>
                <p className="opacity-70 leading-relaxed mb-10">
                  We will assign an available lawyer and continue with secure Paystack payment.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-400" /> View Level Advocate
                </Label>
                <Select value={selectedLawyerId} onValueChange={setSelectedLawyerId}>
                  <SelectTrigger className="h-16 bg-white/5 border-white/20 text-lg">
                    <SelectValue placeholder={loadingLawyers ? "Loading..." : "Choose View advocate"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-96 bg-zinc-900 border-white/10 text-white">
                    {lawyers.map((lawyer) => (
                      <SelectItem
                        key={lawyer.id}
                        textValue={getLawyerLabel(lawyer)}
                        value={lawyer.id}
                        className="px-3 py-4 hover:bg-white/10"
                      >
                        <span className="font-semibold text-white">
                          {getLawyerLabel(lawyer)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!loadingLawyers && selectedLawyer && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold">{getLawyerLabel(selectedLawyer)}</p>
                    {selectedLawyer.email && (
                      <p className="text-sm opacity-70">{selectedLawyer.email}</p>
                    )}
                    <p className="text-sm opacity-70">
                      {selectedLawyer.barNumber
                        ? `Bar No: ${selectedLawyer.barNumber}`
                        : "Bar number not available"}
                    </p>
                    {selectedLawyer.phone && (
                      <p className="text-sm opacity-70">Phone: {selectedLawyer.phone}</p>
                    )}
                    {selectedLawyer.bio && (
                      <p className="text-sm opacity-70">Bio: {selectedLawyer.bio}</p>
                    )}
                    {selectedLawyer.role && (
                      <p className="text-xs opacity-50">Role: {selectedLawyer.role}</p>
                    )}
                    {selectedLawyer.accessLevel && (
                      <p className="text-xs opacity-50">Access level: {selectedLawyer.accessLevel}</p>
                    )}
                  </div>
                )}
                {!loadingLawyers && lawyers.length === 0 && (
                  <p className="text-sm text-amber-400">
                    No lawyers were found in the Firebase user records.
                  </p>
                )}
                {checkingAvailability && selectedLawyerId && date && time && (
                  <p className="flex items-center gap-2 text-sm text-blue-300">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Checking live availability...
                  </p>
                )}
                {!checkingAvailability && slotUnavailable && (
                  <p className="text-sm text-red-300">
                    This lawyer is already booked for the selected date and time.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-amber-400" /> Nature of Case
                </Label>
                <Select value={caseType} onValueChange={setCaseType}>
                  <SelectTrigger className="h-16 bg-white/5 border-white/20 text-lg">
                    <SelectValue placeholder="Select case category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {CASE_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="py-3">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Preferred Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-4.5 h-5 w-5 text-amber-400" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={earliestBookingDateString}
                    className="pl-12 h-14 bg-white/5 border-white/20"
                  />
                </div>
                <p className="text-xs opacity-70">
                  Earliest booking date: {earliestBookingDateString}. Same-day, next-day, weekend, and holiday
                  bookings are not allowed.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-4.5 h-5 w-5 text-amber-400" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="pl-12 h-14 bg-white/5 border-white/20"
                    />
                  </div>
                  <p className="text-xs opacity-70">
                    Working hours are {WORKING_HOURS.start} to {WORKING_HOURS.end}.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Consultation Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-14 bg-white/5 border-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label>Consultation Fee (KES)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-4.5 h-5 w-5 text-amber-400" />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const nextValue = Number(e.target.value);
                      setAmount(Number.isNaN(nextValue) ? 2 : Math.max(2, nextValue));
                    }}
                    min={2}
                    step={1}
                    className="pl-12 h-14 bg-white/5 border-white/20 text-lg"
                  />
                </div>
                <p className="text-xs opacity-50">
                  Paystack checkout will open for KES {amount.toLocaleString()}
                </p>
                <p className="text-xs opacity-70">
                  Test with a small amount first, for example KES 2.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email for Payment</Label>
                <Input
                  type="email"
                  value={paymentEmail}
                  onChange={(e) => setPaymentEmail(e.target.value)}
                  placeholder="Enter email for Paystack"
                  className="h-14 bg-white/5 border-white/20"
                />
                <p className="text-xs opacity-70">
                  This email will be sent to Paystack using the frontend public key.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-400" /> Payment Method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                >
                  <SelectTrigger className="h-16 bg-white/5 border-white/20 text-lg">
                    <SelectValue placeholder="Choose payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="mpesa">M-Pesa Number</SelectItem>
                    <SelectItem value="paystack">Paystack Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "mpesa" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-amber-400" /> M-Pesa Phone Number
                  </Label>
                  <Input
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="e.g. 07XXXXXXXX or +2547XXXXXXXX"
                    className="h-14 bg-white/5 border-white/20"
                  />
                  <p className="text-xs opacity-70">
                    We will send the STK prompt to this number after you confirm the booking.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Case Briefing / Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide summary context..."
                  className="min-h-[140px] bg-white/5 border-white/20"
                />
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || loadingLawyers || slotUnavailable || checkingAvailability}
                    className="w-full h-16 text-xl font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-2xl flex items-center justify-center gap-3"
                  >
                    {submitting
                      ? "Preparing Payment..."
                      : paymentMethod === "mpesa"
                        ? "Confirm & Pay with M-Pesa"
                        : "Confirm & Pay with Paystack"}
                    <CreditCard className="h-6 w-6" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
