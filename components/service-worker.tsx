"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch((error) => console.error("SW", error));
    // Registrar depois do load evita disputar banda com o primeiro render.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
