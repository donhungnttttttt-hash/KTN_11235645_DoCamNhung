export const emptyFilters = {
  status: [],
  type: [],
  category: [],
  milestone: [],
  assignee: [],
  priority: [],
  version: [],
  creator: [],
  reason: [],
  keyword: "",
  start: "",
  end: "",
};

export function matchesIssueFilters(issue, filters) {
  for (const key of [
    "status",
    "type",
    "category",
    "milestone",
    "assignee",
    "priority",
    "version",
    "creator",
    "reason",
  ]) {
    if (filters[key]?.length && !filters[key].includes(issue[key]))
      return false;
  }
  if (filters.start && issue.created < filters.start) return false;
  if (filters.end && issue.created > filters.end) return false;
  return `${issue.id} ${issue.title}`
    .toLocaleLowerCase("vi")
    .includes((filters.keyword || "").toLocaleLowerCase("vi"));
}
