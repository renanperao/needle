import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

export const metadata: Metadata = {
  title: "Needle — Focus on what matters",
  description: "Gestão de demandas rápida e sem fricção.",
  applicationName: "Needle",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/fav-icon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Needle",
    // O conteúdo sobe atrás da barra de status; os insets são tratados no CSS.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  // O Next 15 só emite o `mobile-web-app-capable` padrão. iOS anterior ao 16.4
  // não lê o `display` do manifest e ainda depende desta tag para abrir standalone.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deixa o layout ir até as bordas para que env(safe-area-inset-*) seja aplicável.
  viewportFit: "cover",
  themeColor: "#0a0d0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
