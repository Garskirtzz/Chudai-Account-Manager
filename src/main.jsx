import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import RuntimeUnavailable, { ErrorBoundary } from "./components/RuntimeUnavailable";
import { adaRuntime } from "./lib/api";
import { bacaDensity, pasangDensity } from "./lib/density";
import "./styles.css";

pasangDensity(bacaDensity(), false);

function Akar() {
  const [ada, setAda] = useState(adaRuntime);
  if (!ada) return <RuntimeUnavailable onRetry={() => setAda(adaRuntime())} />;
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Akar />
  </StrictMode>
);
