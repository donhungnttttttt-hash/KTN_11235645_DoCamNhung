import React, { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  ListFilter,
  Plus,
  MoreHorizontal,
  ChevronDown,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  Button,
  IconButton,
  FieldSelect,
  TypeBadge,
  Modal,
} from "./components";
import { statuses as defaultStatuses, members, categories, milestones, types } from "./data";
import { emptyFilters, matchesIssueFilters } from "./issueFilters";

export default function BoardPage({
  issues,
  updateIssues,
  navigate,
  notify,
  headerActions,
  sharedFilters,
  onFiltersChange,
  embedded = false,
  hideControls = false,
  statuses = defaultStatuses,
  canTriage = false,
  onMove,
}) {
  const { user } = useAuth();
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    milestone: "",
    assignee: "",
  });
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [menu, setMenu] = useState(null);
  const [moveTo, setMoveTo] = useState("open");
  const [collapsed, setCollapsed] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("Bảng công việc của tôi");
  const visible = issues.filter((i) =>
    sharedFilters
      ? matchesIssueFilters(i, sharedFilters)
      : Object.entries(filters).every(
          ([key, value]) => !value || i[key] === value,
        ),
  );
  const isFiltered = sharedFilters
    ? Object.values(sharedFilters).some((value) => value.length > 0)
    : Object.values(filters).some(Boolean);
  function changeFilter(key, value) {
    if (onFiltersChange)
      onFiltersChange((prev) => ({ ...prev, [key]: value ? [value] : [] }));
    else setFilters((prev) => ({ ...prev, [key]: value }));
  }
  function moveIssue(id, status) {
    if (onMove) {
      setDragged(null); setDropTarget(null); setMenu(null);
      onMove(id, status);
      return;
    }
    updateIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i)),
    );
    setDragged(null);
    setDropTarget(null);
    setMenu(null);
    notify(
      `Đã chuyển ${id} sang “${statuses.find((s) => s.id === status).label}”.`,
    );
  }
  return (
    <div className="d-board-page">
      {!hideControls && <div className="d-board-heading">
        {!embedded && <h1>Bảng công việc</h1>}
        <Button
          rounded
          icon={ListFilter}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
        </Button>
        <div className="d-spacer" />
        {headerActions}
        <Button rounded icon={ListFilter} onClick={() => setSaveOpen(true)}>
          Lưu bộ lọc
        </Button>
      </div>}
      {!hideControls && showFilters && (
        <div className="d-board-filters">
          {[
            ["type", "Loại", types],
            ["category", "Danh mục", categories],
            ["milestone", "Mốc phát hành", milestones],
            ["assignee", "Người phụ trách", [...new Set([...members.map((m) => m.name), user.displayName])]],
          ].map(([key, label, options]) => (
            <FieldSelect
              key={key}
              label={label}
              options={
                sharedFilters?.[key].length > 1
                  ? [
                      {
                        id: "multiple",
                        label: `${sharedFilters[key].length} lựa chọn`,
                      },
                      ...options,
                    ]
                  : options
              }
              value={
                sharedFilters
                  ? sharedFilters[key].length > 1
                    ? "multiple"
                    : sharedFilters[key][0] || ""
                  : filters[key]
              }
              onChange={(v) => {
                if (v !== "multiple") changeFilter(key, v);
              }}
            />
          ))}
          <IconButton
            className="outlined d-self-filter"
            icon={UserRound}
            label="Chỉ hiển thị công việc của tôi"
            onClick={() => changeFilter("assignee", user.displayName)}
          />
          {isFiltered && (
            <button
              className="d-text-button d-self-filter"
              onClick={() =>
                onFiltersChange
                  ? onFiltersChange({ ...emptyFilters })
                  : setFilters({
                      type: "",
                      category: "",
                      milestone: "",
                      assignee: "",
                    })
              }
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
      <div className="d-kanban-scroll">
        <div className="d-kanban">
          {statuses.map((status) => {
            const cards = visible.filter((i) => i.status === status.id);
            return (
              <section
                key={status.id}
                aria-label={`Cột ${status.label}`}
                className={`d-kanban-column ${dropTarget === status.id ? "drop-target" : ""}`}
                onDragOver={(e) => {
                  if (!canTriage || status.terminal) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropTarget(status.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget))
                    setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canTriage || status.terminal) return;
                  const id = e.dataTransfer.getData("text/plain");
                  if (issues.some((i) => i.id === id)) moveIssue(id, status.id);
                }}
              >
                <header>
                  <i style={{ backgroundColor: status.color }} />
                  <h2 title={status.label}>{status.label}</h2>
                  <span className="d-column-count">{cards.length}</span>
                  <span className="d-spacer" />
                  {status.id === "open" && (
                    <IconButton
                      icon={Plus}
                      label="Thêm công việc chưa xử lý"
                      onClick={() => navigate("/board/new")}
                    />
                  )}
                  <IconButton
                    icon={MoreHorizontal}
                    label={`Tùy chọn cột ${status.label}`}
                    onClick={() =>
                      setCollapsed(
                        collapsed.includes(status.id)
                          ? collapsed.filter((id) => id !== status.id)
                          : [...collapsed, status.id],
                      )
                    }
                  />
                </header>
                {status.id === "progress" && (
                  <button
                    className="d-column-subheading"
                    onClick={() =>
                      setCollapsed(
                        collapsed.includes(status.id)
                          ? collapsed.filter((id) => id !== status.id)
                          : [...collapsed, status.id],
                      )
                    }
                  >
                    <ChevronDown size={16} />
                    Đang thực hiện
                  </button>
                )}
                <div className="d-kanban-cards">
                  {collapsed.includes(status.id) ? (
                    <button
                      className="d-column-expand"
                      onClick={() =>
                        setCollapsed(collapsed.filter((id) => id !== status.id))
                      }
                    >
                      Hiển thị {cards.length} công việc
                    </button>
                  ) : (
                    cards.map((issue) => (
                      <article
                        key={issue.id}
                        draggable={canTriage}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", issue.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragged(issue.id);
                        }}
                        onDragEnd={() => {
                          setDragged(null);
                          setDropTarget(null);
                        }}
                        className={`d-kanban-card ${dragged === issue.id ? "dragging" : ""}`}
                      >
                        <div className="d-card-meta">
                          <TypeBadge type={issue.type} />
                          <button
                            className="d-issue-key"
                            onClick={() =>
                              navigate(`/board/issue/${issue.id}`)
                            }
                          >
                            {issue.id}
                          </button>
                          <span className="d-spacer" />
                          {canTriage && <IconButton
                            icon={MoreHorizontal}
                            label={`Tùy chọn ${issue.id}`}
                            onClick={() => {
                              setMenu(issue);
                              setMoveTo(issue.status);
                            }}
                          />}
                        </div>
                        <button
                          className="d-card-title"
                          onClick={() => navigate(`/board/issue/${issue.id}`)}
                        >
                          {issue.title}
                        </button>
                        <Avatar name={issue.assignee} size={25} />
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {menu && (
        <Modal title={menu.id} onClose={() => setMenu(null)}>
          <p className="d-dialog-issue-title">{menu.title}</p>
          <FieldSelect
            label="Chuyển sang trạng thái"
            options={statuses.filter(status => !status.terminal)}
            value={moveTo}
            onChange={setMoveTo}
            empty={null}
          />
          <div className="d-modal-actions">
            <Button
              onClick={() => {
                navigate(`/board/issue/${menu.id}`);
                setMenu(null);
              }}
            >
              Xem chi tiết
            </Button>
            <Button primary onClick={() => moveIssue(menu.id, moveTo)}>
              Chuyển công việc
            </Button>
          </div>
        </Modal>
      )}
      {saveOpen && (
        <Modal
          title="Lưu bộ lọc bảng công việc"
          onClose={() => setSaveOpen(false)}
        >
          <label className="d-field">
            Tên bộ lọc
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="d-modal-actions">
            <Button
              primary
              disabled={!name.trim()}
              onClick={() => {
                sessionStorage.setItem(
                  `work-board-filter:${user.id}`,
                  JSON.stringify({ name, filters: sharedFilters ?? filters }),
                );
                setSaveOpen(false);
                notify(`Đã lưu bộ lọc “${name}” trong phiên làm việc.`);
              }}
            >
              Lưu
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
