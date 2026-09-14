import React from 'react';

export function Footer() {
  return (
    <footer className="h-8 border-t border-slate-200 bg-[#FAFAFA] px-4 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
      <div>Copyright © SHIFT Inc. All rights reserved.</div>
      <div className="flex items-center gap-4">
        <span>Phiên bản: <strong className="text-slate-700 font-mono">CATEST v4.21.104</strong></span>
        <span>Hỗ trợ kỹ thuật: <strong className="text-slate-700">QA Lead S+</strong></span>
      </div>
    </footer>
  );
}

