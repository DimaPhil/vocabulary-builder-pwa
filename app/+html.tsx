import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const serviceWorkerRegistration = `
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      let offered = false;
      const offerUpdate = (worker) => {
        if (offered) return;
        offered = true;
        if (!window.confirm("A new Vocabulary Builder version is ready. Reload now?")) return;
        navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
        worker.postMessage({ type: "SKIP_WAITING" });
      };

      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });
    } catch (error) {
      console.error("Service worker registration failed", error);
    }
  });
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="A local-first vocabulary trainer that works offline."
        />
        <meta name="theme-color" content="#f6efe4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vocabulary" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        {process.env.NODE_ENV === "production" ? (
          <script
            dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }}
          />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
html, body, #root {
  height: 100%;
}
body {
  margin: 0;
  background: #f6efe4;
  overscroll-behavior-y: none;
}
`;
