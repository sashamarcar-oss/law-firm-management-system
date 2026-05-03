"use client";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import React from "react";
import { useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LogoutScreen from "./components/LogoutScreen";

import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Testimonials from "./components/Testimonials";
import WhyChooseUs from "./components/WhyChooseUs";
import Contact from "./components/Contact";
import PageTransition from "./components/PageTransition";
import LawyerAI from "./components/LawyerAI";


import MessagePage from "./components/messagingPage";
import AppointmentPage from "./components/AppointmentsPage";
import Cases from "./components/LawyerCase";

import ForgotPassword from "./pages/Auth/ForgotPassword";
import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/Signup";

import RoleRedirect from "./components/RoleRedirect";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin Pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminAuditLogs from "./pages/Admin/AdminAuditLogs";
import AdminClientPayment from "./pages/Admin/AdminClientPayment";
import AdminProfile from "./pages/Admin/AdminProfile";
import ManageUsers from "./pages/Admin/ManageUsers";
import ManageDashboardCases from "./pages/Admin/ManageDashboardCases";
import AdminMessages from "./pages/Admin/AdminMessages";
import AdminConsultations from "./pages/Admin/AdminConsultations";
import ReportsAnalytics from "./pages/Admin/ReportsAnalytics";
import Appointments from "./pages/Admin/Appointments";
import AdminFeedback from "./pages/Admin/AdminFeedback";

// Client Pages
import ClientDashboard from "./pages/Client/ClientDashboard";
import ClientProfile from "./pages/Client/ClientProfile";
import BookAppointment from "./pages/Client/BookAppointment";      // ← Added
import BookConsultationPage from "./pages/Client/book-consultation";

import PaystackPayment from "./pages/Client/PaystackPayment";


// Lawyer Pages
import LawyerDashboard from "./pages/Lawyer/LawyerDashboard";
import ManageCases from "./pages/Lawyer/ManageCases";
import Availability from "./pages/Lawyer/Availability";
import LawyerProfile from "./pages/Lawyer/LawyerProfile";
import CaseDetails from "./components/CaseDetails";

// ───────── Layout ─────────
const WebsiteLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const hideNavbarRoutes = [
    "/client/book-appointment",
    "/client/profile",
    "/client/paystack-payment",
    "/client/paystack",
    "/client/payment",
    "/my-appointments",           // Hide navbar on My Appointments if you want
  ];

  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <main>{children}</main>
      {!shouldHideNavbar && <Footer />}
    </>
  );
};

// ───────── Pages ─────────
const HomePage = () => (
  <>
    <Hero />
    <About />
    <Services />
    <Testimonials />
    <WhyChooseUs />
    <Contact />
  </>
);


// ───────── App ─────────
function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading application...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={
            <PageTransition>
              <WebsiteLayout>
                <HomePage />
              </WebsiteLayout>
            </PageTransition>
          }
        />

        {/* AI Assistant */}
        <Route
          path="/ai-assistant"
          element={
            <PageTransition>
              <WebsiteLayout>
                <LawyerAI />
              </WebsiteLayout>
            </PageTransition>
          }
        />

        {/* AUTH ROUTES */}
        <Route path="/login" element={!currentUser ? <Login /> : <RoleRedirect />} />
        <Route path="/signup" element={!currentUser ? <SignUp /> : <RoleRedirect />} />
        <Route path="/forgot-password" element={!currentUser ? <ForgotPassword /> : <RoleRedirect />} />

        <Route path="/logout" element={<LogoutScreen />} />
        <Route path="/dashboard" element={<RoleRedirect />} />

        {/* PUBLIC */}
        <Route
          path="/client/book-consultation"
          element={
            <PageTransition>
              <WebsiteLayout>
                <BookConsultationPage />
              </WebsiteLayout>
            </PageTransition>
          }
        />

       {/* CLIENT ROUTES */}
        <Route
          path="/client/dashboard"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["client"]}>
                <ClientDashboard />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/client/profile"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["client"]}>
                <ClientProfile />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/client/book-appointment"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["client"]}>
                <BookAppointment />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/client/paystack-payment"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["client"]}>
                <PaystackPayment />
              </ProtectedRoute>
            </PageTransition>
          }
        />

    
        <Route
          path="/client/messages"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["client"]}>
                <MessagePage />
              </ProtectedRoute>
            </PageTransition>
          }
        />

        {/* ADMIN ROUTES */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAuditLogs /></ProtectedRoute>} />
        <Route path="/admin/client-payments/:clientUid?" element={<ProtectedRoute allowedRoles={["admin"]}><AdminClientPayment /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={["admin"]}><AdminProfile /></ProtectedRoute>} />
        <Route path="/admin/manage-users" element={<ProtectedRoute allowedRoles={["admin"]}><ManageUsers /></ProtectedRoute>} />
        <Route path="/admin/consultations" element={<ProtectedRoute allowedRoles={["admin"]}><AdminConsultations /></ProtectedRoute>} />
        <Route path="/admin/assign-cases" element={<ProtectedRoute allowedRoles={["admin"]}><ManageDashboardCases /></ProtectedRoute>} />
        <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMessages /></ProtectedRoute>} />
<Route path="/admin/viewconversations" element={<ProtectedRoute allowedRoles={["admin"]}><MessagePage /></ProtectedRoute>} />
<Route path="/admin/reports-and-analytics" element={<ReportsAnalytics />} />
        <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={["admin"]}><Appointments /></ProtectedRoute>} />
       
       <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFeedback /></ProtectedRoute>} />
        {/* LAWYER ROUTES */}
        <Route path="/lawyer/dashboard" element={<ProtectedRoute allowedRoles={["lawyer"]}><LawyerDashboard /></ProtectedRoute>} />
        <Route path="/lawyer/cases" element={<ProtectedRoute allowedRoles={["lawyer"]}><ManageCases /></ProtectedRoute>} />
        <Route path="/lawyer/case" element={<ProtectedRoute allowedRoles={["lawyer"]}><Cases /></ProtectedRoute>} />
        <Route path="/lawyer/appointments" element={<ProtectedRoute allowedRoles={["lawyer"]}><AppointmentPage /></ProtectedRoute>} />
        <Route path="/lawyer/availability" element={<ProtectedRoute allowedRoles={["lawyer"]}><Availability /></ProtectedRoute>} />
        <Route path="/lawyer/profile" element={<ProtectedRoute allowedRoles={["lawyer"]}><LawyerProfile /></ProtectedRoute>} />
        <Route path="/lawyer/messages" element={<ProtectedRoute allowedRoles={["lawyer"]}><MessagePage /></ProtectedRoute>} />
<Route path="/case/:id" element={<CaseDetails />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
