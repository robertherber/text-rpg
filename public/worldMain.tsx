import React from "react";
import { createRoot } from "react-dom/client";
import WorldApp from "../src/frontend/WorldApp";

const root = createRoot(document.getElementById("root")!);
root.render(<WorldApp />);
