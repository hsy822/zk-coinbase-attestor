/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          coinbase: {
            blue: "#1652f0",
            light: "#e6f0ff",
          },
          zk: {
            black: "#0a0a0a",
            surface: "rgba(255,255,255,0.05)",
          }
        },
        fontFamily: {
          sans: ["Inter", "ui-sans-serif", "system-ui"],
        },
        backdropBlur: {
          xs: '2px',
        }
      },
    },
    plugins: [],
  }