import React, { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  GitBranch,
  Plus,
  UserRound,
  CircleHelp,
  Paperclip,
  ArrowLeft,
} from "lucide-react";
import {
  Avatar,
  Button,
  IconButton,
  FieldSelect,
  StatusSelect,
  StatusBadge,
  TypeBadge,
  RichEditor,
  MarkdownView,
  Modal,
} from "./components";
import {
  members,
  milestones,
  categories,
  versions,
  types,
  closureReasons,
} from "./data";

const initialDescription =
  "## Mô tả vấn đề\nMô tả ngắn gọn hiện tượng xảy ra và chức năng bị ảnh hưởng.\n\n## Các bước tái hiện\n1. Mở ứng dụng và đăng nhập.\n2. Truy cập màn hình cần kiểm tra.\n3. Thực hiện thao tác gây ra lỗi.\n\n## Kết quả thực tế\n\n## Kết quả mong đợi\n\n## Môi trường kiểm thử\nThiết bị:\nHệ điều hành:\nPhiên bản ứng dụng:";
export function IssueProperties({ form, setForm, detail = false }) {
  const { user } = useAuth();
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const [extra, setExtra] = useState(null);
  const [extraValue, setExtraValue] = useState("");
  const [options, setOptions] = useState({
    category: categories,
    milestone: milestones,
    version: versions,
  });
  const row = (label, children, help = false) => (
    <div className="d-property-row">
      <span className="d-property-label">
        {label}
        {help && <CircleHelp size={13} />}
      </span>
      <div className="d-property-control">{children}</div>
    </div>
  );
  const select = (key, label, opts, empty = "Chưa chọn") => (
    <FieldSelect
      label={label}
      className="d-no-label"
      options={opts}
      empty={empty}
      value={form[key]}
      onChange={(v) => set(key, v)}
    />
  );
  const addOption = (key) => {
    setExtra(key);
    setExtraValue("");
  };
  return (
    <>
      <div className={`d-properties ${detail ? "detail" : ""}`}>
        <div>
          {row(
            "Trạng thái",
            <StatusSelect
              value={form.status}
              onChange={(v) => set("status", v)}
            />,
          )}
          {row(
            "Độ ưu tiên",
            select(
              "priority",
              "Độ ưu tiên",
              ["Cao", "Trung bình", "Thấp"],
              null,
            ),
          )}
          {row(
            "Danh mục",
            <>
              {select("category", "Danh mục công việc", options.category)}
              <IconButton
                className="outlined"
                icon={Plus}
                label="Thêm danh mục"
                onClick={() => addOption("category")}
              />
            </>,
          )}
          {row(
            "Ngày bắt đầu",
            <input
              aria-label="Ngày bắt đầu"
              type="date"
              value={form.start}
              onChange={(e) => set("start", e.target.value)}
            />,
          )}
          {row(
            "Thời gian dự kiến",
            <>
              <input
                aria-label="Thời gian dự kiến"
                type="number"
                min="0"
                step="0.5"
                value={form.estimate}
                onChange={(e) => set("estimate", e.target.value)}
              />
              <span>giờ</span>
            </>,
          )}
        </div>
        <div>
          {row(
            "Người phụ trách",
            <>
              {select(
                "assignee",
                "Người phụ trách công việc",
                [...new Set([...members.map((m) => m.name), user.displayName])],
              )}
              <Button
                rounded
                icon={UserRound}
                onClick={() => set("assignee", user.displayName)}
              >
                Gán cho tôi
              </Button>
            </>,
          )}
          {row(
            "Mốc phát hành",
            <>
              {select(
                "milestone",
                "Mốc phát hành công việc",
                options.milestone,
              )}
              <IconButton
                className="outlined"
                icon={Plus}
                label="Thêm mốc phát hành"
                onClick={() => addOption("milestone")}
              />
            </>,
            true,
          )}
          {row(
            "Phiên bản phát sinh",
            <>
              {select("version", "Phiên bản phát sinh", options.version)}
              <IconButton
                className="outlined"
                icon={Plus}
                label="Thêm phiên bản"
                onClick={() => addOption("version")}
              />
            </>,
            true,
          )}
          {row(
            "Hạn xử lý",
            <input
              aria-label="Hạn xử lý"
              type="date"
              min={form.start || undefined}
              value={form.due}
              onChange={(e) => set("due", e.target.value)}
            />,
          )}
          {row(
            "Thời gian thực tế",
            <>
              <input
                aria-label="Thời gian thực tế"
                type="number"
                min="0"
                step="0.5"
                value={form.actual}
                onChange={(e) => set("actual", e.target.value)}
              />
              <span>giờ</span>
            </>,
          )}
        </div>
        {form.status === "closed" && (
          <div className="d-closure-field">
            {row(
              "Lý do hoàn thành *",
              select("reason", "Lý do hoàn thành", closureReasons),
            )}
          </div>
        )}
      </div>
      {extra && (
        <Modal
          title={`Thêm ${extra === "category" ? "danh mục" : extra === "milestone" ? "mốc phát hành" : "phiên bản"}`}
          onClose={() => setExtra(null)}
        >
          <label className="d-field">
            Tên
            <input
              autoFocus
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
            />
          </label>
          <div className="d-modal-actions">
            <Button
              primary
              disabled={!extraValue.trim()}
              onClick={() => {
                setOptions((prev) => ({
                  ...prev,
                  [extra]: [...new Set([...prev[extra], extraValue.trim()])],
                }));
                set(extra, extraValue.trim());
                setExtra(null);
              }}
            >
              Thêm
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function NewIssuePage({ addIssue, navigate, issues }) {
  const [form, setForm] = useState({
    title: "",
    type: "Lỗi",
    status: "open",
    priority: "Trung bình",
    description: initialDescription,
    assignee: "",
    category: "",
    milestone: "",
    version: "",
    start: "",
    due: "",
    estimate: "",
    actual: "",
    reason: "",
  });
  const [preview, setPreview] = useState(false);
  const [showParent, setShowParent] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [parent, setParent] = useState("");
  const [related, setRelated] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề công việc.");
      return;
    }
    if (form.status === "closed" && !form.reason) {
      setError("Vui lòng chọn lý do hoàn thành.");
      return;
    }
    if (form.start && form.due && form.due < form.start) {
      setError("Hạn xử lý phải từ ngày bắt đầu trở đi.");
      return;
    }
    const id = addIssue({ ...form, title: form.title.trim(), parent, related });
    navigate(`/board/issue/${id}`);
  }
  return (
    <form className="d-new-issue" onSubmit={submit}>
      <h1>Thêm công việc</h1>
      <div className="d-new-top">
        <button
          type="button"
          className="d-text-button"
          onClick={() => setShowParent(!showParent)}
        >
          <GitBranch size={19} />
          Thiết lập công việc cha
        </button>
        <span className="d-spacer" />
        <Button onClick={() => setPreview(true)}>Xem trước</Button>
        <button type="submit" className="d-button primary">
          Thêm
        </button>
      </div>
      {showParent && (
        <FieldSelect
          label="Công việc cha"
          options={issues.map((i) => ({
            id: i.id,
            label: `${i.id} — ${i.title}`,
          }))}
          value={parent}
          onChange={setParent}
          empty="Chọn công việc cha"
        />
      )}
      <FieldSelect
        label="Loại công việc"
        className="d-new-type d-no-label"
        options={types}
        empty={null}
        value={form.type}
        onChange={(v) => setForm({ ...form, type: v })}
      />
      <input
        aria-label="Tiêu đề công việc"
        className="d-issue-title-input"
        placeholder="【Chức năng / Màn hình】Mô tả thao tác và vấn đề xảy ra"
        value={form.title}
        onChange={(e) => {
          setForm({ ...form, title: e.target.value });
          setError("");
        }}
        maxLength={250}
      />
      {error && (
        <p className="d-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="d-new-panel">
        <RichEditor
          value={form.description}
          onChange={(description) =>
            setForm((prev) => ({ ...prev, description }))
          }
        />
        <button
          type="button"
          className="d-related-button"
          onClick={() => setShowRelated(!showRelated)}
        >
          <Plus size={18} />
          <strong>Thêm công việc liên quan</strong>
          <span>Liên kết các công việc cần được theo dõi cùng nhau.</span>
        </button>
        {showRelated && (
          <FieldSelect
            label="Công việc liên quan"
            options={issues.map((i) => ({
              id: i.id,
              label: `${i.id} — ${i.title}`,
            }))}
            value={related}
            onChange={setRelated}
            empty="Chọn công việc"
          />
        )}
        <IssueProperties form={form} setForm={setForm} />
        <div className="d-form-footer">
          <Button onClick={() => navigate("/board/list")}>Hủy</Button>
          <Button onClick={() => setPreview(true)}>Xem trước</Button>
          <button type="submit" className="d-button primary">
            Thêm công việc
          </button>
        </div>
      </div>
      {preview && (
        <Modal
          title="Xem trước công việc"
          wide
          onClose={() => setPreview(false)}
        >
          <div className="d-preview-tags">
            <TypeBadge type={form.type} />
            <StatusBadge id={form.status} />
          </div>
          <h2 className="d-preview-title">
            {form.title || "Chưa nhập tiêu đề"}
          </h2>
          <MarkdownView text={form.description} />
          <div className="d-modal-actions">
            <Button onClick={() => setPreview(false)}>
              Tiếp tục chỉnh sửa
            </Button>
          </div>
        </Modal>
      )}
    </form>
  );
}

export function IssueDetailPage({
  issue,
  updateIssue,
  navigate,
  notify,
  backLabel = "Danh sách công việc",
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...issue });
  const [comment, setComment] = useState("");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [recipient, setRecipient] = useState("");
  function submit(e) {
    e.preventDefault();
    if (form.status === "closed" && !form.reason) {
      setError("Vui lòng chọn lý do hoàn thành.");
      return;
    }
    if (form.start && form.due && form.due < form.start) {
      setError("Hạn xử lý phải từ ngày bắt đầu trở đi.");
      return;
    }
    updateIssue({
      ...form,
      comments: [
        ...issue.comments,
        ...(comment.trim()
          ? [
              {
                text: comment.trim(),
                author: user.displayName,
                time: new Date().toLocaleString("vi-VN"),
                recipient,
              },
            ]
          : []),
      ],
    });
    setComment("");
    setError("");
    notify("Đã cập nhật công việc trong bản xem thử.");
  }
  return (
    <div className="d-detail-page">
      <button
        className="d-text-button"
        onClick={() => navigate("/board/list")}
      >
        <ArrowLeft size={17} />
        {backLabel}
      </button>
      <div className="d-detail-heading">
        <TypeBadge type={issue.type} />
        <strong>{issue.id}</strong>
        <StatusBadge id={issue.status} />
      </div>
      <h1>{issue.title}</h1>
      <div className="d-detail-description">
        <div className="d-person">
          <Avatar name={issue.creator} size={36} />
          <div>
            <strong>{issue.creator}</strong>
            <small>Đã tạo ngày {issue.created.replaceAll("-", "/")}</small>
          </div>
        </div>
        <MarkdownView text={issue.description} />
      </div>
      <h2 className="d-comments-heading">
        Bình luận <span>({issue.comments.length})</span>
      </h2>
      {issue.comments.map((c, index) => (
        <article key={index} className="d-comment">
          <Avatar name={c.author} size={34} />
          <div>
            <strong>{c.author}</strong>
            <time>{c.time}</time>
            <MarkdownView text={c.text} />
            {c.recipient && <small>Thông báo cho: {c.recipient}</small>}
          </div>
        </article>
      ))}
      <form onSubmit={submit} className="d-comment-form">
        <div className="d-comment-composer">
          <h2>Thêm bình luận</h2>
          <RichEditor
            compact
            label="Nội dung bình luận"
            value={comment}
            onChange={setComment}
          />
          <FieldSelect
            label="Thành viên nhận thông báo"
            options={members.map((m) => m.name)}
            empty="Chọn thành viên bạn muốn thông báo"
            value={recipient}
            onChange={setRecipient}
          />
        </div>
        <aside className="d-detail-edit">
          <div className="d-detail-shortcuts">
            <button
              type="button"
              className="d-text-button"
              onClick={() => setForm({ ...form, status: "planning" })}
            >
              Chuyển sang lập kế hoạch
            </button>
            <button
              type="button"
              className="d-text-button"
              onClick={() =>
                setForm({ ...form, status: "closed", reason: "Đã khắc phục" })
              }
            >
              Đánh dấu đã khắc phục
            </button>
          </div>
          <IssueProperties form={form} setForm={setForm} detail />
        </aside>
        {error && (
          <p className="d-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="d-form-footer">
          <Button onClick={() => navigate("/board/list")}>Đóng</Button>
          <Button onClick={() => setPreview(true)}>Xem trước</Button>
          <button type="submit" className="d-button primary">
            Đăng cập nhật
          </button>
        </div>
      </form>
      {preview && (
        <Modal
          title="Xem trước cập nhật"
          wide
          onClose={() => setPreview(false)}
        >
          <StatusBadge id={form.status} />
          <MarkdownView
            text={comment || "Chỉ cập nhật thuộc tính công việc."}
          />
          <div className="d-modal-actions">
            <Button onClick={() => setPreview(false)}>
              Tiếp tục chỉnh sửa
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
