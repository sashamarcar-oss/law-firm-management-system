// types.ts
import { Timestamp } from "firebase/firestore";
export type Lawyer = {
  uid: string;
  email: string;
  displayName: string | null;
  barNumber: string;
  phone: string | null;
  accessLevel: "View" | "Edit" | "Admin";
  createdAt: Timestamp | null;
};