import React from "react";
import ReactDOM from "react-dom/client";
import AppEntry from "./AppEntry";
import "./app/styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppEntry />
  </React.StrictMode>,
);
