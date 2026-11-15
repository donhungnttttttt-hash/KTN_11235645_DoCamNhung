export function ticketInitials(name) {
 const words=String(name||'').replace(/\[[^\]]*\]/g,'').trim().split(/\s+/).filter(Boolean);
 return words.length?words.slice(-2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase():'?';
}
