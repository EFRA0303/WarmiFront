import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Warmi Spa | Gestión integral",
    template: "%s | Warmi Spa",
  },
  description:
    "Sistema de gestión de pacientes y tratamientos corporales de Warmi Spa.",
};

const themeScript = `
  try {
    const savedTheme = localStorage.getItem("warmi-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = savedTheme || (prefersDark ? "dark" : "light");
  } catch (_) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
