import React, { useState, useEffect } from "react";
import { MainLayout } from "./app/layouts/MainLayout";
import { AppRouter } from "./app/routes/AppRouter";
import { normalizeRoute } from "./app/routes/legacyRoutes";
import { pageTitle } from "./app/routes/routeInfo";
import { useAuth } from "./app/features/auth/AuthProvider";
import {
  initialProjectData,
  initialTeamMembers,
  initialTestSpecs,
  initialIssues,
  initialMemberProgress,
} from "./mocks/storeData";

export default function App() {
  const auth = useAuth();
  const [activeRoute, setActiveRoute] = useState(
    normalizeRoute(
      window.location.hash ? window.location.hash.substring(1) : "/dashboard",
    ),
  );

  const [project] = useState(initialProjectData);
  const [teamMembers] = useState(initialTeamMembers);
  const [testSpecs] = useState(initialTestSpecs);
  const [issues] = useState(initialIssues);
  const [memberProgress] = useState(initialMemberProgress);

  useEffect(() => { document.title = pageTitle(activeRoute); }, [activeRoute]);

  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash
        ? window.location.hash.substring(1)
        : "/dashboard";
      const normalized = normalizeRoute(currentHash);
      if (normalized !== currentHash)
        window.history.replaceState(null, "", "#" + normalized);
      setActiveRoute(normalized);
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (route) => {
    window.location.hash = route;
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <MainLayout activeRoute={activeRoute} navigate={navigate}>
      {auth?.hasRole('ADMIN') && <a href="#/admin" style={{display:'inline-block',padding:'12px 20px'}}>Quản trị hệ thống</a>}
      <AppRouter
        activeRoute={activeRoute}
        project={project}
        teamMembers={teamMembers}
        testSpecs={testSpecs}
        issues={issues}
        memberProgress={memberProgress}
        navigate={navigate}
      />
    </MainLayout>
  );
}
