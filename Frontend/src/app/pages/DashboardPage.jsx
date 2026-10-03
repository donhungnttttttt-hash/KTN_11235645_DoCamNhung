import React from "react";
import { TestingOverview } from "../modules/TestingOverview";
import { ProjectOverview } from "../modules/ProjectOverview";
import "../styles/project-overview.css";

export function DashboardPage({
  project,
  teamMembers,
  activeRoute = "/dashboard",
  navigate,
}) {
  const testing = activeRoute.split("?")[0] === "/dashboard/testing";
  return (
    <>
      <div hidden={testing}>
        <ProjectOverview activeRoute={activeRoute} navigate={navigate} />
      </div>
      <div hidden={!testing}>
        <TestingOverview project={project} teamMembers={teamMembers} />
      </div>
    </>
  );
}
