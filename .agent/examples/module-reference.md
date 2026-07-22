# Module tham chiếu — dùng làm mẫu khi tạo module mới

Thay vì viết code mẫu tách rời (dễ lệch khỏi thực tế theo thời gian), dùng trực tiếp các module sau trong codebase làm khuôn mẫu — đọc toàn bộ 6-7 file của module trước khi viết module mới tương tự.

## Module CRUD đơn giản, không đa ngôn ngữ

**`src/routes/permission/`** — mẫu tốt nhất cho module CRUD chuẩn, ít phụ thuộc:
- `permission.model.ts` — Zod schema thuần + type
- `permission.dto.ts` — DTO từ `createZodDto`
- `permission.repo.ts` — Prisma thuần, có `@SerializeAll()`
- `permission.service.ts` — business logic, bắt lỗi từ repo
- `permission.controller.ts` — REST chuẩn (GET list, GET by id, POST, PUT, DELETE)
- `permission.error.ts` — exception riêng (`PermissionAlreadyExistsException`)
- `permission.module.ts`

## Module CRUD có đa ngôn ngữ (pattern Translation)

**`src/routes/brand/`** (bảng chính) + **`src/routes/brand/brand-translation/`** (module con dịch) — mẫu chuẩn cho domain cần đa ngôn ngữ. Đọc cả 2 để hiểu:
- Cách bảng chính tổng hợp `brandTranslations` theo `I18nContext.current()?.lang`
- Cách xử lý `ALL_LANGUAGE_CODE = 'all'`
- Cách module con translation có route/CRUD riêng biệt

`src/routes/category/` + `category-translation/` theo đúng cùng pattern — dùng để đối chiếu khi cần chắc chắn 100% (2 domain implement giống hệt nhau).

## Module có business rule phức tạp + transaction

**`src/routes/order/`** — mẫu cho module cần:
- `$transaction` interactive callback (không phải mảng)
- Optimistic locking khi update tồn kho (`order.repo.ts`, method `create`)
- Snapshot dữ liệu tại thời điểm giao dịch (`ProductSKUSnapshot`)
- Exception nghiệp vụ chi tiết theo từng bước validate (`order.error.ts`)

**`src/routes/payment/`** — mẫu cho module xử lý webhook từ hệ thống ngoài:
- Guard riêng không phải JWT user (`PaymentAPIKeyGuard`)
- Idempotency check trước khi vào transaction
- Cascading update nhiều bảng liên quan trong 1 transaction

## Module với quyền sở hữu tài nguyên (không chỉ role)

**`src/routes/product/manage-product.controller.ts` + `manage-product.service.ts`** — mẫu cho việc kiểm tra "chỉ chủ sở hữu hoặc Admin mới được thao tác" (method `validatePrivilege`), khác với kiểm tra quyền thuần theo Role — dùng khi cần logic "user A chỉ sửa được resource của chính A, trừ khi là Admin".

## Module thao tác file/S3

**`src/routes/media/`** — mẫu cho 2 luồng upload (qua backend vs presigned URL), bao gồm `parse-file-pipe-with-unlink.pipe.ts` (pattern dọn file tạm khi validate thất bại).

## Auth — không nên copy nguyên khi tạo module mới

`src/routes/auth/` là module đặc thù (JWT, OTP, 2FA, OAuth) — không dùng làm mẫu cấu trúc chung, nhưng khi cần tái sử dụng logic xác thực (ví dụ thêm luồng OTP mới), luôn gọi lại `AuthService.validateVerificationCode` có sẵn thay vì viết lại.

## Trước khi tạo module mới, luôn tự hỏi

1. Domain này có cần đa ngôn ngữ không? → theo pattern `brand`/`category`.
2. Domain này có cần transaction nhiều bảng không? → theo pattern `order`.
3. Domain này có cần kiểm tra quyền sở hữu (không chỉ role) không? → theo pattern `manage-product`.
4. Có cần file `.error.ts` riêng không? → có nếu cần message lỗi nghiệp vụ cụ thể hơn "not found" chung chung.
5. Đã chạy `initialScript/create-permissions.ts` sau khi thêm route mới chưa? (nếu chưa, mọi request tới route mới sẽ luôn 403).
