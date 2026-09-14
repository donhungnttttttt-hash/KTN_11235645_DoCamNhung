import React, { useState, useEffect } from 'react';
import { useLenis } from './app/hooks/useLenis';
import { MainLayout } from './app/layouts/MainLayout';
import { AppRouter } from './app/routes/AppRouter';
import {
  initialProjectData,
  initialTeamMembers,
  initialTestSpecs,
  initialIssues,
  initialMemberProgress
} from './mocks/storeData';

export default function App() {
  // Activate Lenis Smooth Scroll (Complies with Lenis Skill Guidelines)
  useLenis();

  const [activeRoute, setActiveRoute] = useState(
    window.location.hash ? window.location.hash.substring(1) : '/dashboard'
  );

  const [project] = useState(initialProjectData);
  const [teamMembers] = useState(initialTeamMembers);
  const [testSpecs] = useState(initialTestSpecs);
  const [issues] = useState(initialIssues);
  const [memberProgress] = useState(initialMemberProgress);

  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash ? window.location.hash.substring(1) : '/dashboard';
      setActiveRoute(currentHash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route) => {
    window.location.hash = route;
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MainLayout activeRoute={activeRoute} navigate={navigate}>
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

