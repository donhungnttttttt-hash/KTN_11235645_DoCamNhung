import React from "react";
import { Menu } from "lucide-react";
import { AccountMenu } from "../features/auth/AccountMenu";
import { ProjectSelector } from "../features/projects/ProjectSelector";
import "../features/projects/projects.css";

export function Header({ navigate, phase, setPhase, onOpenMenu }) {
  return (
    <header className="app-header">
      <button
        className="app-mobile-menu app-header-icon"
        aria-label="Mở menu dự án"
        onClick={onOpenMenu}
      >
        <Menu size={21} />
      </button>
      <button
        className="app-header-brand"
        onClick={() => navigate("/dashboard")}
        aria-label="Tổng quan Flutter"
      >
        <span>S+</span>
        <strong>TMS</strong>
      </button>
      <div className="app-header-project" style={{ display: "flex", alignItems: "center" }}>
        <ProjectSelector />
      </div>
      <div className="app-header-details">
        <AccountMenu />
      </div>
    </header>
  );
}
