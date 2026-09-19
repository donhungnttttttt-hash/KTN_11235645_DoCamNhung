import React from "react";
import { Menu } from "lucide-react";

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
        <strong>Flutter</strong>
      </button>
      <div className="app-header-project">
        <span>
          Dự án: <strong>Flutter</strong>
        </span>
        <span className="app-header-divider">|</span>
        <span>
          Giai đoạn: <strong>{phase}</strong>
        </span>
      </div>
      <div className="app-header-details">
        <span className="app-expiry">
          Chế độ xem · hết hạn 01/09/2027 09:00
        </span>
        <div className="app-user-details">
          <span>SpiderPlus Co., Ltd.</span>
          <span>|</span>
          <strong>Nguyen Xuan Nguyen Giap</strong>
        </div>
        <span className="app-user-avatar" title="Nguyen Xuan Nguyen Giap">
          NG
        </span>
        <select
          className="cat-select"
          aria-label="Giai đoạn kiểm thử"
          value={phase}
          onChange={(event) => setPhase(event.target.value)}
        >
          <option>Chuẩn_iPad Merge Regression</option>
          <option>Chuẩn_Android Regression</option>
          <option>System Test Sprint 14</option>
        </select>
      </div>
    </header>
  );
}
