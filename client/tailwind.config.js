/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Poppins",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f3fbe8",
          100: "#e4f6c9",
          200: "#cbec97",
          300: "#aede5c",
          400: "#8fd63e",
          500: "#7dc622",
          600: "#5f9e18",
          700: "#4a7d16",
          800: "#3c6217",
          900: "#345317",
        },
      },
    },
  },
  plugins: [],
};
