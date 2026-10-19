const fs=require('fs');
for(const f of ['Frontend/src/app/components/SelectionTable.jsx','Frontend/src/app/features/admin/AdminProjectForm.jsx','Frontend/src/app/features/admin/InitialDevicePicker.jsx','Frontend/src/app/features/retest/CoverageEditor.jsx']) {
 const s=fs.readFileSync(f,'utf8').replaceAll('ui-filter-search">Tìm kiếm<input','ui-filter-search">Tìm<input').replace('ui-filter-view">Lựa chọn<select','ui-filter-view">Hiển thị<select');
 fs.writeFileSync(f,s);
}
