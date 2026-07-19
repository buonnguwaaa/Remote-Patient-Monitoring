import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/config";
import App from "./App.tsx";
import { LanguageProvider } from "./context/LanguageContext";

// Request geolocation on startup and cache in sessionStorage
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      sessionStorage.setItem("user_lat", position.coords.latitude.toString());
      sessionStorage.setItem("user_lng", position.coords.longitude.toString());
    },
    (error) => {
      console.warn("Geolocation permission or error:", error);
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
