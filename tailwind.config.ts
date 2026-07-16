import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0d0c",
        panel: "#0f1311",
        line: "#202622",
        pine: "#204436",
        moss: "#78a68e",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0,0,0,.24)",
      },
    },
  },
  plugins: [],
} satisfies Config;
