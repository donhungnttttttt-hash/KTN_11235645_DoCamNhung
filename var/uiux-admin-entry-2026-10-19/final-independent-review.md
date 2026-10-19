# Independent final seam review — 19/10/2026

Review chỉ đọc source và receipt do các owner/root tạo; không sửa product/report/planning, không chạy test mới, browser, API hoặc DB. Dùng `code-review` để đối chiếu caller, cleanup, trạng thái lỗi và contract; dùng `systematic-debugging`/`frontend-ui-engineering` đã đọc trong phiên để phân biệt geometry mock với Chrome. Kết luận: **chưa tìm thêm bug hoặc regression được xác nhận trong ba seam được giao**. Đây không phải chứng nhận toàn hệ thống.

## Dropdown trong scrollport

Đã đọc toàn bộ `AdminProjectDropdown.jsx`, `project-picker.test.jsx`, các rule popup trong `admin.css`, delta ledger Testing và receipt mới. `visibleBounds` giao vùng nhìn của viewport với clipping ancestors; `clientTop/clientHeight` loại border đúng hướng dọc. Chỉ các ancestor thực sự cuộn được mới được dịch lúc mở; vị trí được tính lại sau mỗi dịch. Scroll/resize sau đó chỉ đo lại, không kéo lại vị trí người dùng. Cleanup bỏ đủ listener window/visualViewport. Search, Escape, selection, quyền và API không đổi.

- RED picker: 2 FAIL/5 PASS; GREEN7; hồi quy39, có fixture nested scrollports/scroll limit/visual viewport resize.
- Chrome do root thu: `admin-picker-short-after.json` ở568×320 có popup y163,23..314, search y176,30..220,30 nằm trong main y77,07..320. `admin-picker-interaction-after.json` xác nhận tìm Spider, thấy đúng dự án và Escape đóng popup; không có domain write.
- Test geometry tự tính popup bounds từ anchor/max-height; không thay thế bằng chứng paint. Không suy mọi ancestor/CSS/device đã được thử từ các mẫu này.

## Nested discard / inert / focus return

Đã đọc toàn bộ `AdminFormDialog.jsx`, `useDialogFocus.js` và test dirty-close cuối. Flow hiện dùng dialog xác nhận trong app, **đã thay native `window.confirm` của checkpoint trước**. Form nền inert/aria-hidden trong lúc xác nhận; default focus là “Tiếp tục soạn”.

`useAdminFormClose` chụp `document.activeElement` trước khi bật confirming; child truyền ref đó vào hook để tránh native inert đã blur parent về BODY trước passive effect. Hook dùng captured opener cho entry mới; opener chain khi cả parent/child unmount vẫn được cập nhật trước khi loại parent. Continue/Escape chỉ tháo child nên trả về field; discard tháo cả form nên trả về opener ngoài form. Latest busy callback và auth visibility guard vẫn giữ; auth lock bỏ confirmation nhưng giữ draft children. Argument returnFocusRef mới là optional, không đổi caller cũ.

- Focus RED chỉ chạy ba case: **3 FAIL/20 skipped**, không phải20 PASS. GREEN chung33/33,4file,0skip.
- Test mô phỏng đúng khoảng thiếu của jsdom: inert gây blur đồng bộ, focus vào inert bị chặn. Không sửa timeout hoặc bỏ assertion.
- Root `admin-discard-focus-after.json`: Chrome320×568, Continue/Escape trở về INPUT có `focus-draft`; discard không còn dialog và focus nút “Tạo tài khoản”.

## Device409 recovery / status focus

Đã đọc source cuối sau owner freeze: `DeviceAssetForm.jsx`, `DeviceAllocationDialog.jsx`, `device-error-recovery.test.jsx`, API client `ApiError`, và backend `DeviceInventoryService.java` chỉ để đối chiếu mã lỗi; không gọi backend.

- Reload chỉ hiện cho HTTP409 với mã conflict liên quan: asset VERSION_CONFLICT/ASSET_ALLOCATED; allocation VERSION_CONFLICT/ASSET_UNAVAILABLE/ALREADY_RETURNED. Các mã khớp contract server hiện hành; ARCHIVED,403,422,network hoặc validation cục bộ không bị gắn hướng dẫn version không liên quan.
- Đọc lại thất bại giữ canReload để retry; thành công cập nhật expectedVersion, giữ draft/baseline và bỏ recovery action. Không tự gửi lại mutation. Server đã thu hồi/máy không còn sẵn sàng giữ alert hướng dẫn đóng và tải danh sách, không giả success status.
- Status thành công có tabIndex=-1 và ref/effect focus riêng ở asset; allocation effect theo error/notice với ref gắn vào vùng hiện hành. Status nằm ngoài fieldset disabled nên vẫn nhận focus ở render hoàn tất. Không thấy callback mới thay payload, initial baseline, dirty check hoặc editor generation.
- Recovery RED12 fail được giữ; focus-only RED **2 FAIL/10 skipped**; final `device-error-recovery-final.json`: **61/61,5file,0skip**. Reviewer không chạy lại lượt này; receipts thuộc owner, mocks không phải DB integration.
- Owner hash được đối chiếu sau freeze: DeviceAssetForm `6115ad49e63c8ce3a88104ce3741e3dae5cfe4f4f5d9f92a6bd4f52df94a9544`; DeviceAllocationDialog `04627486dd91f57433692ba7646ee5b384a1ea724bf3d0253d3ab8bbe4909d54`.

Không thay báo cáo root đang sở hữu. Snapshot `admin-dirty-close-independent-review.json` trước đây vẫn là receipt lịch sử của native-confirm checkpoint; không nhận các hash đó là hash của source cuối đã chuyển sang confirmation dialog. Full suite/build/coverage/preservation và các browser gap vẫn do root chốt riêng trên source freeze cuối.
