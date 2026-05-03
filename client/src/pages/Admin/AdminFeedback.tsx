"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { Download, Search, Star } from "lucide-react";

import { db } from "@/firebase";
import Button from "@/components/ui/button";

type FeedbackRecord = {
  id: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  rating?: number;
  comment?: string;
  createdAt?: Timestamp | null;
  read?: boolean;
};

const formatDate = (value?: Timestamp | null) => {
  if (!value) return "-";

  return value.toDate().toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${index < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
    />
  ));

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const feedbackQuery = query(collection(db, "feedback"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      feedbackQuery,
      (snapshot) => {
        setFeedback(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<FeedbackRecord, "id">),
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch feedback:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredFeedback = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return feedback;

    return feedback.filter((item) =>
      [item.clientName, item.clientEmail, item.comment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [feedback, search]);

  const totalFeedback = filteredFeedback.length;
  const averageRating = totalFeedback
    ? (
        filteredFeedback.reduce((sum, item) => sum + Number(item.rating ?? 0), 0) / totalFeedback
      ).toFixed(1)
    : "0.0";

  const exportFeedback = () => {
    const header = ["Client Name", "Client Email", "Rating", "Comment", "Read", "Created At"];
    const rows = filteredFeedback.map((item) => [
      item.clientName || "",
      item.clientEmail || "",
      String(item.rating ?? ""),
      `"${String(item.comment || "").replace(/"/g, '""')}"`,
      item.read ? "Yes" : "No",
      formatDate(item.createdAt),
    ]);

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "client-feedback.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const markAsRead = async (id: string) => {
    try {
      setMarkingId(id);
      await updateDoc(doc(db, "feedback", id), { read: true });
    } catch (error) {
      console.error("Failed to mark feedback as read:", error);
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading client feedback...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] px-6 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Feedback</h1>
            <p className="mt-1 text-sm text-slate-500">
              Live updates from feedback submitted by clients.
            </p>
          </div>

          <Button onClick={exportFeedback} className="rounded-2xl bg-blue-700 hover:bg-blue-800">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Feedback</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalFeedback}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Average Rating</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-3xl font-bold text-slate-900">{averageRating}</p>
              <div className="flex items-center gap-1">
                {renderStars(Math.round(Number(averageRating)))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, email, or feedback..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.1fr_1.2fr_0.9fr_2.2fr_0.8fr] gap-6 border-b border-slate-200 bg-slate-50/80 px-6 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
            <div>Submitted</div>
            <div>Client</div>
            <div>Rating</div>
            <div>Feedback</div>
            <div>Status</div>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No client feedback found.
            </div>
          ) : (
            filteredFeedback.map((item) => (
              <div
                key={item.id}
                className={`grid gap-4 border-b border-slate-100 px-6 py-6 last:border-b-0 md:grid-cols-[1.1fr_1.2fr_0.9fr_2.2fr_0.8fr] md:gap-6 ${
                  !item.read ? "bg-emerald-50/40" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:hidden">
                    Submitted
                  </p>
                  <p className="text-sm text-slate-600">{formatDate(item.createdAt)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:hidden">
                    Client
                  </p>
                  <p className="font-medium text-slate-900">{item.clientName || "Client"}</p>
                  <p className="text-sm text-slate-500">{item.clientEmail || "-"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:hidden">
                    Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">{renderStars(item.rating ?? 0)}</div>
                    <span className="text-sm font-semibold text-slate-600">{item.rating ?? 0}/5</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:hidden">
                    Feedback
                  </p>
                  <p className="text-base leading-7 text-slate-700">{item.comment || "No comment provided."}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:hidden">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                        item.read ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.read ? "Read" : "New"}
                    </span>
                    {!item.read ? (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={markingId === item.id}
                        onClick={() => void markAsRead(item.id)}
                      >
                        {markingId === item.id ? "Saving..." : "Mark Read"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}