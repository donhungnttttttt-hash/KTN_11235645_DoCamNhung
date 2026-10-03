import React from "react";

export function NotFoundPage({ navigate, message = "Không tìm thấy trang bạn yêu cầu." }) {
  return <section className="cat-container p-6"><h1 className="text-base font-semibold mb-2">Không tìm thấy</h1><p className="text-slate-500 mb-4">{message}</p><button className="text-[#199c8d]" onClick={() => navigate("/dashboard")}>Về tổng quan</button></section>;
}

