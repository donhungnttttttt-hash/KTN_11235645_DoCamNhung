import React from "react";
import { Menu } from "lucide-react";
import { AccountMenu } from "../features/auth/AccountMenu";
import { ProjectSelector } from "../features/projects/ProjectSelector";
import "../features/projects/projects.css";

export function Header({ navigate, onOpenMenu, menuOpen = false }) {
  return (
    <header className="app-header">
      <button
        className="app-mobile-menu app-header-icon"
        aria-label="Mở menu dự án"
        aria-expanded={menuOpen}
        aria-controls="project-navigation"
        onClick={onOpenMenu}
      >
        <Menu size={21} />
      </button>
      <button
        className="app-header-brand"
        onClick={() => navigate("/dashboard")}
        aria-label="Tổng quan TMS"
      >
        <span>S+</span>
        <strong>TMS</strong>
      </button>
      <div className="app-header-project">
        <ProjectSelector />
      </div>
      <div className="app-header-details">
        <AccountMenu />
      </div>
    </header>
  );
}
