import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";

export const logAudit = async (
  action: string,
  details: string,
  performedBy: string,
  performedByUid: string,
  targetType: string = "Case",
  targetName?: string
) => {
  try {
    await addDoc(collection(db, "auditLogs"), {
      action,
      performedBy,
      performedByUid,
      targetType,
      targetName,
      details,
      timestamp: serverTimestamp(),   // Important: Use server timestamp
    });
    console.log(`📝 Audit log written: ${action}`);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};