export const isHandoverPm = member => member.projectRole === 'PM' && member.systemRole !== 'ADMIN' && member.active !== false && member.enabled !== false;
