import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"; 
import type { 
    DocumentData,
} from "firebase/firestore"
import { db } from "@/firebase";

type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

interface Payment {
  id: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  createdAt?: Timestamp;
  description?: string;
  transactionId?: string;
  clientUid: string;
}

interface AdminClientPaymentProps {
  clientUid?: string;   // optional – reflects real usage
}

export default function AdminClientPayment({
  clientUid,
}: AdminClientPaymentProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ── Important: no setState calls here except inside callbacks ──

    if (!clientUid) {
      // No client → no listener → just return (render will show message)
      return;
    }

    const q = query(
      collection(db, "payments"),
      where("clientUid", "==", clientUid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            amount: data.amount ?? 0,
            currency: data.currency ?? "KES",
            status: data.status as PaymentStatus,
            createdAt: data.createdAt,
            description: data.description,
            transactionId: data.transactionId,
            clientUid: data.clientUid,
          } satisfies Payment;
        });

        setPayments(fetched);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Payments listener error:", err);
        setError("Could not load payment history. Please try again.");
        setLoading(false);
      }
    );

    // Cleanup on unmount or clientUid change
    return () => unsubscribe();
  }, [clientUid]);

  // ────────────────────────────────────────────────
  // All UI decisions happen here – no setState in effect
  // ────────────────────────────────────────────────

  if (!clientUid) {
    return (
      <div className="p-8 text-center text-gray-600">
        No client selected. Please select a client to view payments.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading payment history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            // The effect will automatically restart when needed
            // because loading is just visual – no forced refetch required
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Client Payment History</h2>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-600 italic">
          No payments found for this client.
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const statusStyles: Record<PaymentStatus, string> = {
              paid: "bg-green-100 text-green-800",
              pending: "bg-yellow-100 text-yellow-800",
              failed: "bg-red-100 text-red-800",
              refunded: "bg-purple-100 text-purple-800",
            };

            return (
              <div
                key={payment.id}
                className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xl font-semibold">
                      {payment.amount.toLocaleString("en-KE")}
                    </span>
                    <span className="text-lg text-gray-600">
                      {payment.currency ?? "KES"}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusStyles[payment.status]
                    }`}
                  >
                    {payment.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {payment.createdAt
                      ? payment.createdAt
                          .toDate()
                          .toLocaleString("en-KE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                      : "—"}
                  </p>
                  {payment.description && <p>{payment.description}</p>}
                  {payment.transactionId && (
                    <p className="text-xs text-gray-500">
                      Transaction ID: <code>{payment.transactionId}</code>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}