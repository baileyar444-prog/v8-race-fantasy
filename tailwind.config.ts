import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        track: {
          black: "#070a10",
          panel: "#111827",
          orange: "#ff7a00",
          amber: "#ff9f1c",
          red: "#ff7a00",
          muted: "#a8b5c9"
        }
      },
      boxShadow: {
        glow: "0 22px 90px rgba(255, 122, 0, 0.24), 0 8px 34px rgba(255, 159, 28, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
