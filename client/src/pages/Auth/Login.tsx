"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import RoleRedirect from "@/components/RoleRedirect";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { currentUser, loading, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600 text-lg animate-pulse">
        Loading application...
      </div>
    );
  }

  // ================= REDIRECT IF LOGGED IN =================
  if (currentUser) return <RoleRedirect />;

  // ================= EMAIL LOGIN =================
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);

    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  // ================= GOOGLE LOGIN =================
  const handleGoogleLogin = async () => {
    setError("");
    setLoggingIn(true);

    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: user.displayName || "Google User",
          email: user.email,
          role: "client",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-50 to-blue-200 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md animate-fadeIn">

        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Welcome Back
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Login to your Law Firm account
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <p className="bg-red-100 text-red-700 p-2 rounded mb-4 text-center text-sm">
            {error}
          </p>
        )}

        {/* FORM */}
        <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-5">

          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loggingIn ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* GOOGLE */}
        <div className="mt-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loggingIn}
            className="w-full flex items-center justify-center border border-gray-300 py-2.5 sm:py-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            <img src="/google-logo.png" alt="Google" className="w-5 h-5 mr-2" />
            {loggingIn ? "Please wait..." : "Login with Google"}
          </button>
        </div>

        {/* 🔥 FIXED NAVIGATION LINKS */}
        <div className="flex flex-col sm:flex-row justify-between mt-5 text-sm text-gray-500 gap-2 sm:gap-0">

          <button
            onClick={() => navigate("/forgot-password")}
            className="hover:text-blue-600 transition text-left sm:text-left"
          >
            Forgot Password?
          </button>

          <button
            onClick={() => navigate("/signup")}
            className="hover:text-blue-600 transition text-left sm:text-right"
          >
            Create Account
          </button>

        </div>

        {/* FOOTER */}
        <div className="mt-6 text-center text-gray-400 text-xs">
          ©️ {new Date().getFullYear()} Albert Smith Law Firm
        </div>
      </div>
    </div>
  );
}