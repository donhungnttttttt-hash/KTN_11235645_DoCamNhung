import React, { useEffect, useRef, useState } from "react";
import App from "./App";
import { ProjectDataProvider } from "./app/features/work-items/ProjectData";
import { AuthProvider, useAuth } from "./app/features/auth/AuthProvider";
import { AuthBoundary } from "./app/features/auth/AuthBoundary";
import { ProjectProvider } from "./app/features/projects/ProjectProvider";
import { AdminApp } from "./app/features/admin/AdminApp";

const explicitWorkspace = route => new URLSearchParams(route.split('?')[1]).get('workspace') === '1';

export function RoleApp({workspaceIdentity}) {
  const { user, hasRole } = useAuth();
  const [route,setRoute] = useState(() => window.location.hash.slice(1));
  const localChoice=useRef(null);
  const choice=workspaceIdentity || localChoice;
  const [,updateChoice]=useState(0);
  if (!choice.current) choice.current={id:user?.id,optedIn:hasRole('ADMIN') && explicitWorkspace(route)};
  else if (choice.current.id !== user?.id) choice.current={id:user?.id,optedIn:false};
  const workspace=choice.current.optedIn;
  useEffect(() => {
    const changed=()=>{
      const next=window.location.hash.slice(1);setRoute(next);
      if(next.startsWith('/admin')) choice.current={id:user?.id,optedIn:false};
      else if(hasRole('ADMIN') && explicitWorkspace(next)) choice.current={id:user?.id,optedIn:true};
      updateChoice(value=>value+1);
    };
    window.addEventListener('hashchange',changed);return ()=>window.removeEventListener('hashchange',changed);
  },[user?.id,hasRole,choice]);
  useEffect(() => {
    if (user && hasRole('ADMIN') && !workspace && !route.startsWith('/admin')) {
      window.history.replaceState(null,'','#/admin');setRoute('/admin');
    }
  },[user,hasRole,workspace,route]);
  if (route.startsWith('/admin') || hasRole('ADMIN') && !workspace) return <AdminApp route={route.startsWith('/admin') ? route : '/admin'}/>;
  return <ProjectProvider><ProjectDataProvider><App/></ProjectDataProvider></ProjectProvider>;
}

function AuthenticatedShell() {
  // Remains mounted across AuthBoundary's identity-keyed app remounts, so a
  // previous account's workspace opt-in cannot become the next account's default.
  const workspaceIdentity=useRef(null);
  return <AuthBoundary><RoleApp workspaceIdentity={workspaceIdentity}/></AuthBoundary>;
}

export default function AppEntry() {
  return (
    <AuthProvider>
      <AuthenticatedShell />
    </AuthProvider>
  );
}
