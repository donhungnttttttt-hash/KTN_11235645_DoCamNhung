import { useState } from "react";
import { SlidersHorizontal, MessageSquare, Star, Rss } from "lucide-react";
import { Avatar, Button, IconButton, Modal } from "./components";
import { statuses, milestones } from "./data";
export default function HomePage({ issues, activities, navigate, notify, statusCounts, milestoneCounts }) {
  const [expanded, setExpanded] = useState([]);
  const [stars, setStars] = useState([]);
  const [settings, setSettings] = useState(false);
  const [showUpdates, setShowUpdates] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [activityLimit, setActivityLimit] = useState(5);
  const ActivityHeading = "h2";
  const summary = statuses.map((status) => ({
    ...status,
    count: statusCounts ? Number(statusCounts.find(row => row.status === status.id)?.count || 0) : issues.filter((issue) => issue.status === status.id).length,
  }));
  const completed = summary.find(status => status.id === 'closed').count;
  const total = summary.reduce((sum, status) => sum + status.count, 0);
  const completion = total
    ? Math.round((completed / total) * 100)
    : 0;
  const milestoneSummary = milestoneCounts ? milestoneCounts.map(row => ({...row,percent:row.total?Math.round(Number(row.done)/Number(row.total)*100):0})) : [
    ...new Set([
      ...milestones,
      ...issues.map((issue) => issue.milestone).filter(Boolean),
    ]),
  ].map((name) => {
    const assigned = issues.filter((issue) => issue.milestone === name);
    const done = assigned.filter((issue) => issue.status === "closed").length;
    return {
      name,
      total: assigned.length,
      done,
      percent: assigned.length ? Math.round((done / assigned.length) * 100) : 0,
    };
  });
  const visibleActivities = activities.filter((a) =>
    a.text ? showComments : showUpdates,
  );
  return (
    <div className="d-home-grid">
      <section className="d-home-main">
        <div className="d-section-heading">
          <ActivityHeading>
            {"Công việc tạo gần đây"}
            <Rss size={15} />
          </ActivityHeading>
          <div>
            <span className="d-muted">
              Bộ lọc: {showUpdates && showComments ? "Tất cả" : "Tùy chỉnh"}
            </span>
            <Button
              rounded
              icon={SlidersHorizontal}
              onClick={() => setSettings(true)}
            >
              Hiển thị
            </Button>
          </div>
        </div>

        <div className="d-activity-panel">
          <h2>{"Hoạt động của dự án"}</h2>
          <div className="d-activity-list">
            {visibleActivities.slice(0, activityLimit).map((a) => {
              const issue = issues.find((i) => i.id === a.issueId);
              if (!issue) return null;
              const isExpanded = expanded.includes(a.id);
              return (
                <article className="d-activity" key={a.id}>
                  <Avatar name={a.user} size={32} />
                  <div className="d-activity-body">
                    <div className="d-activity-heading">
                      <span>
                        <strong>{a.user}</strong>{" "}
                        {a.kind === "created"
                          ? "đã tạo công việc"
                          : a.kind === "comment" || (!a.kind && a.text)
                            ? "đã thêm bình luận"
                            : "đã cập nhật công việc"}{" "}
                        <b>
                          {a.kind === "created"
                            ? "Tạo mới"
                            : a.kind === "comment" || (!a.kind && a.text)
                              ? "Bình luận"
                              : "Cập nhật"}
                        </b>
                      </span>
                      <time>
                        {a.timestamp
                          ? new Date(a.timestamp).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })
                          : `${a.minutes} phút trước`}
                      </time>
                    </div>
                    <button
                      className="d-activity-title"
                      onClick={() => navigate(`/board/issue/${issue.id}`)}
                    >
                      <strong>{issue.id}</strong>
                      <span>{issue.title}</span>
                    </button>
                    {a.text && (
                      <div
                        className={`d-activity-text ${isExpanded ? "expanded" : ""}`}
                      >
                        {a.text}
                      </div>
                    )}
                    {a.text.length > 90 && (
                      <button
                        className="d-text-button"
                        onClick={() =>
                          setExpanded(
                            isExpanded
                              ? expanded.filter((id) => id !== a.id)
                              : [...expanded, a.id],
                          )
                        }
                      >
                        {isExpanded ? "Thu gọn" : "… Đọc thêm"}
                      </button>
                    )}
                    <div className="d-activity-bottom">
                      <span>
                        [ Trạng thái:{" "}
                        {statuses.find((s) => s.id === a.status)?.label} ]
                      </span>
                      <div>
                        <IconButton
                          className="outlined"
                          icon={MessageSquare}
                          label={`Bình luận ${issue.id}`}
                          onClick={() => navigate(`/board/issue/${issue.id}`)}
                        />
                        <button
                          className={`d-star ${stars.includes(a.id) ? "active" : ""}`}
                          aria-label={`Yêu thích cập nhật ${a.id}`}
                          onClick={() =>
                            setStars(
                              stars.includes(a.id)
                                ? stars.filter((id) => id !== a.id)
                                : [...stars, a.id],
                            )
                          }
                        >
                          <Star size={17} fill="currentColor" />
                          {stars.includes(a.id) ? 1 : 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {!visibleActivities.length && (
              <div className="d-empty">
                Không có cập nhật phù hợp với bộ lọc.
              </div>
            )}
          </div>
          {visibleActivities.length > activityLimit && (
            <div className="overview-more">
              <Button onClick={() => setActivityLimit((limit) => limit + 5)}>
                Xem thêm cập nhật
              </Button>
            </div>
          )}
        </div>
      </section>
      <aside className="d-home-aside">
        <h2>{"Trạng thái công việc"}</h2>
        <div className="d-summary-box">
          <div className="d-progress-track">
            {summary
              .filter((s) => s.count > 0)
              .map((s) => (
                <span
                  key={s.id}
                  style={{
                    flex: s.count,
                    background: s.color,
                  }}
                />
              ))}
          </div>
          <div className="d-completion">
            {`${completed}/${total} công việc hoàn thành · ${completion}%`}
          </div>
          <div className="d-status-summary">
            {summary.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/board/list?status=${s.id}`)}
              >
                <span title={s.label}>{s.label}</span>
                <b
                  style={{
                    background: s.color,
                  }}
                >
                  {s.count}
                </b>
              </button>
            ))}
          </div>
        </div>

        <div className="d-section-heading">
          <h2>Mốc phát hành</h2>
        </div>
        <div className="d-milestone-panel">
          {milestoneSummary.map((milestone) => (
            <button
              key={milestone.name}
              onClick={() =>
                navigate(
                  `/board/list?milestone=${encodeURIComponent(milestone.name)}`,
                )
              }
            >
              <strong>{milestone.name}</strong>
              <span>
                {milestone.total
                  ? `${milestone.done}/${milestone.total} công việc hoàn thành · ${milestone.percent}%`
                  : "Chưa có công việc"}
              </span>
              <div className="overview-milestone-track">
                <i
                  style={{
                    width: `${milestone.percent}%`,
                  }}
                />
              </div>
              <small>Chưa đặt hạn phát hành</small>
            </button>
          ))}
        </div>
      </aside>
      {settings && (
        <Modal
          title="Cài đặt hiển thị cập nhật"
          onClose={() => setSettings(false)}
        >
          <div className="d-checkbox-list">
            <label>
              <input
                type="checkbox"
                checked={showUpdates}
                onChange={(e) => setShowUpdates(e.target.checked)}
              />
              Thay đổi trạng thái
            </label>
            <label>
              <input
                type="checkbox"
                checked={showComments}
                onChange={(e) => setShowComments(e.target.checked)}
              />
              Bình luận và hoạt động
            </label>
          </div>
          <div className="d-modal-actions">
            <Button primary onClick={() => setSettings(false)}>
              Áp dụng
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
