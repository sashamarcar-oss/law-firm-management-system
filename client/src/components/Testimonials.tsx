import { motion } from "framer-motion";
import { fadeUp } from "../utils/animations";

export default function Testimonials() {
  const testimonials = [
    {
      name: "James Mwangi",
      role: "CEO, FinTech Ltd.",
      comment: "Exceptional legal service. Highly professional and responsive team.",
    },
    {
      name: "Alice Wanjiku",
      role: "Entrepreneur",
      comment: "They handled my corporate case flawlessly. Very trustworthy.",
    },
    {
      name: "David Kimani",
      role: "Property Developer",
      comment: "Strong expertise in property law. I highly recommend them.",
    },
  ];

  return (
    <motion.section
      id="testimonials"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="py-20 px-6 bg-white"
    >
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 heading-font">
          What Our Clients Say
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6 }}
              className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-lg transition"
            >
              <p className="text-gray-700 italic">“{t.comment}”</p>
              <p className="mt-4 font-semibold text-gray-900">{t.name}</p>
              <p className="text-gray-500 text-sm">{t.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}