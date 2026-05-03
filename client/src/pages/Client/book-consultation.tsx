"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

export default function BookConsultationPage() {
  const [service, setService] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ─────────────────────────────
     READ SERVICE FROM URL
  ───────────────────────────── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const serviceParam = params.get("service");

      if (serviceParam) {
        setService(serviceParam);
      }
    }
  }, []);

  /* ─────────────────────────────
     SUBMIT BOOKING
  ───────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      // Convert datetime-local → Firestore Timestamp
      const dateValue = form.date
        ? Timestamp.fromDate(new Date(form.date))
        : null;

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        service: service || "Not specified",

        // system-controlled safe field
        status: "pending",

        // Firestore-compatible timestamp
        date: dateValue,

        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "consultations"),
        payload
      );

      console.log("✅ Booking created with ID:", docRef.id);

      setSuccess(true);

      // reset form
      setForm({
        name: "",
        email: "",
        phone: "",
        date: "",
        message: "",
      });

      setService("");
    } catch (err: any) {
      console.error("🔥 Firestore Error:", err);

      alert(
        `Booking failed:\n${err?.code || ""}\n${err?.message || "Unknown error"}`
      );
    }

    setLoading(false);
  };

  /* ─────────────────────────────
     UI
  ───────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-6">

        <h1 className="text-2xl font-bold mb-4">
          Book Consultation ⚖️
        </h1>

        {service && (
          <p className="text-sm text-gray-600 mb-4">
            Service: <span className="font-semibold">{service}</span>
          </p>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            ✅ Booking successful!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            required
            type="text"
            placeholder="Full Name"
            className="w-full border p-2 rounded"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            required
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <input
            required
            type="text"
            placeholder="Phone Number"
            className="w-full border p-2 rounded"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <input
            required
            type="datetime-local"
            className="w-full border p-2 rounded"
            value={form.date}
            onChange={(e) =>
              setForm({ ...form, date: e.target.value })
            }
          />

          <textarea
            placeholder="Describe your issue..."
            className="w-full border p-2 rounded"
            rows={4}
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            {loading ? "Booking..." : "Book Consultation"}
          </button>

        </form>
      </div>
    </div>
  );
}