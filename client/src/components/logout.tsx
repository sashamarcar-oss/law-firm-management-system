"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const logoutUser = async () => {
      try {
        await signOut(auth);

        // Optional: clear local storage
        localStorage.removeItem("user");

        setStatus("success");

        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } catch (error) {
        console.error("Logout error:", error);
        setStatus("error");
      }
    };

    logoutUser();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-8 text-center w-[350px]">
        
        {status === "loading" && (
          <>
            <div className="animate-spin h-10 w-10 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold">Logging you out...</h2>
            <p className="text-gray-500 text-sm mt-2">
              Please wait while we securely log you out.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 text-4xl mb-3">✓</div>
            <h2 className="text-xl font-semibold">Logged out</h2>
            <p className="text-gray-500 text-sm mt-2">
              Redirecting to login...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-4xl mb-3">⚠</div>
            <h2 className="text-xl font-semibold">Logout failed</h2>
            <p className="text-gray-500 text-sm mt-2">
              Please try again.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded-lg"
            >
              Go Back
            </button>
          </>
        )}

      </div>
    </div>
  );
}