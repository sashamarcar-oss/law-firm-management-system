"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { AlertCircle, Clock, RefreshCw, Search, User } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  subscribeToUnifiedActivityFeed,
  type UnifiedActivityItem,
} from "@/lib/adminActivityFeed";

type AuditLog = UnifiedActivityItem;

const ACTION_COLORS: Record<string, string> = {
  "Case Created": "bg-green-100 text-green-700",
  "Case Updated": "bg-blue-100 text-blue-700",
  "Case Deleted": "bg-red-100 text-red-700",
  "User Created": "bg-emerald-100 text-emerald-700",
  "User Updated": "bg-purple-100 text-purple-700",
  "Case Assigned": "bg-amber-100 text-amber-700",
  "User Deleted": "bg-rose-100 text-rose-700",
  "Status Changed": "bg-indigo-100 text-indigo-700",
  "Payment Received": "bg-emerald-100 text-emerald-700",
  "Consultation Booked": "bg-cyan-100 text-cyan-700",
  "Consultation Cancelled": "bg-orange-100 text-orange-700",
  "Document Uploaded": "bg-sky-100 text-sky-700",
  "Message Sent": "bg-slate-100 text-slate-700",
  "Availability Updated": "bg-teal-100 text-teal-700",
};

const toMillis = (ts: Timestamp | Date | string | null) => {
  if (!ts) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDate = (ts: Timestamp | Date | string | null): string => {
  if (!ts) return "-";

  try {
    const date =
      ts instanceof Timestamp ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const splitActions = (actionStr: string): string[] => {
  if (!actionStr || typeof actionStr !== "string") return [];
  return [actionStr.trim()].filter(Boolean);
};

const splitTargets = (targetStr: string): string[] => {
  if (!targetStr || typeof targetStr !== "string") return [];
  return targetStr.split("|").map((target) => target.trim()).filter(Boolean);
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [filterTarget, setFilterTarget] = useState("All");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUnifiedActivityFeed(
      1000,
      (fetchedLogs) => {
        setLogs(fetchedLogs);
        setLoading(false);
        setRefreshing(false);
      },
      (err: any) => {
        const errorMessage =
          err?.code === "failed-precondition"
            ? "Index required. Click the link in the console to create it."
            : err?.code === "permission-denied"
              ? "Permission denied. Check Firestore rules."
              : "Failed to load audit logs.";

        console.error("Audit logs listener error:", err);
        setError(errorMessage);
        toast.error("Failed to load audit logs");
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.success("Refreshing...");
    setTimeout(() => setRefreshing(false), 800);
  };

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((log) => {
        const actions = splitActions(log.action);
        const targets = splitTargets(log.targetType);

        return (
          actions.some((action) => action.toLowerCase().includes(term)) ||
          log.performedBy?.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term) ||
          log.message?.toLowerCase().includes(term) ||
          (log.targetName && log.targetName.toLowerCase().includes(term)) ||
          targets.some((target) => target.toLowerCase().includes(term))
        );
      });
    }

    if (filterAction !== "All") {
      result = result.filter((log) => splitActions(log.action).includes(filterAction));
    }

    if (filterTarget !== "All") {
      result = result.filter((log) => splitTargets(log.targetType).includes(filterTarget));
    }

    return result.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp));
  }, [logs, searchTerm, filterAction, filterTarget]);

  const uniqueActions = useMemo(() => {
    const allActions = logs.flatMap((log) => splitActions(log.action || ""));
    return ["All", ...Array.from(new Set(allActions)).sort()];
  }, [logs]);

  const uniqueTargets = useMemo(() => {
    const allTargets = logs.flatMap((log) => splitTargets(log.targetType || ""));
    return ["All", ...Array.from(new Set(allTargets)).sort()];
  }, [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full" />
          <p className="text-gray-500">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">Audit Logs</h1>
            <p className="text-gray-500 mt-1">Track all system activities and changes in real time.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Real-time � Last 1000 activities
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search actions, users, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-500"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm min-w-[220px]"
          >
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm min-w-[180px]"
          >
            {uniqueTargets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm("");
              setFilterAction("All");
              setFilterTarget("All");
            }}
            className="px-6 py-3 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-2xl transition"
          >
            Clear Filters
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Performed By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                    {logs.length === 0
                      ? "No audit logs found yet. Perform actions to generate logs."
                      : "No matching logs found."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-teal-50/60 transition-colors">
                    <td className="px-6 py-6 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {splitActions(log.action).map((action) => (
                          <span
                            key={`${log.id}-${action}`}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[action] || "bg-gray-100 text-gray-700"}`}
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{log.performedBy || "System"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-sm text-gray-600">
                      <div>{log.targetType || "System"}</div>
                      {log.targetName ? <div className="text-gray-400 text-xs mt-1">{log.targetName}</div> : null}
                    </td>
                    <td className="px-6 py-6 text-sm text-gray-600">
                      <div>{log.details || log.message}</div>
                      <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
                        Source: {log.source}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
