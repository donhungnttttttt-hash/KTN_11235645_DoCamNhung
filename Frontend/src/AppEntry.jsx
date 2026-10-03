import React from "react";
import App from "./App";
import { ProjectDataProvider } from "./app/features/work-items/ProjectData";
import { AuthProvider } from "./app/features/auth/AuthProvider";
import { AuthBoundary } from "./app/features/auth/AuthBoundary";
import { ProjectProvider } from "./app/features/projects/ProjectProvider";

export default function AppEntry() {
  return (
    <AuthProvider>
      <AuthBoundary>
        <ProjectProvider>
          <ProjectDataProvider>
            <App />
          </ProjectDataProvider>
        </ProjectProvider>
      </AuthBoundary>
    </AuthProvider>
  );
}
