import React from "react";
import { createRoot } from "react-dom/client";
import WorldApp from "../src/frontend/WorldApp";
import { NarrationProvider } from "../src/frontend/NarrationContext";

const root = createRoot(document.getElementById("root")!);
root.render(
  <NarrationProvider>
    <WorldApp />
  </NarrationProvider>
);
