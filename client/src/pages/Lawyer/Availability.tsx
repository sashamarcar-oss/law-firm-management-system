// src/pages/lawyer/Availability.tsx

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext"; // adjust path if needed
import { toast } from "react-hot-toast";

export default function Availability() {
  const {  firebaseUser, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentSavedDate, setCurrentSavedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Load current availability when user is ready
  useEffect(() => {
    if (authLoading || !firebaseUser?.uid) {
      setFetching(false);
      return;
    }

    const loadAvailability = async () => {
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          const avail = data.availability as Timestamp | undefined;

          if (avail?.toDate) {
            const dateString = avail.toDate().toISOString().split("T")[0];
            setCurrentSavedDate(dateString);
            setSelectedDate(dateString); // pre-fill the input
          }
        }
      } catch (err) {
        console.error("Error loading availability:", err);
        toast.error("Could not load your current availability");
      } finally {
        setFetching(false);
      }
    };

    loadAvailability();
  }, [authLoading, firebaseUser?.uid]);

  const handleSave = async () => {
    if (authLoading || !firebaseUser?.uid) {
      toast.error("You must be logged in to update availability");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    // Optional: prevent saving the same date again
    if (selectedDate === currentSavedDate) {
      toast("This date is already saved", { icon: "ℹ️" });
      return;
    }

    setSaving(true);

    try {
      const userRef = doc(db, "users", firebaseUser.uid);

      await updateDoc(userRef, {
        availability: Timestamp.fromDate(new Date(selectedDate)),
        availabilityUpdatedAt: Timestamp.now(), // optional but useful
      });

      toast.success("Availability updated successfully");
      setCurrentSavedDate(selectedDate);
    } catch (error) {
      console.error("Failed to save availability:", error);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────
  // Render logic
  // ────────────────────────────────────────────────

  if (authLoading || fetching) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading your availability...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Please sign in
        </h2>
        <p className="text-gray-600 mb-6">
          You need to be logged in to manage your availability.
        </p>
        <a
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Set Your Availability
      </h1>

      {currentSavedDate && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Currently available on: <strong>{currentSavedDate}</strong>
          </p>
        </div>
      )}

      <div className="mb-6">
        <label
          htmlFor="date-input"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select available date
        </label>
        <input
          id="date-input"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]} // no past dates
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !selectedDate || selectedDate === currentSavedDate}
        className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors
          ${
            saving || !selectedDate || selectedDate === currentSavedDate
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          }`}
      >
        {saving
          ? "Saving..."
          : selectedDate === currentSavedDate
            ? "Already saved"
            : "Save Availability"}
      </button>

      <p className="mt-4 text-xs text-gray-500 text-center">
        This date will be used for scheduling and client visibility.
      </p>
    </div>
  );
}