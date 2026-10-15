import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getPublicCompanyIdentity } from "@/lib/public-company";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanyIdentity();
  return {
    title: {
      default: `${company.name} | Gestión integral`,
      template: `%s | ${company.name}`,
    },
    description: company.shortDescription,
  };
}

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
