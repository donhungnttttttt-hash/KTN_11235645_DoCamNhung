export const roleLabels={ADMIN:'Admin tổng',PM:'Admin dự án',USER:'User thường',GUEST:'Khách'};
export const membershipLabel=(systemRole,projectRole)=>systemRole==='ADMIN'&&projectRole==='PM'?'Admin tổng · Làm PM':roleLabels[projectRole]||projectRole;
