import React from "react";
import App from "./App";
import { ProjectDataProvider } from "./app/features/work-items/ProjectData";

export default function AppEntry() {
  return (
    <ProjectDataProvider>
      <App />
    </ProjectDataProvider>
  );
}
