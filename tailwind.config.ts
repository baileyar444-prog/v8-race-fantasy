import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        track: {
          black: "#070a10",
          panel: "#111827",
          orange: "#ff7a1a",
          amber: "#ffb84d",
          red: "#ff4d4d",
          muted: "#a8b5c9"
        }
      },
      boxShadow: {
        glow: "0 22px 90px rgba(255, 122, 26, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
