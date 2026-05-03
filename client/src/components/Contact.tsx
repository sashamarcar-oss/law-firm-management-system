import { motion } from "framer-motion";
import { fadeUp } from "../utils/animations";
import { useState } from "react";
import { db } from "@/firebase"; // ← Update this path to your firebase config
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface FormData {
  fullName: string;
  email: string;
  message: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await addDoc(collection(db, "messages"), {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        message: formData.message.trim(),
        timestamp: serverTimestamp(),
        status: "new", // Helpful for your admin dashboard
        source: "website_contact",
      });

      setSuccess(true);
      setFormData({ fullName: "", email: "", message: "" }); // Reset form

      // Auto hide success message after 6 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 6000);
    } catch (err) {
      console.error("Firestore error:", err);
      setError("Failed to send message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      id="contact"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="py-20 px-6 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-gray-900 heading-font">
            Get In Touch
          </h2>

          <p className="mt-4 text-gray-700">
            Fill out the form below or find us at our Nairobi office.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />

            <textarea
              name="message"
              placeholder="Your Message"
              value={formData.message}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-[#d4af37] text-white px-8 py-3 rounded-lg hover:bg-yellow-600 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>

          {/* Success Message */}
          {success && (
            <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg font-medium">
              ✅ Message sent successfully! We will get in touch with you shortly.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </motion.div>

        {/* Google Map - unchanged */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="h-96 rounded-lg overflow-hidden shadow-md"
        >
          <iframe
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15955.648307927842!2d36.798957!3d-1.259637!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f172a4e1d9d23%3A0x6c3c0f3a376ce1b3!2sWestlands%2C%20Nairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1695298212345!5m2!1sen!2sus"
          />
        </motion.div>

      </div>
    </motion.section>
  );
}