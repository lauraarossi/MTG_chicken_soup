import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
