import React from 'react';

export function Navbar({ activeRoute, navigate }) {
  const isNavActive = (baseRoute) => {
    if (baseRoute === '/dashboard') return activeRoute === '/dashboard';
    return activeRoute.startsWith(baseRoute);
  };

  const navItems = [
    { label: 'Tổng quan', route: '/dashboard' },
    { label: 'Quản lý kiểm thử', route: '/tests' },
    { label: 'Quản lý lỗi', route: '/issues' },
    { label: 'Quản lý tiến độ', route: '/progress' },
    { label: 'Tổng hợp & Phân tích', route: '/analysis' },
  ];

  return (
    <nav className="h-9 border-b border-slate-200 bg-[#FAFAFA] px-4 flex items-center gap-6 text-xs font-medium flex-shrink-0 z-20">
      {navItems.map(item => (
        <button
          key={item.route}
          onClick={() => navigate(item.route)}
          className={`h-full flex items-center border-b-2 transition ${
            isNavActive(item.route)
              ? 'text-[#20B7A6] border-[#20B7A6] font-bold'
              : 'text-slate-600 border-transparent hover:text-[#20B7A6]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

