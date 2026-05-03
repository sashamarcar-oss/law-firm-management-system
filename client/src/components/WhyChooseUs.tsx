import { motion } from "framer-motion";
import { fadeUp } from "@/utils/animations";

const WhyChooseUs = () => {
  const benefits = [
    "Strategic Case Planning",
    "Transparent Communication",
    "Proven Track Record",
    "Client-Centered Approach",
    "Uncompromising Integrity",
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="space-y-8"
          >
            <div>
              <div className="inline-block px-4 py-1.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-full mb-4">
                WHY CHOOSE US
              </div>
              <h2 className="text-5xl font-serif font-semibold tracking-tight text-gray-900 dark:text-white">
                Why Choose Our Firm
              </h2>
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
              We combine decades of legal expertise with strategic insight and 
              personalized service. Every case is handled with precision, 
              absolute confidentiality, and unwavering integrity.
            </p>

            {/* Benefits List */}
            <div className="space-y-5 pt-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 group"
                >
                  <div className="mt-1.5 w-6 h-6 rounded-full bg-[#d4af37] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-[17px] leading-relaxed">
                    {benefit}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Image */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800">
              <img
                src="/lawlaw.jpg"
                alt="Our Law Firm Office"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Decorative Accent */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 border-8 border-[#d4af37] rounded-3xl hidden lg:block" />
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;