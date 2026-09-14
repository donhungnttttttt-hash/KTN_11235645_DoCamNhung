import React from 'react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export function MainLayout({ activeRoute, navigate, children }) {
  const isRunnerRoute = activeRoute.startsWith('/tests/');

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      <div>
        {/* Ẩn Header & Navbar toàn cục khi đang ở trong file Test Runner chi tiết để tối ưu không gian kiểm thử */}
        {!isRunnerRoute && <Header navigate={navigate} />}
        {!isRunnerRoute && <Navbar activeRoute={activeRoute} navigate={navigate} />}
        
        <main id="main-viewport" className="flex-1">
          {children}
        </main>
      </div>

      {/* Ẩn Footer toàn cục khi ở trong file Test Runner */}
      {!isRunnerRoute && <Footer />}
    </div>
  );
}
