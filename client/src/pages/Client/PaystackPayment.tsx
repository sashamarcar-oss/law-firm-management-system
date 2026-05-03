"use client";

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaystackPop from "@paystack/inline-js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import toast from "react-hot-toast";
import { ArrowLeft, CreditCard, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";

import { db, functions } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { createActivity } from "@/lib/activityLogger";

type PaymentMethod = "paystack" | "mpesa";

interface BookingPayload {
  amount: number;
  email: string;
  lawyerId: string;
  lawyerName: string;
  lawyerBarNumber?: string;
  lawyerPhone?: string;
  lawyerAccessLevel?: string;
  caseType: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  paymentPhone?: string;
}

interface PaystackSuccessResponse {
  id: string;
  reference: string;
  message: string;
  redirecturl: string;
  status: "success";
  trans: string;
  transaction: string;
  trxref: string;
}

interface MpesaResponse {
  success?: boolean;
  message?: string;
  CheckoutRequestID?: string;
  MerchantRequestID?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const typedError = error as { code: string; message: string };
    return `${typedError.code}: ${typedError.message}`;
  }

  return fallback;
};

const isPermissionDeniedError = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code.includes("permission-denied");
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("insufficient permissions");
  }

  return false;
};

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;

const createAppointmentTimestamp = (date: string) => {
  return Timestamp.fromDate(new Date(`${date}T00:00:00`));
};

const normalizeKeyPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const buildAppointmentKey = (clientId: string, booking: BookingPayload) =>
  [
    normalizeKeyPart(clientId),
    normalizeKeyPart(booking.lawyerId),
    normalizeKeyPart(booking.date),
    normalizeKeyPart(booking.time),
    normalizeKeyPart(booking.caseType),
  ].join("_");

const isInactiveAppointment = (status: string, paymentStatus: string) => {
  const normalizedStatus = status.toLowerCase();
  const normalizedPaymentStatus = paymentStatus.toLowerCase();

  return ["cancelled", "canceled", "rejected"].includes(normalizedStatus) ||
    ["failed", "refunded"].includes(normalizedPaymentStatus);
};

