"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import toast from "react-hot-toast";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CaseDetail extends Record<string, any> {
  id: string;
  title?: string;
  clientName?: string;
  status?: string;
  description?: string;
  deadline?: any;
  fee?: number;
  totalAmount?: number;
  lawyerId?: string;
}

export default function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error("Case ID is missing");
      navigate("/lawyer/dashboard");
      return;
    }

    const caseRef = doc(db, "cases", id);

    const unsub = onSnapshot(caseRef, (docSnap) => {
      if (docSnap.exists()) {
        setCaseData({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error("Case not found");
        navigate("/lawyer/dashboard");
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Failed to load case details");
      setLoading(false);
    });

    return () => unsub();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a2540] text-white">
        <p className="text-xl">Loading case details...</p>
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="min-h-screen bg-[#0a2540] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/lawyer/dashboard")}
          className="flex items-center gap-2 text-[#c9a66b] hover:text-white mb-8"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <Card className="bg-[#132f52] border border-[#1e3a5f] rounded-3xl">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold flex items-center gap-3">
              {caseData.title || "Untitled Case"}
              <span className={`ml-auto px-4 py-1 text-sm rounded-full ${caseData.status?.toLowerCase() === "in-progress" ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"}`}>
                {caseData.status || "Pending"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <User className="w-6 h-6 text-[#c9a66b]" />
                <div>
                  <p className="text-sm text-gray-400">Client</p>
                  <p className="font-medium">{caseData.clientName || "Not specified"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-[#c9a66b]" />
                <div>
                  <p className="text-sm text-gray-400">Deadline</p>
                  <p className="font-medium">{caseData.deadline ? new Date(caseData.deadline.toDate()).toLocaleDateString() : "No deadline"}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Case Description
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {caseData.description || "No description provided for this case."}
              </p>
            </div>

            <div className="pt-6 border-t border-[#1e3a5f]">
              <p className="text-sm text-gray-400">Total Fee</p>
              <p className="text-4xl font-semibold text-[#c9a66b]">
                KES {(caseData.fee || caseData.totalAmount || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
