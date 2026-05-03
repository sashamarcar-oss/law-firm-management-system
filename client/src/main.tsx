// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
// ─────────────────────────────
// Get root element
// ─────────────────────────────
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Root element not found. Make sure there is a <div id='root'></div> in index.html."
  );
}

// ─────────────────────────────
// Create React 18 root
// ─────────────────────────────
const root = ReactDOM.createRoot(rootElement);

// ─────────────────────────────
// Render the app
// ─────────────────────────────
root.render(
  <React.StrictMode>
    {/* AuthProvider wraps the app so useAuth() works everywhere */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);