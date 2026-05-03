"use client";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/firebase";

export interface UnifiedActivityItem {
  id: string;
  source: "auditLogs" | "activities";
  action: string;
  performedBy: string;
  performedByUid: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details: string;
  message: string;
  type?: string;
  timestamp: Timestamp | Date | string | null;
}

const toMillis = (value: Timestamp | Date | string | null | undefined) => {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const titleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "System";

const normalizeAuditLog = (id: string, data: Record<string, any>): UnifiedActivityItem => ({
  id: `audit-${id}`,
  source: "auditLogs",
  action: data.action || "Audit Activity",
  performedBy: data.performedBy || "System",
  performedByUid: data.performedByUid || "",
  targetType: data.targetType || titleCase(data.type || "system"),
  targetId: data.targetId || data.relatedId || undefined,
  targetName: data.targetName || undefined,
  details: data.details || data.message || data.action || "Activity recorded",
  message: data.message || data.details || data.action || "Activity recorded",
  type: data.type || undefined,
  timestamp: data.timestamp || null,
});

const normalizeActivity = (id: string, data: Record<string, any>): UnifiedActivityItem => ({
  id: `activity-${id}`,
  source: "activities",
  action: data.action || `${titleCase(data.type || "system")} Activity`,
  performedBy: data.performedBy || "System",
  performedByUid: data.performedByUid || "",
  targetType: data.targetType || titleCase(data.type || "system"),
  targetId: data.relatedId || undefined,
  targetName: data.targetName || undefined,
  details: data.details || data.message || "Activity recorded",
  message: data.message || data.details || "Activity recorded",
  type: data.type || undefined,
  timestamp: data.timestamp || null,
});

export function subscribeToUnifiedActivityFeed(
  maxItems: number,
  onUpdate: (items: UnifiedActivityItem[]) => void,
  onError?: (error: unknown) => void
) {
  let auditItems: UnifiedActivityItem[] = [];
  let activityItems: UnifiedActivityItem[] = [];

  const publish = () => {
    const merged = [...auditItems, ...activityItems]
      .sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
      .filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.action === item.action &&
              candidate.message === item.message &&
              candidate.performedBy === item.performedBy &&
              Math.abs(toMillis(candidate.timestamp) - toMillis(item.timestamp)) < 1000
          ) === index
      )
      .slice(0, maxItems);

    onUpdate(merged);
  };

  const unsubscribeAuditLogs = onSnapshot(
    query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(maxItems)),
    (snapshot) => {
      auditItems = snapshot.docs.map((entry) =>
        normalizeAuditLog(entry.id, entry.data() as Record<string, any>)
      );
      publish();
    },
    (error) => onError?.(error)
  );

  const unsubscribeActivities = onSnapshot(
    query(collection(db, "activities"), orderBy("timestamp", "desc"), limit(maxItems)),
    (snapshot) => {
      activityItems = snapshot.docs.map((entry) =>
        normalizeActivity(entry.id, entry.data() as Record<string, any>)
      );
      publish();
    },
    (error) => onError?.(error)
  );

  return () => {
    unsubscribeAuditLogs();
    unsubscribeActivities();
  };
}
