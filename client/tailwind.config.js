/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Enable dark mode using class strategy
  darkMode: "class",

  theme: {
    extend: {
      // Existing animations
      animation: {
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
        shimmer: "shimmer 1.5s linear infinite",
      },

      // Keyframes
      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },

      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },

      colors: {
        brandBlue: "#3b82f6", // Custom brand color
      },
    },
  },

  plugins: [],
};