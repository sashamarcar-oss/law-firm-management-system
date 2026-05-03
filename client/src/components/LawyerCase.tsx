"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  type DocumentData
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

interface Case {
  id: string;
  title: string;
  description?: string;
  status: string;
  clientId?: string;
  clientName?: string;
  appointmentId?: string;
  type?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Appointment {
  id: string;
  clientName?: string;
}

export default function Cases() {
  const { firebaseUser } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState("");

  const [loading, setLoading] = useState(true);

  // ─────────────────────────────
  // FETCH DATA
  // ─────────────────────────────
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const casesQ = query(
      collection(db, "cases"),
      where("lawyerId", "==", firebaseUser.uid)
    );

    const unsubCases = onSnapshot(casesQ, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as DocumentData),
      })) as Case[];

      setCases(data);
      setLoading(false);
    });

    const clientsQ = query(collection(db, "users"), where("role", "==", "client"));
    const unsubClients = onSnapshot(clientsQ, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as DocumentData),
      })) as Client[];

      setClients(data);
    });

    const apptQ = query(
      collection(db, "appointments"),
      where("lawyerId", "==", firebaseUser.uid)
    );

    const unsubAppt = onSnapshot(apptQ, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as DocumentData),
      })) as Appointment[];

      setAppointments(data);
    });

    return () => {
      unsubCases();
      unsubClients();
      unsubAppt();
    };
  }, [firebaseUser?.uid]);

  // ─────────────────────────────
  // CREATE CASE
  // ─────────────────────────────
  const createCase = async (e: any) => {
    e.preventDefault();

    if (!title) {
      alert("Title is required");
      return;
    }

    try {
      const client = clients.find((c) => c.id === selectedClient);

      await addDoc(collection(db, "cases"), {
        title,
        description,
        status: "open",
        lawyerId: firebaseUser?.uid,
        clientId: selectedClient || null,
        clientName: client?.name || "",
        appointmentId: selectedAppointment || null,
        type: "manual",
        createdAt: new Date(),
      });

      // reset form
      setTitle("");
      setDescription("");
      setSelectedClient("");
      setSelectedAppointment("");

    } catch (err) {
      console.error(err);
      alert("Failed to create case");
    }
  };

  if (loading) return <p>Loading cases...</p>;

  return (
    <div className="space-y-6">
      
      {/* 🔥 CREATE CASE FORM */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-3">Create Case</h2>

        <form onSubmit={createCase} className="grid gap-3">

          <input
            type="text"
            placeholder="Case title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded"
          />

          <textarea
            placeholder="Case description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 rounded"
          />

          {/* Client dropdown */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>

          {/* Appointment dropdown */}
          <select
            value={selectedAppointment}
            onChange={(e) => setSelectedAppointment(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Link Appointment (optional)</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.clientName || "Appointment"} - {a.id}
              </option>
            ))}
          </select>

          <button className="bg-orange-600 text-white py-2 rounded">
            Create Case
          </button>
        </form>
      </div>

      {/* 📄 CASE LIST */}
      <div>
        <h2 className="text-xl font-bold mb-3">All Cases</h2>

        {cases.length === 0 ? (
          <p className="text-gray-500">No cases yet</p>
        ) : (
          <div className="grid gap-4">
            {cases.map((c) => (
              <div key={c.id} className="border p-4 rounded bg-white shadow-sm">

                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{c.title}</h3>

                  <select
                    value={c.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      await updateDoc(doc(db, "cases", c.id), {
                        status: newStatus,
                      });
                    }}
                    className="border p-1 rounded text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <p className="text-sm text-gray-600 mt-1">{c.description}</p>

                <p className="text-xs text-gray-400 mt-2">
                  Client: {c.clientName || "N/A"}
                </p>

                {c.appointmentId && (
                  <p className="text-xs text-gray-400">
                    Appointment: {c.appointmentId}
                  </p>
                )}

                <p className="text-xs text-gray-300 mt-1">
                  Type: {c.type || "auto"}
                </p>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}