const fs=require('fs');
const base='Frontend/src/app/features/admin/';
for(const [name,title,wide] of [
 ['AdminProjectForm.jsx',"project?'Sửa dự án':'Tạo dự án'",' wide={!project}'],
 ['AdminUsers.jsx',"'Tạo tài khoản'",''],
 ['DeviceAssetForm.jsx',"asset?'Sửa máy':'Nhập máy vào kho'",''],
 ['DeviceAllocationDialog.jsx',"(allocation?'Thu hồi ':'Bàn giao ')+asset.assetCode",'']]) {
 const p=base+name;let s=fs.readFileSync(p,'utf8');
 s="import {AdminFormDialog} from './AdminFormDialog';\n"+s;
 s=s.replace(/import \{useInlineEditorFocus\}[^\n]*\n/,'').replace(/ const formRef=useInlineEditorFocus\(\);\n/,'');
 s=s.replace(/return <form(?: ref=\{formRef\})? className="admin-card admin-form" onSubmit=\{save\}><h2(?: tabIndex=\{-1\})?>.*?<\/h2>/,'return <AdminFormDialog title={'+title+'} onClose={onCancel} busy={busy}'+wide+'><form className="admin-card admin-form" onSubmit={save}>');
 s=s.replace('</fieldset></form>;','</fieldset></form></AdminFormDialog>;');
 fs.writeFileSync(p,s);
}
