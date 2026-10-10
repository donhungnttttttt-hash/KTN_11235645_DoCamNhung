import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { emptyFilters, matchesIssueFilters } from "./issueFilters";
import {
  ChevronUp,
  ChevronDown,
  Link,
  ListFilter,
  SlidersHorizontal,
  SquarePen,
  Upload,
  MoreHorizontal,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  UserRound,
  Search,
  Download,
} from "lucide-react";
import {
  Avatar,
  Button,
  IconButton,
  StatusBadge,
  TypeBadge,
  FieldSelect,
  MultiSelect,
  Modal,
} from "./components";
import {
  statuses,
  members,
  categories,
  milestones,
  versions,
  types,
  closureReasons,
} from "./data";

export default function IssuesPage({
  issues,
  navigate,
  params,
  notify,
  updateIssues,
  sharedFilters,
  onFiltersChange,
  embedded = false,
}) {
  const { user } = useAuth();
  const memberNames = [...new Set([...members.map((m) => m.name), user.displayName])];
  const [advanced, setAdvanced] = useState(params.get("advanced") === "true");
  const advancedParam = params.get("advanced");
  const [localFilters, setLocalFilters] = useState(() => {
    if (params.get("saved") === "true") {
      try {
        const saved = JSON.parse(sessionStorage.getItem(`work-filter:${user.id}`));
        if (saved?.filters) return { ...emptyFilters, ...saved.filters };
      } catch {
        /* Use the default search when no valid saved filter exists. */
      }
    }
    return {
      ...emptyFilters,
      keyword: params.get("keyword") || "",
      status: params.get("status")
        ? [params.get("status")]
        : params.has("keyword")
          ? []
          : statuses.filter((s) => s.id !== "closed").map((s) => s.id),
      milestone: params.get("milestone") ? [params.get("milestone")] : [],
    };
  });
  const filters = sharedFilters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (advancedParam === "true") {
      setAdvanced(true);
      setDraft(filters);
    }
  }, [advancedParam]);
  const [tab, setTab] = useState("basic");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);
  const [sortBy, setSortBy] = useState("updated");
  const [dialog, setDialog] = useState(null);
  const [savedName, setSavedName] = useState("Công việc cần theo dõi");
  const [selected, setSelected] = useState([]);
  const [batch, setBatch] = useState(false);
  const [batchStatus, setBatchStatus] = useState("progress");
  const [compact, setCompact] = useState(false);
  const [showVersion, setShowVersion] = useState(true);
  useEffect(() => {
    if (sharedFilters) {
      setDraft(sharedFilters);
      setPage(1);
    }
  }, [sharedFilters]);
  const setFilter = (key, value, isDraft = false) => {
    (isDraft ? setDraft : setFilters)((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const filtered = useMemo(
    () =>
      issues
        .filter((i) => matchesIssueFilters(i, filters))
        .sort(
          (a, b) =>
            (sortDesc ? -1 : 1) *
            String(a[sortBy]).localeCompare(String(b[sortBy]), "vi", {
              numeric: true,
            }),
        ),
    [issues, filters, sortDesc, sortBy],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 15));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * 15, safePage * 15);
  const simpleFields = [
    ["type", "Loại", types],
    ["category", "Danh mục", categories],
    ["milestone", "Mốc phát hành", milestones],
    ["assignee", "Người phụ trách", memberNames],
  ];
  const sort = (key) => {
    setSortBy(key);
    setSortDesc(sortBy === key ? !sortDesc : false);
  };
  function exportCsv() {
    const text =
      "\ufeff" +
      [
        ["Mã", "Tiêu đề", "Trạng thái", "Người phụ trách"],
        ...filtered.map((i) => [
          i.id,
          i.title,
          statuses.find((s) => s.id === i.status).label,
          i.assignee,
        ]),
      ]
        .map((row) =>
          row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cong-viec.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setDialog(null);
  }
  return (
    <div className="d-issues-page">
      <div className="d-search-top">
        <button
          className="d-search-collapse"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          <strong>Điều kiện tìm kiếm</strong>
        </button>
        <div className="d-segmented">
          <button
            className={!advanced ? "active" : ""}
            onClick={() => setAdvanced(false)}
          >
            Tìm kiếm cơ bản
          </button>
          <button
            className={advanced ? "active" : ""}
            onClick={() => {
              setAdvanced(true);
              setDraft(filters);
            }}
          >
            Tìm kiếm nâng cao
          </button>
        </div>
        <div className="d-spacer" />
        <Button
          rounded
          icon={Link}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              notify("Đã sao chép liên kết trang.");
            } catch {
              notify(
                "Không thể truy cập bộ nhớ tạm. Bạn có thể sao chép địa chỉ trên trình duyệt.",
              );
            }
          }}
        >
          Liên kết
        </Button>
        <Button rounded icon={ListFilter} onClick={() => setDialog("save")}>
          Lưu bộ lọc
        </Button>
      </div>
      {showFilters &&
        (!advanced ? (
          <div className="d-simple-search">
            <div className="d-status-filters">
              <strong>Trạng thái:</strong>
              <button
                className={!filters.status.length ? "active" : ""}
                onClick={() => setFilter("status", [])}
              >
                Tất cả
              </button>
              {statuses.map((s) => (
                <button
                  key={s.id}
                  className={
                    filters.status.length === 1 && filters.status[0] === s.id
                      ? "active"
                      : ""
                  }
                  onClick={() => setFilter("status", [s.id])}
                >
                  {s.label}
                </button>
              ))}
              <button
                className={
                  filters.status.length === 9 &&
                  !filters.status.includes("closed")
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "status",
                    statuses.filter((s) => s.id !== "closed").map((s) => s.id),
                  )
                }
              >
                Chưa hoàn thành
              </button>
            </div>
            <div className="d-simple-fields">
              {simpleFields.map(([key, label, options]) => (
                <FieldSelect
                  key={key}
                  label={label}
                  options={
                    filters[key].length > 1
                      ? [
                          {
                            id: "multiple",
                            label: `${filters[key].length} lựa chọn`,
                          },
                          ...options,
                        ]
                      : options
                  }
                  value={
                    filters[key].length > 1 ? "multiple" : filters[key][0] || ""
                  }
                  onChange={(v) => {
                    if (v !== "multiple") setFilter(key, v ? [v] : []);
                  }}
                />
              ))}
              <IconButton
                className="outlined d-self-filter"
                icon={UserRound}
                label="Công việc của tôi"
                onClick={() => setFilter("assignee", [user.displayName])}
              />
              <label className="d-field">
                <span>Từ khóa</span>
                <input
                  placeholder="Nhập mã hoặc tiêu đề"
                  value={filters.keyword}
                  onChange={(e) => setFilter("keyword", e.target.value)}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="d-advanced-search">
            <div className="d-filter-description">
              [ Dự án ] S+Flutter{" "}
              <span>
                [ Trạng thái ]{" "}
                {filters.status.length
                  ? filters.status
                      .map((id) => statuses.find((s) => s.id === id).label)
                      .join(" / ")
                  : "Tất cả"}
              </span>
            </div>
            <div className="d-search-tabs">
              {[
                ["basic", "Cơ bản"],
                ["dates", "Ngày tháng"],
                ["other", "Khác"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="d-advanced-panel">
              {tab === "basic" ? (
                <div className="d-advanced-grid">
                  <MultiSelect
                    label="Trạng thái"
                    options={statuses}
                    selected={draft.status}
                    onChange={(v) => setFilter("status", v, true)}
                  />
                  <MultiSelect
                    label="Danh mục"
                    options={categories}
                    selected={draft.category}
                    onChange={(v) => setFilter("category", v, true)}
                  />
                  <MultiSelect
                    label="Phiên bản phát sinh"
                    options={versions}
                    selected={draft.version}
                    onChange={(v) => setFilter("version", v, true)}
                  />
                  <MultiSelect
                    label="Mốc phát hành"
                    options={milestones}
                    selected={draft.milestone}
                    onChange={(v) => setFilter("milestone", v, true)}
                  />
                  <MultiSelect
                    label="Loại"
                    options={types}
                    selected={draft.type}
                    onChange={(v) => setFilter("type", v, true)}
                  />
                  <MultiSelect
                    label="Độ ưu tiên"
                    options={["Cao", "Trung bình", "Thấp"]}
                    searchable={false}
                    selected={draft.priority}
                    onChange={(v) => setFilter("priority", v, true)}
                  />
                  <MultiSelect
                    label="Người phụ trách"
                    options={memberNames}
                    selected={draft.assignee}
                    onChange={(v) => setFilter("assignee", v, true)}
                    action={
                      <button
                        onClick={() =>
                          setFilter("assignee", [user.displayName], true)
                        }
                      >
                        Chọn tôi
                      </button>
                    }
                  />
                  <MultiSelect
                    label="Người tạo"
                    options={memberNames}
                    selected={draft.creator}
                    onChange={(v) => setFilter("creator", v, true)}
                  />
                  <MultiSelect
                    label="Lý do hoàn thành"
                    options={closureReasons}
                    selected={draft.reason}
                    onChange={(v) => setFilter("reason", v, true)}
                  />
                  <div className="d-filter-help">
                    <span>Gợi ý tìm kiếm</span>
                    <p>
                      Chọn nhiều giá trị trong mỗi danh sách để kết hợp điều
                      kiện.
                    </p>
                    <p>Bỏ chọn tất cả để tìm trong toàn bộ dự án.</p>
                  </div>
                </div>
              ) : tab === "dates" ? (
                <div className="d-date-filters">
                  <label className="d-field">
                    Ngày tạo từ
                    <input
                      type="date"
                      value={draft.start}
                      onChange={(e) => setFilter("start", e.target.value, true)}
                    />
                  </label>
                  <label className="d-field">
                    Đến ngày
                    <input
                      type="date"
                      min={draft.start}
                      value={draft.end}
                      onChange={(e) => setFilter("end", e.target.value, true)}
                    />
                  </label>
                </div>
              ) : (
                <div className="d-other-filters">
                  <MultiSelect
                    label="Người tạo"
                    options={memberNames}
                    selected={draft.creator}
                    onChange={(v) => setFilter("creator", v, true)}
                  />
                  <MultiSelect
                    label="Lý do hoàn thành"
                    options={closureReasons}
                    selected={draft.reason}
                    onChange={(v) => setFilter("reason", v, true)}
                  />
                </div>
              )}
              <label className="d-field d-advanced-keyword">
                <span>Từ khóa</span>
                <input
                  placeholder="Nhập mã hoặc tiêu đề"
                  value={draft.keyword}
                  onChange={(e) => setFilter("keyword", e.target.value, true)}
                />
              </label>
            </div>
            <div className="d-search-actions">
              <Button onClick={() => setDraft({ ...emptyFilters })}>
                Xóa điều kiện
              </Button>
              <Button
                onClick={() => {
                  setFilters(draft);
                  setPage(1);
                  notify("Đã áp dụng điều kiện tìm kiếm.");
                }}
              >
                Tìm kiếm theo điều kiện
              </Button>
            </div>
          </div>
        ))}
      <div className="d-table-toolbar">
        <div className="d-pagination">
          <span>
            {filtered.length
              ? `${(safePage - 1) * 15 + 1} – ${Math.min(safePage * 15, filtered.length)}`
              : "0"}{" "}
            trong {filtered.length} công việc
          </span>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={safePage === p ? "active" : ""}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="d-next-page"
            disabled={safePage === pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            Tiếp <ChevronRight size={14} />
          </button>
        </div>
        <div className="d-table-tools">
          {batch && selected.length > 0 && (
            <Button primary onClick={() => setDialog("batch")}>
              Đổi trạng thái ({selected.length})
            </Button>
          )}
          <Button
            rounded
            icon={SquarePen}
            onClick={() => {
              setBatch(!batch);
              setSelected([]);
            }}
          >
            {batch ? "Kết thúc chọn" : "Thao tác hàng loạt"}
          </Button>
          {!embedded && (
            <Button
              rounded
              icon={Upload}
              onClick={() => navigate("/board/new")}
            >
              Thêm công việc
            </Button>
          )}
          <Button
            rounded
            icon={SlidersHorizontal}
            onClick={() => setDialog("display")}
          >
            Hiển thị
          </Button>
          <IconButton
            className="outlined"
            icon={MoreHorizontal}
            label="Thêm thao tác danh sách"
            onClick={() => setDialog("export")}
          />
        </div>
      </div>
      <div className="d-issue-table-scroll">
        <table className={`d-issue-table ${compact ? "compact" : ""}`}>
          <thead>
            <tr>
              {batch && (
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn toàn bộ trang"
                    checked={
                      rows.length > 0 &&
                      rows.every((i) => selected.includes(i.id))
                    }
                    onChange={(e) =>
                      setSelected(e.target.checked ? rows.map((i) => i.id) : [])
                    }
                  />
                </th>
              )}
              <th>Loại</th>
              <th>
                <button onClick={() => sort("id")}>
                  Mã {sortBy === "id" && (sortDesc ? "▾" : "▴")}
                </button>
              </th>
              <th className="d-title-column">Tiêu đề</th>
              <th>Người phụ trách</th>
              <th>Trạng thái</th>
              <th>Danh mục</th>
              <th>Ưu tiên</th>
              {showVersion && <th>Phiên bản phát sinh</th>}
              <th>Mốc phát hành</th>
              <th>Ngày tạo</th>
              <th>Ngày bắt đầu</th>
              <th>Hạn xử lý</th>
              <th>Dự kiến</th>
              <th>Thực tế</th>
              <th>
                <button onClick={() => sort("updated")}>
                  Cập nhật {sortBy === "updated" && (sortDesc ? "▾" : "▴")}
                </button>
              </th>
              <th>Người tạo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                {batch && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${i.id}`}
                      checked={selected.includes(i.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, i.id]
                            : selected.filter((id) => id !== i.id),
                        )
                      }
                    />
                  </td>
                )}
                <td>
                  <TypeBadge type={i.type} />
                </td>
                <td>
                  <button
                    className="d-issue-key"
                    onClick={() => navigate(`/board/issue/${i.id}`)}
                  >
                    {i.id}
                  </button>
                </td>
                <td className="d-title-column">
                  <button onClick={() => navigate(`/board/issue/${i.id}`)}>
                    {i.title}
                  </button>
                </td>
                <td>
                  <span className="d-person">
                    <Avatar name={i.assignee} size={24} />
                    {i.assignee || "Chưa phân công"}
                  </span>
                </td>
                <td>
                  <StatusBadge id={i.status} />
                </td>
                <td>{i.category}</td>
                <td className="d-priority" title={i.priority}>
                  {i.priority === "Thấp" ? (
                    <ArrowDown color="#5aafa3" size={17} />
                  ) : i.priority === "Cao" ? (
                    <ArrowUp color="#e97443" size={17} />
                  ) : (
                    <ArrowRight color="#5185bc" size={17} />
                  )}
                </td>
                {showVersion && <td>{i.version}</td>}
                <td>{i.milestone}</td>
                <td>{i.created.replaceAll("-", "/")}</td>
                <td>{i.start.replaceAll("-", "/")}</td>
                <td>{i.due.replaceAll("-", "/")}</td>
                <td>{i.estimate}</td>
                <td>{i.actual}</td>
                <td>{i.updated.replaceAll("-", "/")}</td>
                <td>
                  <span className="d-person">
                    <Avatar name={i.creator} size={24} />
                    {i.creator}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="d-empty">
            <Search size={30} />
            <strong>Không tìm thấy công việc</strong>
            <p>Thử thay đổi từ khóa hoặc bỏ bớt điều kiện lọc.</p>
            <Button
              onClick={() => {
                setFilters({ ...emptyFilters });
                setDraft({ ...emptyFilters });
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>
      {dialog && (
        <Modal
          title={
            {
              save: "Lưu điều kiện tìm kiếm",
              display: "Cài đặt hiển thị",
              export: "Xuất danh sách",
              batch: "Cập nhật trạng thái hàng loạt",
            }[dialog]
          }
          onClose={() => setDialog(null)}
        >
          {dialog === "save" && (
            <>
              <label className="d-field">
                Tên bộ lọc
                <input
                  value={savedName}
                  onChange={(e) => setSavedName(e.target.value)}
                />
              </label>
              <div className="d-modal-actions">
                <Button
                  primary
                  disabled={!savedName.trim()}
                  onClick={() => {
                    sessionStorage.setItem(
                      `work-filter:${user.id}`,
                      JSON.stringify({ name: savedName, filters }),
                    );
                    setDialog(null);
                    notify(
                      `Đã lưu bộ lọc “${savedName}” trong phiên làm việc.`,
                    );
                  }}
                >
                  Lưu bộ lọc
                </Button>
              </div>
            </>
          )}
          {dialog === "display" && (
            <>
              <div className="d-checkbox-list">
                <label>
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(e) => setCompact(e.target.checked)}
                  />
                  Hiển thị hàng nhỏ gọn
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showVersion}
                    onChange={(e) => setShowVersion(e.target.checked)}
                  />
                  Hiển thị phiên bản phát sinh
                </label>
              </div>
              <div className="d-modal-actions">
                <Button primary onClick={() => setDialog(null)}>
                  Áp dụng
                </Button>
              </div>
            </>
          )}
          {dialog === "export" && (
            <>
              <p>
                Xuất {filtered.length} công việc đang hiển thị theo điều kiện
                tìm kiếm.
              </p>
              <div className="d-modal-actions">
                <Button icon={Download} primary onClick={exportCsv}>
                  Tải tệp CSV
                </Button>
              </div>
            </>
          )}
          {dialog === "batch" && (
            <>
              <p>Chọn trạng thái cho {selected.length} công việc.</p>
              <FieldSelect
                label="Trạng thái mới"
                options={statuses}
                value={batchStatus}
                onChange={setBatchStatus}
                empty={null}
              />
              <div className="d-modal-actions">
                <Button
                  primary
                  onClick={() => {
                    updateIssues((prev) =>
                      prev.map((i) =>
                        selected.includes(i.id)
                          ? { ...i, status: batchStatus }
                          : i,
                      ),
                    );
                    setDialog(null);
                    setSelected([]);
                    notify("Đã cập nhật trạng thái các công việc được chọn.");
                  }}
                >
                  Cập nhật
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
