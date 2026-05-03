"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where, type DocumentData } from "firebase/firestore";
import { Briefcase, CalendarDays, ChevronRight, FileText, UserRound } from "lucide-react";

import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";

interface CreatedCaseRecord {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  clientName?: string;
  appointmentId?: string;
  createdAt?: { toDate?: () => Date } | Date | string;
}

const formatCreatedDate = (value?: CreatedCaseRecord["createdAt"]) => {
  if (!value) return "Date unavailable";

  try {
    let date: Date;

    if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string") {
      date = new Date(value);
    } else {
      return "Date unavailable";
    }

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date unavailable";
  }
};

const getStatusTone = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "open":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "in-progress":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "closed":
      return "border-slate-300 bg-slate-200 text-slate-700";
    default:
      return "border-sky-200 bg-sky-100 text-sky-700";
  }
};

export default function CreatedCases() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CreatedCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setCases([]);
      setLoading(false);
      return;
    }

    const createdCasesQuery = query(
      collection(db, "cases"),
      where("lawyerId", "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(createdCasesQuery, (snapshot) => {
      const nextCases = snapshot.docs.map((caseDoc) => ({
        id: caseDoc.id,
        ...(caseDoc.data() as DocumentData),
      })) as CreatedCaseRecord[];

      setCases(nextCases);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef6f1_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-emerald-200/60 bg-slate-950 px-8 py-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_26%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-200">
                <Briefcase className="h-4 w-4" />
                Created Cases
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Review the cases you have created.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Open any case file you created, review status, and move into case details without returning to the dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                className="rounded-2xl bg-white text-slate-950 hover:bg-white/90"
                onClick={() => navigate("/lawyer/case")}
              >
                Create New Case
              </Button>
              <Button
                className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => navigate("/lawyer/dashboard")}
              >
                Back To Dashboard
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm">
            <p className="text-sm text-slate-500">Created Cases</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{cases.length}</p>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl">
          <div className="border-b border-slate-200/80 px-6 py-6">
            <h2 className="text-2xl font-semibold text-slate-900">Your created case files</h2>
            <p className="mt-1 text-sm text-slate-500">Only cases created under your lawyer account are shown here.</p>
          </div>

          {loading ? (
            <div className="px-6 py-20 text-center text-slate-500">Loading created cases...</div>
          ) : cases.length === 0 ? (
            <div className="px-6 py-20 text-center text-slate-500">No created cases found yet.</div>
          ) : (
            <div className="grid gap-5 p-6 lg:grid-cols-2">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl text-slate-900">
                        {caseItem.title || "Untitled case"}
                      </CardTitle>
                      <p className="mt-2 text-sm text-slate-500">{caseItem.description || "No description added yet."}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusTone(caseItem.status)}`}>
                      {caseItem.status || "open"}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        {caseItem.clientName || "Client not linked"}
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatCreatedDate(caseItem.createdAt)}
                      </p>
                      <p className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        {caseItem.appointmentId ? "Appointment linked" : "Manual case file"}
                      </p>
                    </div>

                    <Button
                      onClick={() => navigate(`/lawyer/cases/${caseItem.id}`)}
                      className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Open Case
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}