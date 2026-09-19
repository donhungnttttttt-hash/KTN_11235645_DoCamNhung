import React, { createContext, useContext, useRef, useState } from "react";
import { initialWorkIssues, initialActivities } from "./data";

const ProjectDataContext = createContext(null);

// Keep the preview data when navigating between the dashboard and design screens.
export function ProjectDataProvider({ children }) {
  const [issues, setIssueState] = useState(initialWorkIssues);
  const issuesRef = useRef(initialWorkIssues);
  const [activities, setActivities] = useState(initialActivities);

  // Centralize board/list changes so the overview also receives status activity.
  function setIssues(action, recordStatus = true) {
    const previous = issuesRef.current;
    const next = typeof action === "function" ? action(previous) : action;
    const timestamp = new Date().toISOString();
    const changes = recordStatus
      ? next.filter((item) => {
          const before = previous.find((old) => old.id === item.id);
          return before && before.status !== item.status;
        })
      : [];
    const updated = next.map((item) =>
      changes.includes(item)
        ? { ...item, updated: timestamp.slice(0, 10) }
        : item,
    );
    issuesRef.current = updated;
    setIssueState(updated);
    if (changes.length)
      setActivities((current) => [
        ...changes.map((item) => ({
          id: `${timestamp}-${item.id}`,
          issueId: item.id,
          user: "Đỗ Cẩm Nhung",
          minutes: 0,
          timestamp,
          kind: "status",
          text: "",
          status: item.status,
        })),
        ...current,
      ]);
  }

  function addIssue(values) {
    const id = `SFLUTTER-${Math.max(...issues.map((issue) => Number(issue.id.split("-")[1]))) + 1}`;
    const date = new Date().toISOString().slice(0, 10);
    setIssues((previous) => [
      {
        ...values,
        id,
        created: date,
        updated: date,
        creator: "Đỗ Cẩm Nhung",
        comments: [],
      },
      ...previous,
    ]);
    setActivities((previous) => [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        kind: "created",
        issueId: id,
        user: "Đỗ Cẩm Nhung",
        minutes: 0,
        text: "Đã tạo công việc mới.",
        status: values.status,
      },
      ...previous,
    ]);
    return id;
  }

  function updateIssue(issue) {
    const before = issuesRef.current.find((item) => item.id === issue.id);
    const newComment =
      issue.comments.length > (before?.comments.length || 0)
        ? issue.comments.at(-1)?.text || ""
        : "";
    setIssues(
      (previous) =>
        previous.map((item) =>
          item.id === issue.id
            ? { ...issue, updated: new Date().toISOString().slice(0, 10) }
            : item,
        ),
      false,
    );
    setActivities((previous) => [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        kind: newComment ? "comment" : "status",
        issueId: issue.id,
        user: "Đỗ Cẩm Nhung",
        minutes: 0,
        text: newComment,
        status: issue.status,
      },
      ...previous,
    ]);
  }

  return (
    <ProjectDataContext.Provider
      value={{ issues, setIssues, activities, addIssue, updateIssue }}
    >
      {children}
    </ProjectDataContext.Provider>
  );
}

export function useProjectData() {
  return useContext(ProjectDataContext);
}
