// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
  type Functions,
} from "firebase/functions";

// ────────────────────────────────────────────────
// Firebase Configuration
// ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDTAoSRiDN-ZHZxk-vXjPBXroHwSfravDI",
  authDomain: "law-firm-management-syst-4b1d2.firebaseapp.com",
  projectId: "law-firm-management-syst-4b1d2",
  storageBucket: "law-firm-management-syst-4b1d2.firebasestorage.app",
  messagingSenderId: "884770792103",
  appId: "1:884770792103:web:af6cb4b5562d311ea03182",
};

// ────────────────────────────────────────────────
// Initialize Firebase App
// ────────────────────────────────────────────────
export const app = initializeApp(firebaseConfig);

// ────────────────────────────────────────────────
// Authentication
// ────────────────────────────────────────────────
export const auth = getAuth(app);

// Keep user logged in across sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ────────────────────────────────────────────────
// Firestore Database
// ────────────────────────────────────────────────
export const db: Firestore = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn(
      "Multiple tabs open, Firestore persistence can only be enabled in one tab."
    );
  } else if (err.code === "unimplemented") {
    console.warn(
      "This browser does not support all Firestore features for offline persistence."
    );
  } else {
    console.warn("Firestore persistence error:", err);
  }
});

// ────────────────────────────────────────────────
// Storage (Documents / Images)
// ────────────────────────────────────────────────
export const storage: FirebaseStorage = getStorage(app);

// ────────────────────────────────────────────────
// Cloud Functions
// ────────────────────────────────────────────────
export const functions: Functions = getFunctions(app);

// ✅ Connect to local emulator (only if running locally)
if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// ✅ Export httpsCallable for onCall functions
export { httpsCallable };