export default function PaystackPayment() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentUser } = useAuth();
  const booking = state as BookingPayload | undefined;

  const [processing, setProcessing] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const appointmentKey = currentUser?.uid && booking
    ? buildAppointmentKey(currentUser.uid, booking)
    : null;

  const findExistingAppointment = async () => {
    if (!appointmentKey) {
      return null;
    }

    let existingSnapshot;
    try {
      existingSnapshot = await getDoc(doc(db, "appointments", appointmentKey));
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        console.warn(
          "Read access blocked while checking existing appointment; continuing with create flow.",
          error
        );
        return null;
      }
      throw error;
    }

    if (!existingSnapshot.exists()) {
      return null;
    }

    const existingData = existingSnapshot.data() as Record<string, unknown>;
    const existingStatus = String(existingData.status || "");
    const existingPaymentStatus = String(existingData.paymentStatus || "");

    if (isInactiveAppointment(existingStatus, existingPaymentStatus)) {
      return null;
    }

    return {
      id: existingSnapshot.id,
      data: existingData,
    };
  };

  const createBookingRecords = async (resolvedPaymentReference: string) => {
    if (!currentUser?.uid || !booking || !appointmentKey) {
      throw new Error("Missing booking context.");
    }

    const existingAppointment = await findExistingAppointment();
    if (existingAppointment) {
      return existingAppointment.id;
    }

    const appointmentRef = doc(db, "appointments", appointmentKey);

    try {
      await setDoc(appointmentRef, {
        clientId: currentUser.uid,
        clientName:
          currentUser.displayName ||
          currentUser.email ||
          "Client",
        clientEmail: currentUser.email || booking.email,
        clientPhone: currentUser.phone || currentUser.phoneNumber || "",
        lawyerId: booking.lawyerId,
        lawyerName: booking.lawyerName,
        lawyer: booking.lawyerName,
        title: booking.caseType,
        bookingKey: appointmentKey,
        appointmentDateKey: booking.date,
        date: createAppointmentTimestamp(booking.date),
        time: booking.time,
        location: booking.location,
        notes: booking.notes || "",
        amount: booking.amount,
        currency: "KES",
        paymentDescription: `${booking.caseType} appointment with ${booking.lawyerName}`,
        status: "pending",
        paymentStatus: "paid",
        paymentMethod: booking.paymentMethod,
        paymentReference: resolvedPaymentReference,
        approvedBy: "",
        rejectionReason: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw new Error(
        `Could not create appointment record. ${getErrorMessage(error, "Firestore write failed.")}`
      );
    }

    return appointmentRef.id;
  };

  const createPaymentRecord = async (
    linkedAppointmentId: string,
    resolvedPaymentReference: string
  ) => {
    if (!currentUser?.uid || !booking) {
      throw new Error("Missing payment context.");
    }

    try {
      await setDoc(doc(db, "payments", linkedAppointmentId), {
        appointmentId: linkedAppointmentId,
        amount: Math.round(booking.amount),
        case: booking.caseType,
        checkoutRequestId: "",
        clientEmail: currentUser.email || booking.email,
        clientName: currentUser.displayName || currentUser.email || "Client",
        clientId: currentUser.uid,
        clientUid: currentUser.uid,
        currency: "KES",
        status: "paid",
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        lawyerId: booking.lawyerId,
        lawyerName: booking.lawyerName,
        merchantRequestId: "",
        message: "Payment recorded successfully.",
        method: booking.paymentMethod,
        paystackReference: resolvedPaymentReference,
        transactionId: resolvedPaymentReference,
      });
    } catch (error) {
      throw new Error(
        `Could not create payment record. ${getErrorMessage(error, "Firestore write failed.")}`
      );
    }
  };

  const createPaymentAuditActivity = async (
    linkedAppointmentId: string,
    resolvedPaymentReference: string,
    paymentDocSaved: boolean
  ) => {
    if (!booking || !currentUser?.uid) {
      return;
    }

    const performerName = currentUser.displayName || currentUser.email || "Client";
    const details = paymentDocSaved
      ? `Payment of KES ${booking.amount.toLocaleString()} confirmed for ${booking.caseType} with ${booking.lawyerName}. Ref: ${resolvedPaymentReference || "N/A"}`
      : `Payment confirmed for ${booking.caseType} with ${booking.lawyerName}, but payment document write was blocked by rules. Ref: ${resolvedPaymentReference || "N/A"}`;

    await createActivity({
      type: "payment",
      action: "Payment Received",
      message: details,
      details,
      performedBy: performerName,
      targetType: "Payment",
      targetName: linkedAppointmentId,
      relatedId: linkedAppointmentId,
    });
  };

  const handlePaystackPayment = async () => {
    if (!booking) {
      toast.error("Booking details are missing. Please start again.");
      navigate("/client/book-appointment");
      return;
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error("Missing Paystack public key. Set VITE_PAYSTACK_PUBLIC_KEY.");
      return;
    }

    setProcessing(true);

    try {
      const paystack = new PaystackPop();
      const reference = `APT-${Date.now()}-${currentUser?.uid?.slice(0, 6) || "guest"}`;

      paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: booking.email,
        amount: Math.round(booking.amount * 100),
        reference,
        onSuccess: async (transaction: PaystackSuccessResponse) => {
          try {
            setPaymentReference(transaction.reference);
            setPaymentSuccessful(true);
            toast.success("Payment complete. Click Book Appointment to save it.");
          } catch (error) {
            console.error("Failed to save Paystack booking:", error);
            toast.error(getErrorMessage(error, "Payment succeeded, but saving the booking failed."));
          } finally {
            setProcessing(false);
          }
        },
        onCancel: () => {
          toast.error("Payment was cancelled.");
          setProcessing(false);
        },
        onError: (error: { message?: string }) => {
          toast.error(error?.message || "Paystack could not start.");
          setProcessing(false);
        },
      });
    } catch (error) {
      console.error("Paystack checkout error:", error);
      toast.error("Unable to start Paystack checkout.");
      setProcessing(false);
    }
  };

  const handleMpesaPayment = async () => {
    if (!booking || !currentUser?.uid) {
      toast.error("Booking details are missing. Please start again.");
      navigate("/client/book-appointment");
      return;
    }

    if (!booking.paymentPhone?.trim()) {
      toast.error("M-Pesa phone number is required.");
      return;
    }

    setProcessing(true);

    try {
      if (!appointmentKey) {
        throw new Error("Missing booking identity.");
      }

      const existingAppointment = await findExistingAppointment();
      if (existingAppointment) {
        const existingPaymentStatus = String(existingAppointment.data.paymentStatus || "").toLowerCase();
        const existingReference = String(existingAppointment.data.paymentReference || "");

        toast.success(
          existingPaymentStatus === "paid"
            ? "This appointment has already been paid and booked."
            : "This appointment already exists and is awaiting payment confirmation."
        );
        navigate("/client/profile", {
          replace: true,
          state: {
            appointmentId: existingAppointment.id,
            paymentReference: existingReference,
          },
        });
        return;
      }

      const appointmentRef = doc(db, "appointments", appointmentKey);
      await setDoc(appointmentRef, {
        clientId: currentUser.uid,
        clientName:
          currentUser.displayName ||
          currentUser.email ||
          "Client",
        clientEmail: currentUser.email || booking.email,
        clientPhone: currentUser.phone || currentUser.phoneNumber || booking.paymentPhone?.trim() || "",
        lawyerId: booking.lawyerId,
        lawyerName: booking.lawyerName,
        title: booking.caseType,
        bookingKey: appointmentKey,
        appointmentDateKey: booking.date,
        date: createAppointmentTimestamp(booking.date),
        time: booking.time,
        location: booking.location,
        notes: booking.notes || "",
        amount: booking.amount,
        currency: "KES",
        paymentDescription: `${booking.caseType} appointment with ${booking.lawyerName}`,
        status: "pending",
        lawyer: booking.lawyerName,
        paymentMethod: "mpesa",
        paymentStatus: "pending",
        approvedBy: "",
        rejectionReason: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const stkPush = httpsCallable<
        { amount: number; phone: string; lawyerId: string; appointmentId: string },
        MpesaResponse
      >(functions, "stkPush");

      const response = await stkPush({
        amount: booking.amount,
        phone: booking.paymentPhone.trim(),
        lawyerId: booking.lawyerId,
        appointmentId: appointmentRef.id,
      });

      await updateDoc(doc(db, "appointments", appointmentRef.id), {
        paymentReference: response.data?.MerchantRequestID || "",
        checkoutRequestID: response.data?.CheckoutRequestID || "",
      });

      toast.success(response.data?.message || "M-Pesa prompt sent. Complete payment on your phone.");
      navigate("/client/profile", { replace: true });
    } catch (error) {
      console.error("M-Pesa checkout error:", error);
      toast.error("Unable to start M-Pesa payment.");
    } finally {
      setProcessing(false);
    }
  };

  const handleContinue = async () => {
    if (!booking) {
      toast.error("Booking details are missing. Please start again.");
      navigate("/client/book-appointment");
      return;
    }

    if (booking.paymentMethod === "paystack") {
      await handlePaystackPayment();
      return;
    }

    const existingAppointment = await findExistingAppointment();
    if (existingAppointment) {
      const existingPaymentStatus = String(existingAppointment.data.paymentStatus || "").toLowerCase();
      const existingReference = String(existingAppointment.data.paymentReference || "");

      toast.success(
        existingPaymentStatus === "paid"
          ? "This appointment has already been booked and paid for."
          : "This appointment already exists and is awaiting payment confirmation."
      );
      navigate("/client/profile", {
        replace: true,
        state: {
          appointmentId: existingAppointment.id,
          paymentReference: existingReference,
        },
      });
      return;
    }

    await handleMpesaPayment();
  };

  const handleFinishBooking = () => {
    void (async () => {
      if (!paymentSuccessful) {
        toast.error("Complete payment first.");
        return;
      }

      if (appointmentId) {
        navigate("/client/profile", { replace: true, state: { appointmentId } });
        return;
      }

      setProcessing(true);

      try {
        const resolvedPaymentReference = paymentReference || "";
        const createdAppointmentId = await createBookingRecords(resolvedPaymentReference);
        let paymentDocSaved = true;

        try {
          await createPaymentRecord(createdAppointmentId, resolvedPaymentReference);
        } catch (error) {
          if (isPermissionDeniedError(error)) {
            paymentDocSaved = false;
            console.warn("Payment document write blocked by Firestore rules:", error);
            toast.success("Appointment booked, but the separate payment log could not be saved.");
          } else {
            throw error;
          }
        }
        await createPaymentAuditActivity(
          createdAppointmentId,
          resolvedPaymentReference,
          paymentDocSaved
        );

        setAppointmentId(createdAppointmentId);
        toast.success(
          paymentReference
            ? `Appointment booked. Payment reference: ${paymentReference}`
            : "Appointment booked successfully."
        );
        navigate("/client/profile", { replace: true, state: { appointmentId: createdAppointmentId } });
      } catch (error) {
        console.error("Failed to save appointment after payment:", error);
        toast.error(getErrorMessage(error, "Could not save appointment."));
      } finally {
        setProcessing(false);
      }
    })();
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-semibold mb-3">Payment details not found</h1>
          <p className="text-white/70 mb-6">
            Your booking information was missing, so the payment step could not continue.
          </p>
          <button
            onClick={() => navigate("/client/book-appointment")}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-4 font-semibold hover:bg-emerald-500 transition-colors"
          >
            Return to booking form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-950 to-black text-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/client/book-appointment")}
          className="mb-8 inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking
        </button>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-400 mb-2">Secure Checkout</p>
              <h1 className="text-3xl font-semibold">Confirm your appointment payment</h1>
              <p className="mt-3 text-white/65">
                Review the booking details below, then continue to{" "}
                {booking.paymentMethod === "mpesa" ? "M-Pesa" : "Paystack"}.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-500/15 p-3 border border-emerald-400/20">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-white/50 text-sm mb-1">Lawyer</p>
              <p className="font-medium">{booking.lawyerName}</p>
            </div>
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-white/50 text-sm mb-1">Case Type</p>
              <p className="font-medium">{booking.caseType}</p>
            </div>
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-white/50 text-sm mb-1">Appointment Date</p>
              <p className="font-medium">{booking.date}</p>
            </div>
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-white/50 text-sm mb-1">Appointment Time</p>
              <p className="font-medium">{booking.time}</p>
            </div>
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-white/50 text-sm mb-1">Payment Email</p>
              <p className="font-medium break-all">{booking.email}</p>
            </div>
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-white/50 text-sm mb-1">Amount</p>
              <p className="font-medium">KES {booking.amount.toLocaleString()}</p>
            </div>
          </div>

          {booking.notes ? (
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 mb-8">
              <p className="text-white/50 text-sm mb-1">Notes</p>
              <p className="text-white/85 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          ) : null}

          <button
            onClick={handleContinue}
            disabled={processing || paymentSuccessful}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 font-semibold text-lg shadow-xl hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {processing ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Processing payment...
              </>
            ) : booking.paymentMethod === "mpesa" ? (
              <>
                <Smartphone className="h-5 w-5" />
                Send M-Pesa Prompt
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Open Paystack Checkout
              </>
            )}
          </button>

          {paymentSuccessful && paymentReference ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Payment confirmed. Reference: {paymentReference}
              </div>
              <button
                onClick={handleFinishBooking}
                disabled={processing}
                className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-600/20 px-5 py-4 font-semibold text-lg text-white hover:bg-emerald-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {processing ? "Saving Booking..." : "Book Appointment"}
              </button>
            </div>
          ) : null}

          {booking.paymentMethod === "paystack" && !PAYSTACK_PUBLIC_KEY ? (
            <p className="mt-4 text-sm text-red-300">
              `VITE_PAYSTACK_PUBLIC_KEY` is not set, so Paystack cannot open yet.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
