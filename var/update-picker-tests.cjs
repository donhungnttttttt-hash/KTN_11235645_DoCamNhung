const fs=require('fs');
const p='Frontend/src/app/features/admin/inventory.test.jsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace('const page=items=>({items,totalElements:items.length});',`const page=items=>({items,totalElements:items.length});
async function chooseProject(label){fireEvent.click(screen.getByLabelText(label));fireEvent.click(await screen.findByRole('option',{name:'AA · Alpha'}));}`);
s=s.replaceAll("fireEvent.change(screen.getByLabelText('Dự án đang giữ máy'),{target:{value:'2'}});","await chooseProject('Dự án đang giữ máy');");
s=s.replaceAll("await screen.findByText('AA · Alpha');fireEvent.change(screen.getByLabelText('Dự án nhận máy'),{target:{value:'2'}});","await chooseProject('Dự án nhận máy');");
s=s.replace("  await waitFor(()=>expect(screen.getByLabelText('Dự án nhận máy').options).toHaveLength(2));\n  fireEvent.change(screen.getByLabelText('Dự án nhận máy'),{target:{value:'2'}});","  await chooseProject('Dự án nhận máy');");
fs.writeFileSync(p,s);
