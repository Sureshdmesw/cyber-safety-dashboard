/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1E2A38",
        secondary: "#2F3E4D",
        lightbg: "#F4F6F8",
        success: "#2E7D32",
        warning: "#F9A825",
        danger: "#C62828",
        info: "#1565C0",
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};