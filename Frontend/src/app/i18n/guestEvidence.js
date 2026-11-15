// Localize only known system messages; never translate or rewrite user/AI text.
export function guestEvidence(message,t){
 const patterns=[
  [/^Đã test (\d+) \/ mục tiêu mô phỏng đến ngày đã kết thúc (\d+) case\.$/,'Đã test {tested} / mục tiêu mô phỏng đến ngày đã kết thúc {due} case.',['tested','due']],
  [/^(\d+) case NG; (\d+) Ticket còn nghĩa vụ xử lý\. Tỷ lệ đã test không phải tỷ lệ nghiệm thu\.$/,'{ng} case NG; {open} Ticket còn nghĩa vụ xử lý. Tỷ lệ đã test không phải tỷ lệ nghiệm thu.',['ng','open']],
  [/^Hiệu quả mô phỏng đối chiếu cùng mục tiêu (\d+) case; không phản ánh chi phí thực trả\.$/,'Hiệu quả mô phỏng đối chiếu cùng mục tiêu {due} case; không phản ánh chi phí thực trả.',['due']]
 ];
 for(const [pattern,key,names]of patterns){const match=String(message).match(pattern);if(match)return t(key,Object.fromEntries(names.map((name,index)=>[name,match[index+1]])));}
 return t(message);
}
