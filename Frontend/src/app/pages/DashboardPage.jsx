import React, { useEffect } from "react";
import { TestingOverview } from "../modules/TestingOverview";
import { ProjectOverview } from "../modules/ProjectOverview";
import "../styles/project-overview.css";

export function DashboardPage({
  project,
  teamMembers,
  activeRoute = "/dashboard",
  navigate,
}) {
  const testing = activeRoute === "/dashboard/testing";
  useEffect(() => {
    document.title = `${testing ? "Tổng quan kiểm thử" : "Tổng quan dự án"} · S+Flutter`;
  }, [testing]);
  return (
    <>
      <nav
        className="cat-container overview-tabs"
        aria-label="Chế độ tổng quan"
      >
        <button
          aria-current={!testing ? "page" : undefined}
          onClick={() => navigate("/dashboard")}
        >
          Tổng quan dự án
        </button>
        <button
          aria-current={testing ? "page" : undefined}
          onClick={() => navigate("/dashboard/testing")}
        >
          Tổng quan kiểm thử
        </button>
      </nav>
      <div hidden={testing}>
        <ProjectOverview activeRoute={activeRoute} navigate={navigate} />
      </div>
      <div hidden={!testing}>
        <TestingOverview project={project} teamMembers={teamMembers} />
      </div>
    </>
  );
}
