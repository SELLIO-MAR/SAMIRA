/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette "académique" : encre navy + or, sur fond neutre froid.
        ink: {
          DEFAULT: "#1E2A44",
          50: "#F3F5F9",
          100: "#E4E8F0",
          200: "#C7CEDD",
          400: "#5B6B8C",
          600: "#334166",
          900: "#1E2A44",
        },
        gold: {
          DEFAULT: "#C08A2E",
          50: "#FBF3E4",
          100: "#F3E1BC",
          400: "#D3A250",
          600: "#A5721F",
        },
        canvas: "#F7F8FA",
        line: "#E3E6EC",
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30, 42, 68, 0.06), 0 1px 1px rgba(30, 42, 68, 0.04)",
      },
    },
  },
  plugins: [],
};
