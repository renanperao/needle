import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Needle — Focus on what matters",
  description: "Gestão de demandas rápida e sem fricção.",
  icons: { icon: "/brand/fav-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
