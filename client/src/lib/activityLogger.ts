// lib/activityLogger.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: "case" | "payment" | "user" | "system" | "consultation" | "document" | "audit";
  relatedId?: string;
}

export interface ActivityData {
  message: string;
  type?: "case" | "payment" | "user" | "system" | "consultation" | "document";
  relatedId?: string;
  action?: string;
  performedBy?: string;
  performedByUid?: string;
  targetType?: string;
  targetName?: string;
  details?: string;
}

const defaultActionLabels: Record<NonNullable<ActivityData["type"]>, string> = {
  case: "Case Activity",
  payment: "Payment Activity",
  user: "User Activity",
  system: "System Activity",
  consultation: "Consultation Activity",
  document: "Document Activity",
};

/* ==================== CORE LOGGING FUNCTIONS ==================== */

export async function createNotification(data: NotificationData) {
  try {
    await addDoc(collection(db, "notifications"), {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      relatedId: data.relatedId || null,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function createActivity(data: ActivityData) {
  try {
    const activityType = data.type || "system";

    await addDoc(collection(db, "activities"), {
      message: data.message,
      type: activityType,
      relatedId: data.relatedId || null,
      action: data.action || defaultActionLabels[activityType],
      performedBy: data.performedBy || "System",
      performedByUid: data.performedByUid || "",
      targetType: data.targetType || activityType,
      targetName: data.targetName || null,
      details: data.details || data.message,
      timestamp: serverTimestamp(),
    });

    await addDoc(collection(db, "auditLogs"), {
      action: data.action || defaultActionLabels[activityType],
      performedBy: data.performedBy || "System",
      performedByUid: data.performedByUid || "",
      targetType: data.targetType || activityType,
      targetName: data.targetName || null,
      details: data.details || data.message,
      source: "activities",
      type: activityType,
      relatedId: data.relatedId || null,
      message: data.message,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create activity:", error);
  }
}

/* ==================== LOGGER OBJECT ==================== */

export const logger = {
  // === Case Related ===
  caseCreated: async (performerName: string, caseNumber: string, caseTitle: string, userId: string) => {
    const msg = `${performerName} created new case: ${caseTitle} (${caseNumber})`;
    await createActivity({
      message: msg,
      type: "case",
      action: "Case Created",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Case",
      targetName: caseTitle,
      relatedId: caseNumber,
    });
    await createNotification({ userId, title: "New Case Created", message: msg, type: "case" });
  },

  statusChanged: async (performerName: string, caseNumber: string, from: string, to: string, userId: string) => {
    const msg = `${performerName} changed ${caseNumber} status from ${from} to ${to}`;
    await createActivity({
      message: msg,
      type: "case",
      action: "Status Changed",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Case",
      targetName: caseNumber,
      relatedId: caseNumber,
    });
    await createNotification({ userId, title: "Status Changed", message: msg, type: "case" });
  },

  caseUpdated: async (performerName: string, caseNumber: string, updateDetail: string, userId: string) => {
    const msg = `${performerName} updated ${caseNumber}: ${updateDetail}`;
    await createActivity({
      message: msg,
      type: "case",
      action: "Case Updated",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Case",
      targetName: caseNumber,
      relatedId: caseNumber,
      details: updateDetail,
    });
    await createNotification({ userId, title: "Case Updated", message: msg, type: "case" });
  },

  caseAssigned: async (performerName: string, caseNumber: string, lawyerName: string, userId: string) => {
    const msg = `${performerName} assigned ${caseNumber} to ${lawyerName}`;
    await createActivity({
      message: msg,
      type: "case",
      action: "Case Assigned",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Case",
      targetName: caseNumber,
      relatedId: caseNumber,
      details: `Assigned to ${lawyerName}`,
    });
    await createNotification({ userId, title: "Case Assigned", message: msg, type: "case" });
  },

  caseDeleted: async (performerName: string, caseNumber: string, userId: string) => {
    const msg = `${performerName} deleted case ${caseNumber}`;
    await createActivity({
      message: msg,
      type: "case",
      action: "Case Deleted",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Case",
      targetName: caseNumber,
      relatedId: caseNumber,
    });
    await createNotification({ userId, title: "Case Deleted", message: msg, type: "case" });
  },

  // === Document Related ===
  documentUploaded: async (performerName: string, caseNumber: string, fileName: string, userId: string) => {
    const msg = `${performerName} uploaded "${fileName}" to ${caseNumber}`;
    await createActivity({
      message: msg,
      type: "document",
      action: "Document Uploaded",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Document",
      targetName: fileName,
      relatedId: caseNumber,
    });
    await createNotification({ userId, title: "Document Uploaded", message: msg, type: "document" });
  },

  // === Consultation Related ===
  consultationBooked: async (clientName: string, lawyerName: string, date: string, userId: string) => {
    const msg = `${clientName} booked a consultation with ${lawyerName} on ${date}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Consultation Booked",
      performedBy: clientName,
      performedByUid: userId,
      targetType: "Consultation",
      targetName: lawyerName,
      details: `Scheduled for ${date}`,
    });
    await createNotification({ userId, title: "New Consultation Booked", message: msg, type: "consultation" });
  },

  consultationCancelled: async (performerName: string, clientName: string, date: string, userId: string) => {
    const msg = `${performerName} cancelled consultation with ${clientName} on ${date}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Consultation Cancelled",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Consultation",
      targetName: clientName,
      details: `Cancelled for ${date}`,
    });
    await createNotification({ userId, title: "Consultation Cancelled", message: msg, type: "consultation" });
  },

  consultationAssigned: async (
    performerName: string,
    clientName: string,
    lawyerName: string,
    userId: string
  ) => {
    const msg = `${performerName} assigned consultation for ${clientName} to ${lawyerName}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Consultation Assigned",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Consultation",
      targetName: clientName,
      details: `Assigned to ${lawyerName}`,
    });
    await createNotification({ userId, title: "Consultation Assigned", message: msg, type: "consultation" });
  },

  appointmentBooked: async (
    performerName: string,
    lawyerName: string,
    date: string,
    time: string,
    caseType: string,
    userId: string
  ) => {
    const msg = `${performerName} booked ${caseType} appointment with ${lawyerName} on ${date} at ${time}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Appointment Booked",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Appointment",
      targetName: lawyerName,
      details: `${caseType} scheduled for ${date} at ${time}`,
    });
    await createNotification({ userId, title: "Appointment Booked", message: msg, type: "consultation" });
  },

  appointmentRescheduled: async (
    performerName: string,
    lawyerName: string,
    fromDate: string,
    fromTime: string,
    toDate: string,
    toTime: string,
    userId: string
  ) => {
    const msg = `${performerName} rescheduled appointment with ${lawyerName} from ${fromDate} at ${fromTime} to ${toDate} at ${toTime}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Appointment Rescheduled",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Appointment",
      targetName: lawyerName,
      details: `Moved from ${fromDate} ${fromTime} to ${toDate} ${toTime}`,
    });
    await createNotification({ userId, title: "Appointment Rescheduled", message: msg, type: "consultation" });
  },

  appointmentCancelled: async (
    performerName: string,
    lawyerName: string,
    date: string,
    time: string,
    userId: string
  ) => {
    const msg = `${performerName} cancelled appointment with ${lawyerName} on ${date} at ${time}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Appointment Cancelled",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Appointment",
      targetName: lawyerName,
      details: `Cancelled ${date} at ${time}`,
    });
    await createNotification({ userId, title: "Appointment Cancelled", message: msg, type: "consultation" });
  },

  appointmentStatusUpdated: async (
    performerName: string,
    clientName: string,
    status: string,
    userId: string
  ) => {
    const msg = `${performerName} marked appointment with ${clientName} as ${status}`;
    await createActivity({
      message: msg,
      type: "consultation",
      action: "Appointment Status Updated",
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Appointment",
      targetName: clientName,
      details: `Status changed to ${status}`,
    });
    await createNotification({ userId, title: "Appointment Status Updated", message: msg, type: "consultation" });
  },

  // === User / Profile Related ===
  lawyerProfileUpdated: async (lawyerName: string, userId: string) => {
    const msg = `${lawyerName} updated their profile`;
    await createActivity({
      message: msg,
      type: "user",
      action: "User Updated",
      performedBy: lawyerName,
      performedByUid: userId,
      targetType: "User",
      targetName: lawyerName,
    });
    await createNotification({ userId, title: "Profile Updated", message: msg, type: "user" });
  },

  clientProfileUpdated: async (clientName: string, userId: string) => {
    const msg = `${clientName} updated their profile`;
    await createActivity({
      message: msg,
      type: "user",
      action: "User Updated",
      performedBy: clientName,
      performedByUid: userId,
      targetType: "User",
      targetName: clientName,
    });
    await createNotification({ userId, title: "Profile Updated", message: msg, type: "user" });
  },

  availabilityUpdated: async (lawyerName: string, userId: string) => {
    const msg = `${lawyerName} updated their availability`;
    await createActivity({
      message: msg,
      type: "user",
      action: "Availability Updated",
      performedBy: lawyerName,
      performedByUid: userId,
      targetType: "Availability",
      targetName: lawyerName,
    });
    await createNotification({ userId, title: "Availability Changed", message: msg, type: "user" });
  },

  // === Payment Related ===
  paymentReceived: async (clientName: string, amount: number, caseNumber: string, userId: string) => {
    const msg = `Payment of KES ${amount.toLocaleString()} received from ${clientName} for ${caseNumber}`;
    await createActivity({
      message: msg,
      type: "payment",
      action: "Payment Received",
      performedBy: clientName,
      performedByUid: userId,
      targetType: "Payment",
      targetName: caseNumber,
      relatedId: caseNumber,
    });
    await createNotification({ userId, title: "Payment Received", message: msg, type: "payment" });
  },

  // === Message Related ===
  messageSent: async (senderName: string, receiverName: string, userId: string) => {
    const msg = `${senderName} sent a message to ${receiverName}`;
    await createActivity({
      message: msg,
      type: "system",
      action: "Message Sent",
      performedBy: senderName,
      performedByUid: userId,
      targetType: "Message",
      targetName: receiverName,
    });
    await createNotification({ userId, title: "New Message", message: msg, type: "system" });
  },

  // === General Case Action ===
  caseAction: async (performerName: string, caseNumber: string, action: string, userId: string) => {
    const msg = `${performerName} ${action} on case ${caseNumber}`;
    await createActivity({
      message: msg,
      type: "case",
      action,
      performedBy: performerName,
      performedByUid: userId,
      targetType: "Case",
      targetName: caseNumber,
      relatedId: caseNumber,
    });
    await createNotification({ userId, title: "Case Activity", message: msg, type: "case" });
  },
};
