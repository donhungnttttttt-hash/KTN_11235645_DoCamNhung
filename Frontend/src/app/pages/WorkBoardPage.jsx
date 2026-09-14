import React, { useEffect, useRef, useState } from "react";
import { Plus, X, Maximize2 } from "lucide-react";
import BoardPage from "../features/work-items/BoardPage";
import IssuesPage from "../features/work-items/IssuesPage";
import {
  emptyFilters,
  matchesIssueFilters,
} from "../features/work-items/issueFilters";
import { Button, Modal } from "../features/work-items/components";
import {
  NewIssuePage,
  IssueDetailPage,
} from "../features/work-items/IssueForm";
import { useProjectData } from "../features/work-items/ProjectData";
import "../features/work-items/work-items.css";
import "../styles/work-board.css";

export function WorkBoardPage({ activeRoute, navigate }) {
  const { issues, setIssues, addIssue, updateIssue } = useProjectData();
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState({ ...emptyFilters });
  const timer = useRef(null);
  const [path, query = ""] = activeRoute.split("?");
  const params = new URLSearchParams(query);
  const statusParam = params.get("status");
  const milestoneParam = params.get("milestone");
  const keywordParam = params.get("keyword");
  const assigneeParam = params.get("assignee");
  useEffect(() => {
    if (
      statusParam !== null ||
      milestoneParam !== null ||
      keywordParam !== null ||
      assigneeParam !== null
    ) {
      setFilters({
        ...emptyFilters,
        status: statusParam ? [statusParam] : [],
        milestone: milestoneParam ? [milestoneParam] : [],
        keyword: keywordParam || "",
        assignee: assigneeParam ? [assigneeParam] : [],
      });
    }
  }, [statusParam, milestoneParam, keywordParam, assigneeParam]);
  const view =
    path === "/board/list" || params.get("view") === "list" ? "list" : "kanban";
  const baseRoute = view === "list" ? "/board/list" : "/board";
  const suffix = view === "list" ? "?view=list" : "";
  const isNew = path === "/board/new";
  const fullDetail = params.get("detail") === "full";
  const issueId = path.startsWith("/board/issue/") ? path.split("/")[3] : null;
  const issue = issues.find((item) => item.id === issueId);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    document.title = `${view === "list" ? "Danh sách công việc" : "Bảng Kanban"} · S+Flutter`;
  }, [view]);

  function notify(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4200);
  }

  function boardNavigate(route) {
    if (route === "/board/new") navigate(`/board/new${suffix}`);
    else if (route.startsWith("/board/issue/")) navigate(route + suffix);
    else navigate(baseRoute);
  }

  const detail = issue ? (
    <IssueDetailPage
      key={issue.id}
      issue={issue}
      updateIssue={updateIssue}
      navigate={boardNavigate}
      notify={notify}
    />
  ) : (
    <p>Không tìm thấy công việc này.</p>
  );
  const filteredCount = issues.filter((item) =>
    matchesIssueFilters(item, filters),
  ).length;
  const hasFilters = Object.values(filters).some((value) => value.length > 0);

  return (
    <div className="work-items dashboard-board" data-lenis-prevent>
      <header className="wb-heading">
        <div className="wb-heading-summary">
          <h1>{view === "list" ? "Danh sách công việc" : "Bảng Kanban"}</h1>
          <span className="wb-filter-count">
            {filteredCount} công việc{hasFilters ? " theo bộ lọc" : ""}
          </span>
          {hasFilters && (
            <button
              className="d-text-button"
              onClick={() => setFilters({ ...emptyFilters })}
            >
              Xóa bộ lọc chung
            </button>
          )}
        </div>
        <Button primary icon={Plus} onClick={() => boardNavigate("/board/new")}>
          Thêm công việc
        </Button>
      </header>
      <div hidden={fullDetail || view !== "kanban"}>
        <BoardPage
          issues={issues}
          updateIssues={setIssues}
          navigate={boardNavigate}
          notify={notify}
          embedded
          sharedFilters={filters}
          onFiltersChange={setFilters}
        />
      </div>
      <div hidden={fullDetail || view !== "list"}>
        <IssuesPage
          embedded
          issues={issues}
          updateIssues={setIssues}
          navigate={boardNavigate}
          notify={notify}
          params={params}
          sharedFilters={filters}
          onFiltersChange={setFilters}
        />
      </div>
      {fullDetail && issueId && <div className="wb-full-detail">{detail}</div>}
      {(isNew || (issueId && !fullDetail)) && (
        <Modal
          title={isNew ? "Thêm công việc" : "Chi tiết công việc"}
          wide
          drawer={!isNew}
          onClose={() => navigate(baseRoute)}
        >
          {!isNew && (
            <div className="wb-detail-actions">
              <Button
                icon={Maximize2}
                onClick={() => navigate(`${path}?view=${view}&detail=full`)}
              >
                Mở trang chi tiết
              </Button>
            </div>
          )}
          {isNew ? (
            <NewIssuePage
              issues={issues}
              navigate={boardNavigate}
              addIssue={(values) => {
                const id = addIssue(values);
                notify(`Đã tạo ${id}.`);
                return id;
              }}
            />
          ) : (
            detail
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
