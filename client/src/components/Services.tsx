"use client";

import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import {
  FaBalanceScale,
  FaGavel,
  FaHome,
  FaBuilding,
  FaUserTie,
  FaFileContract,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext"; // âœ… IMPORT AUTH

export default function Services() {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // âœ… GET USER
  const [darkMode, setDarkMode] = useState(true);

  const services = [
    {
      title: "Criminal Defense",
      icon: <FaGavel />,
      description:
        "Strong defense against criminal charges with proven courtroom strategies.",
    },
    {
      title: "Family Law",
      icon: <FaUserTie />,
      description:
        "Expert handling of divorce, custody, and family matters with sensitivity.",
    },
    {
      title: "Corporate Law",
      icon: <FaBuilding />,
      description:
        "Business formation, contracts, compliance, and corporate governance.",
    },
    {
      title: "Real Estate Law",
      icon: <FaHome />,
      description:
        "Property transactions, leases, title disputes, and conveyancing.",
    },
    {
      title: "Immigration Law",
      icon: <FaFileContract />,
      description:
        "Visas, work permits, residency, and citizenship applications.",
    },
    {
      title: "Personal Injury",
      icon: <FaBalanceScale />,
      description:
        "Maximizing compensation for accident and injury victims.",
    },
  ];

  // âœ… HANDLE BOOKING LOGIC
  const handleBooking = (serviceTitle: string) => {
    const targetUrl = `/client/book-consultation?service=${encodeURIComponent(
      serviceTitle
    )}`;

    if (!currentUser) {
      // âŒ NOT LOGGED IN â†’ GO TO SIGNUP WITH REDIRECT
      navigate(`/signup?redirect=${encodeURIComponent(targetUrl)}`);
    } else {
      // âœ… LOGGED IN â†’ GO DIRECTLY
      navigate(targetUrl);
    }
  };

  return (
    <div
      className={
        darkMode
          ? "bg-slate-950 text-white min-h-screen"
          : "bg-slate-50 text-slate-900 min-h-screen"
      }
    >
      <Navbar />

      {/* DARK MODE TOGGLE */}
      <div className="flex justify-end px-8 pt-6">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-5 py-2 rounded-full bg-[#d4af37] hover:bg-amber-600 text-slate-900 font-medium text-sm transition-colors"
        >
          {darkMode ? "â˜€ï¸ Light Mode" : "ðŸŒ™ Dark Mode"}
        </button>
      </div>

      {/* HERO */}
      <section className="pt-16 pb-12 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold tracking-tight mb-4"
          >
            Our Practice Areas
          </motion.h1>

          <div className="w-16 h-0.5 bg-[#d4af37] mx-auto mb-6" />

          <p className="text-lg text-slate-400 max-w-md mx-auto">
            Strategic legal solutions delivered with integrity and precision.
          </p>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className={`group p-8 rounded-2xl border transition-all duration-300 ${
                  darkMode
                    ? "bg-slate-900/80 border-slate-800 hover:border-[#d4af37]/40"
                    : "bg-white border-slate-200 hover:border-[#d4af37]/40 shadow"
                }`}
              >
                {/* ICON + TITLE */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-4xl text-[#d4af37] group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold">
                    {service.title}
                  </h3>
                </div>

                {/* DESCRIPTION */}
                <p
                  className={`text-sm leading-relaxed mb-8 ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {service.description}
                </p>

                {/* âœ… BOOK BUTTON WITH AUTH CHECK */}
                <button
                  onClick={() => handleBooking(service.title)}
                  className="w-full py-3 text-sm font-medium border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-slate-950 rounded-xl transition-all duration-300"
                >
                  Book Consultation
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
