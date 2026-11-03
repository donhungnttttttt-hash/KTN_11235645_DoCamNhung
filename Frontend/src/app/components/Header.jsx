import React from "react";
import { Menu } from "lucide-react";
import { TicketNotifications } from "../features/work-items/TicketNotifications";
import { useAuth } from "../features/auth/AuthProvider";
import { AccountMenu } from "../features/auth/AccountMenu";
import { ProjectSelector } from "../features/projects/ProjectSelector";
import { useChatLauncherSlot } from "../features/ai/ChatLauncherSlot";
import "../features/projects/projects.css";

export function Header({ navigate, onOpenMenu, menuOpen = false }) {
  const registerChatSlot = useChatLauncherSlot();
  const auth=useAuth();
  const internal=auth?.status==='authenticated'&&auth.user?.roles?.some(role=>['ADMIN','PM','USER'].includes(role));
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
      <div className="app-chat-launcher-slot" ref={registerChatSlot} />
      <div className="app-header-details">
        {internal&&<TicketNotifications key={auth.user.id} navigate={navigate}/>}
        <AccountMenu />
      </div>
    </header>
  );
}
