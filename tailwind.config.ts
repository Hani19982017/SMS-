import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        // خط عربي مميز (Tajawal للعناوين، Cairo للنص) يُحمَّل في globals.css
        sans: ["Cairo", "Tajawal", "system-ui", "sans-serif"],
        display: ["Tajawal", "Cairo", "sans-serif"],
      },
      colors: {
        // لوحة ألوان: أخضر واتساب راقٍ + كحلي عميق
        brand: {
          50: "#e9f7ef",
          100: "#c8ebd6",
          500: "#1f8f5f",
          600: "#147a4f",
          700: "#0e5f3e",
        },
        ink: {
          800: "#172033",
          900: "#0e1626",
        },
        sand: "#f6f4ef",
      },
      boxShadow: {
        card: "0 1px 3px rgba(14,22,38,0.06), 0 8px 24px rgba(14,22,38,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
