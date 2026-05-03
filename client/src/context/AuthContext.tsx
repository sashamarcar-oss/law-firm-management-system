"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { User as FirebaseUser, UserCredential } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ✅ FIXED: use relative path instead of "@/firebase"
import { auth, db } from "../firebase";

// ────────────────────────────────────────────────
// TYPES - Updated with phone support
// ────────────────────────────────────────────────
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "admin" | "lawyer" | "client";
  photoURL?: string;

  // Phone fields for M-Pesa
  phone?: string | null;        // Main field we'll use
  phoneNumber?: string | null;  // For Firebase Auth compatibility

  online?: boolean;
  lastSeen?: any;
}

export type Role = AppUser["role"];

interface AuthContextType {
  currentUser: AppUser | null;
  firebaseUser: FirebaseUser | null;

  role: Role | null;

  loading: boolean;
  error?: string;

  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName?: string,
    phone?: string          // ← New optional parameter
  ) => Promise<UserCredential>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;

  isAdmin: boolean;
  isLawyer: boolean;
  isClient: boolean;
}

// ────────────────────────────────────────────────
// CONTEXT
// ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ────────────────────────────────────────────────
// PROVIDER
// ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      setFirebaseUser(fbUser);
      setLoading(true);
      setError(undefined);

      if (!fbUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(userRef);

        let finalUser: AppUser;

        if (!snap.exists()) {
          finalUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || "User",
            role: "client",
            photoURL: fbUser.photoURL || undefined,
            phone: fbUser.phoneNumber || null,           // ← Added
            phoneNumber: fbUser.phoneNumber || null,     // ← Added
          };
        } else {
          const data = snap.data();
          const VALID_ROLES: Role[] = ["admin", "lawyer", "client"];

          const role: Role =
            data?.role && VALID_ROLES.includes(data.role)
              ? data.role
              : "client";

          finalUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName:
              fbUser.displayName ||
              data?.displayName ||
              data?.name ||
              "User",
            role,
            photoURL: fbUser.photoURL || undefined,
            phone: data?.phone || fbUser.phoneNumber || null,        // ← Added
            phoneNumber: data?.phoneNumber || fbUser.phoneNumber || null, // ← Added
            online: data?.online,
            lastSeen: data?.lastSeen,
          };
        }

        setAppUser(finalUser);

        // Update online status
        await setDoc(
          doc(db, "users", fbUser.uid),
          {
            online: true,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Auth error:", err);
        setError("Failed to load user");
        setAppUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ────────────────────────────────────────────────
  // AUTH METHODS - Updated signup
  // ────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (
    email: string,
    password: string,
    displayName?: string,
    phone?: string                    // ← New parameter
  ): Promise<UserCredential> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;

    const newUser: AppUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: displayName || fbUser.displayName || "User",
      role: "client",
      phone: phone || null,                    // ← Save phone
      phoneNumber: phone || fbUser.phoneNumber || null,
      online: true,
      lastSeen: serverTimestamp(),
    };

    await setDoc(doc(db, "users", fbUser.uid), newUser);

    setFirebaseUser(fbUser);
    setAppUser(newUser);

    return cred;
  };

  const logout = async () => {
    if (firebaseUser?.uid) {
      try {
        await setDoc(
          doc(db, "users", firebaseUser.uid),
          {
            online: false,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed to mark user offline:", err);
      }
    }

    await signOut(auth);
    setAppUser(null);
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to reset password");
    }
  };

  // ────────────────────────────────────────────────
  // ROLE FLAGS
  // ────────────────────────────────────────────────
  const isAdmin = appUser?.role === "admin";
  const isLawyer = appUser?.role === "lawyer";
  const isClient = appUser?.role === "client";

  const value = useMemo(
    () => ({
      currentUser: appUser,
      firebaseUser,
      role: appUser?.role ?? null,
      loading,
      error,
      login,
      signup,
      logout,
      forgotPassword,
      isAdmin,
      isLawyer,
      isClient,
    }),
    [appUser, firebaseUser, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}