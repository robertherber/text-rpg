import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/frontend/App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
