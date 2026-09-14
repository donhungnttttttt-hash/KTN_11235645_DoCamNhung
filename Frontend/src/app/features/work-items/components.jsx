import React, { useEffect, useRef, useState } from "react";
import {
  X,
  ChevronDown,
  Search,
  Paperclip,
  AtSign,
  Smile,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Table2,
  Quote,
  Braces,
  Link,
  CircleHelp,
  Sparkles,
  UserRound,
} from "lucide-react";
import { members, statuses } from "./data";

export function IconButton({ icon: Icon, label, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`d-icon-button ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={19} strokeWidth={1.8} />
    </button>
  );
}
export function Button({
  children,
  icon: Icon,
  primary,
  rounded,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`d-button ${primary ? "primary" : ""} ${rounded ? "rounded" : ""} ${className}`}
      {...props}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}
export function Avatar({ name = "SYP Huyen", size = 26 }) {
  const member = members.find((m) => m.name === name) || {
    initials: name[0],
    color: "#7b82a1",
  };
  return (
    <span
      className="d-avatar"
      title={name}
      style={{
        width: size,
        height: size,
        backgroundColor: member.color,
        fontSize: size / 2.4,
      }}
    >
      {name === "SYP Huyen" ? (
        <UserRound size={size * 0.68} strokeWidth={1.5} />
      ) : (
        member.initials
      )}
    </span>
  );
}
export function StatusBadge({ id, dot = false }) {
  const status = statuses.find((s) => s.id === id) || statuses[0];
  return dot ? (
    <span className="d-status-text">
      <i style={{ background: status.color }} />
      {status.label}
    </span>
  ) : (
    <span className="d-status-badge" style={{ background: status.color }}>
      {status.label}
    </span>
  );
}
export function TypeBadge({ type = "Lỗi" }) {
  return (
    <span
      className={`d-type-badge ${type === "Yêu cầu" ? "request" : type === "Lỗi" ? "" : "task"}`}
    >
      {type}
    </span>
  );
}
export function FieldSelect({
  label,
  options,
  value,
  onChange,
  empty = "Tất cả",
  className = "",
  ...props
}) {
  return (
    <label className={`d-field ${className}`}>
      {label && <span>{label}</span>}
      <span className="d-select-wrap">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          {...props}
        >
          {empty !== null && <option value="">{empty}</option>}
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.id}
              value={typeof o === "string" ? o : o.id}
            >
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </span>
    </label>
  );
}
export function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div
      className="d-status-select"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label="Trạng thái công việc"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <StatusBadge id={value} dot />
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="d-status-options">
          {statuses.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={value === s.id}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
            >
              <StatusBadge id={s.id} dot />
              {value === s.id && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const escape = (e) => {
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (e.key === "Escape" && dialogs[dialogs.length - 1] === ref.current)
        closeRef.current();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      previous?.focus?.();
    };
  }, []);
  function trapFocus(e) {
    if (e.key !== "Tab") return;
    e.stopPropagation();
    const focusables = ref.current.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex="0"]',
    );
    const first = focusables[0],
      last = focusables[focusables.length - 1];
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === ref.current)
    ) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      className={`d-modal-backdrop ${drawer ? "wb-drawer-backdrop" : ""}`}
      onClick={onClose}
    >
      <section
        ref={ref}
        tabIndex={-1}
        onKeyDown={trapFocus}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`d-modal ${wide ? "wide" : ""} ${drawer ? "wb-drawer" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <IconButton icon={X} label="Đóng hộp thoại" onClick={onClose} />
        </header>
        <div className="d-modal-body">{children}</div>
      </section>
    </div>
  );
}
export function MarkdownView({ text }) {
  return (
    <div className="d-markdown">
      {text
        .split("\n")
        .map((line, index) =>
          line.startsWith("## ") ? (
            <h3 key={index}>{line.slice(3)}</h3>
          ) : line.startsWith("> ") ? (
            <blockquote key={index}>{line.slice(2)}</blockquote>
          ) : (
            <p key={index}>{line || "\u00a0"}</p>
          ),
        )}
    </div>
  );
}
export function RichEditor({
  value,
  onChange,
  label = "Mô tả công việc",
  compact = false,
}) {
  const [preview, setPreview] = useState(false);
  const [files, setFiles] = useState([]);
  const [review, setReview] = useState(false);
  const textarea = useRef(null);
  const fileInput = useRef(null);
  const insert = (before, after = "") => {
    const start = textarea.current?.selectionStart ?? value.length;
    const end = textarea.current?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || "nội dung";
    onChange(
      value.slice(0, start) + before + selected + after + value.slice(end),
    );
    setPreview(false);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };
  const formats = [
    [Bold, "In đậm", "**", "**"],
    [Italic, "In nghiêng", "_", "_"],
    [Strikethrough, "Gạch ngang", "~~", "~~"],
    [List, "Danh sách", "\n- ", ""],
    [ListOrdered, "Danh sách đánh số", "\n1. ", ""],
    [ListChecks, "Danh sách kiểm tra", "\n- [ ] ", ""],
    [Table2, "Bảng", "\n| Cột 1 | Cột 2 |\n| --- | --- |\n| ", " | |\n"],
    [Quote, "Trích dẫn", "\n> ", ""],
    [Braces, "Đoạn mã", "\n```\n", "\n```"],
    [Link, "Liên kết", "[", "](https://)"],
  ];
  return (
    <div className={`d-editor ${compact ? "compact" : ""}`}>
      {preview ? (
        <div className="d-editor-preview">
          <MarkdownView text={value || "Chưa có nội dung."} />
        </div>
      ) : (
        <textarea
          ref={textarea}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập nội dung, các bước tái hiện và kết quả mong đợi…"
        />
      )}
      <div className="d-editor-toolbar">
        <IconButton
          icon={Paperclip}
          label="Đính kèm tệp"
          onClick={() => fileInput.current.click()}
        />
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            setFiles([
              ...files,
              ...Array.from(e.target.files).map((f) => f.name),
            ]);
            e.target.value = "";
          }}
        />
        <IconButton
          icon={AtSign}
          label="Nhắc đến thành viên"
          onClick={() => insert("@SYP Huyen ", "")}
        />
        <IconButton
          icon={Smile}
          label="Thêm biểu cảm"
          onClick={() => insert("😊 ", "")}
        />
        <span className="d-spacer" />
        <button
          type="button"
          className="d-ai-pill"
          onClick={() => setReview(!review)}
        >
          <Sparkles size={14} /> Kiểm tra nội dung
        </button>
        {formats.map(([Icon, title, before, after]) => (
          <IconButton
            key={title}
            icon={Icon}
            label={title}
            onClick={() => insert(before, after)}
          />
        ))}
        <IconButton
          icon={CircleHelp}
          label="Hướng dẫn định dạng"
          onClick={() => setReview(!review)}
        />
        <button
          type="button"
          className="d-editor-preview-btn"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Chỉnh sửa" : "Xem trước"}
        </button>
      </div>
      {review && (
        <div className="d-editor-hint">
          Nội dung rõ ràng nên có: mô tả, các bước tái hiện, kết quả thực tế,
          kết quả mong đợi và môi trường kiểm thử. Dùng **nội dung** để đánh dấu
          in đậm, - để tạo danh sách.
        </div>
      )}
      {files.length > 0 && (
        <div className="d-attachments">
          {files.map((f, index) => (
            <span key={`${f}-${index}`}>
              <Paperclip size={13} />
              {f}
              <button
                type="button"
                aria-label={`Bỏ tệp ${f}`}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = true,
  action,
}) {
  const [query, setQuery] = useState("");
  return (
    <div className="d-multiselect">
      <div className="d-multiselect-label">
        <span>
          {label}
          {selected.length > 0 && <b>{selected.length}</b>}
        </span>
        {action ||
          (selected.length > 0 && (
            <button type="button" onClick={() => onChange([])}>
              Bỏ chọn
            </button>
          ))}
      </div>
      <div className="d-multiselect-box">
        {searchable && (
          <div className="d-multi-search">
            <Search size={17} />
            <input
              aria-label={`Tìm ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
        <div className="d-multi-options">
          {options
            .filter((o) =>
              (o.label || o)
                .toLocaleLowerCase("vi")
                .includes(query.toLocaleLowerCase("vi")),
            )
            .map((o) => {
              const id = o.id || o;
              const chosen = selected.includes(id);
              return (
                <button
                  type="button"
                  key={id}
                  aria-pressed={chosen}
                  className={chosen ? "selected" : ""}
                  onClick={() =>
                    onChange(
                      chosen
                        ? selected.filter((s) => s !== id)
                        : [...selected, id],
                    )
                  }
                >
                  {o.label || o}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
