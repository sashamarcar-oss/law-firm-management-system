"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { logger } from "@/lib/activityLogger";

interface Consultation {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: string;
  assignedLawyer?: string;
  createdAt?: any;
}

interface User {
  id: string;
  displayName: string;
  role: string;
}

export default function AdminConsultations() {
  const { isAdmin, currentUser } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [filter, setFilter] = useState("all");

  // ✅ FETCH CONSULTATIONS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "consultations"), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Consultation[];

      setConsultations(data);
    });

    return () => unsub();
  }, []);

  // ✅ FETCH LAWYERS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((user: any) => user.role === "lawyer");

      setLawyers(data as User[]);
    });

    return () => unsub();
  }, []);

  // ✅ UPDATE STATUS
  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "consultations", id), {
      status,
    });

    const consultation = consultations.find((item) => item.id === id);
    if (!consultation) return;

    if (status === "approved") {
      await logger.consultationBooked(
        consultation.name || "Client",
        consultation.assignedLawyer || "Assigned Lawyer",
        "Pending confirmation",
        currentUser?.uid || ""
      );
    }
  };

  // ✅ ASSIGN LAWYER
  const assignLawyer = async (id: string, lawyerId: string) => {
    await updateDoc(doc(db, "consultations", id), {
      assignedLawyer: lawyerId,
    });

    const consultation = consultations.find((item) => item.id === id);
    const lawyer = lawyers.find((item) => item.id === lawyerId);

    if (consultation && lawyer) {
      await logger.consultationAssigned(
        currentUser?.displayName || "Admin",
        consultation.name || "Client",
        lawyer.displayName,
        currentUser?.uid || ""
      );
    }
  };

  // ✅ FILTER
  const filtered = consultations.filter((c) =>
    filter === "all" ? true : c.status === filter
  );

  if (!isAdmin) return <p className="p-6">Unauthorized</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Consultations</h1>

      {/* FILTER */}
      <div className="mb-4">
        <select
          className="border p-2 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="p-3">Client</th>
              <th className="p-3">Message</th>
              <th className="p-3">Status</th>
              <th className="p-3">Assign Lawyer</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">

                <td className="p-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.email}</p>
                </td>

                <td className="p-3 text-sm">{c.message}</td>

                {/* STATUS BADGE */}
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      c.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>

                {/* ASSIGN LAWYER */}
                <td className="p-3">
                  <select
                    className="border p-1 rounded"
                    value={c.assignedLawyer || ""}
                    onChange={(e) =>
                      assignLawyer(c.id, e.target.value)
                    }
                  >
                    <option value="">Select Lawyer</option>
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.displayName}
                      </option>
                    ))}
                  </select>
                </td>

                {/* ACTION */}
                <td className="p-3">
                  {c.status === "pending" && (
                    <button
                      onClick={() => updateStatus(c.id, "approved")}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Approve
                    </button>
                  )}
                </td>

              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-6 text-gray-500">
                  No consultations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
