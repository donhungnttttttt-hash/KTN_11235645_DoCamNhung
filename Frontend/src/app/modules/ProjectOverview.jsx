import React, { useEffect, useRef, useState } from "react";
import { Plus, Maximize2, X } from "lucide-react";
import HomePage from "../features/work-items/HomePage";
import { Button, Modal } from "../features/work-items/components";
import {
  IssueDetailPage,
  NewIssuePage,
} from "../features/work-items/IssueForm";
import { useProjectData } from "../features/work-items/ProjectData";
import "../features/work-items/work-items.css";
import "../styles/work-board.css";
import "../styles/project-overview.css";

export function ProjectOverview({ activeRoute, navigate }) {
  const { issues, activities, addIssue, updateIssue } = useProjectData();
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const isNew = activeRoute === "/dashboard/new";
  const issueId = activeRoute.startsWith("/dashboard/issue/")
    ? activeRoute.split("/")[3]
    : null;
  const issue = issues.find((item) => item.id === issueId);
  useEffect(() => () => clearTimeout(timer.current), []);
  function notify(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4200);
  }
  function overviewNavigate(route) {
    if (route.startsWith("/board/issue/"))
      navigate(route.replace("/board/issue/", "/dashboard/issue/"));
    else if (route.startsWith("/board/list?")) navigate(route);
    else navigate("/dashboard");
  }
  return (
    <div
      className="work-items dashboard-board project-overview"
      data-lenis-prevent
    >
      <header className="wb-heading">
        <div>
          <h1>Tổng quan dự án</h1>
          <p className="overview-subtitle">
            Theo dõi hoạt động, công việc và tiến độ phát hành của S+Flutter.
          </p>
        </div>
        <Button primary icon={Plus} onClick={() => navigate("/dashboard/new")}>
          Thêm công việc
        </Button>
      </header>
      <HomePage
        issues={issues}
        activities={activities}
        navigate={overviewNavigate}
        notify={notify}
      />
      {(isNew || issueId) && (
        <Modal
          title={isNew ? "Thêm công việc" : "Chi tiết công việc"}
          wide
          drawer={!isNew}
          onClose={() => navigate("/dashboard")}
        >
          {isNew ? (
            <NewIssuePage
              issues={issues}
              navigate={overviewNavigate}
              addIssue={(values) => {
                const id = addIssue(values);
                notify(`Đã tạo ${id}.`);
                return id;
              }}
            />
          ) : issue ? (
            <>
              <div className="wb-detail-actions">
                <Button
                  icon={Maximize2}
                  onClick={() =>
                    navigate(`/board/issue/${issue.id}?detail=full&view=list`)
                  }
                >
                  Mở trang chi tiết
                </Button>
              </div>
              <IssueDetailPage
                key={issue.id}
                issue={issue}
                updateIssue={updateIssue}
                navigate={overviewNavigate}
                notify={notify}
                backLabel="Quay lại tổng quan"
              />
            </>
          ) : (
            <p>Không tìm thấy công việc này.</p>
          )}
        </Modal>
      )}
      {toast && (
        <div className="d-toast" role="status">
          {toast}
          <button aria-label="Đóng thông báo" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
