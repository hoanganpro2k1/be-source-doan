# Quy tắc bắt buộc khi code backend

## Validation & DTO

- Toàn bộ request/response DTO viết bằng Zod qua `nestjs-zod`. **Không dùng `class-validator`/`class-transformer`** ở bất kỳ đâu trong project.
- Pattern: `xxx.model.ts` chứa Zod schema thuần + `type Xxx = z.infer<typeof XxxSchema>`; `xxx.dto.ts` chứa `class XxxDTO extends createZodDto(XxxSchema)`.
- Dùng `.strict()` cho body schema để chặn field thừa không khai báo.
- Dùng `.superRefine()` cho validate chéo giữa nhiều field (ví dụ `confirmPassword === password`, hoặc "chỉ được truyền đúng 1 trong 2 field").
- Response controller luôn khai báo `@ZodResponse({ type: XxxDTO })` — `ZodSerializerInterceptor` (global) tự strip field thừa theo schema.
- Lỗi validate trả **422** (không phải 400), `path` là chuỗi nối dấu chấm (không phải mảng) — do `CustomZodValidationPipe` tuỳ biến, không dùng pipe mặc định của nestjs-zod.

## Cấu trúc module (bắt buộc theo đúng tên file)

```
src/routes/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repo.ts
  <domain>.dto.ts
  <domain>.model.ts
  <domain>.error.ts        # tuỳ chọn — chỉ khi domain cần exception nghiệp vụ riêng
```

- `.repo.ts` **chỉ** chứa thao tác Prisma thuần, không chứa business logic (validate, kiểm tra quyền, tính toán).
- `.service.ts` chứa toàn bộ business logic, gọi `.repo.ts` để truy vấn/ghi DB.
- `.controller.ts` chỉ nhận request, gọi service, khai báo response schema — không viết logic ở đây.
- Domain có bản dịch đa ngôn ngữ (Brand, Category, Product, User) tạo thêm module con `<domain>-translation/` cùng cấu trúc.
- Sau khi thêm/sửa/xoá route, luôn nhắc người dùng chạy lại `initialScript/create-permissions.ts` để đồng bộ bảng `Permission` — nếu không endpoint mới sẽ luôn trả 403.

## Bảo mật & Auth

- Password luôn qua `HashingService.hash()`/`compare()` (bcrypt, saltRounds=10) — không tự gọi `bcrypt` trực tiếp.
- Không thêm `@IsPublic()` tuỳ tiện — mặc định mọi route bị `AuthenticationGuard` + `AccessTokenGuard` chặn, yêu cầu Permission khớp `path`+`method`.
- Lấy user hiện tại qua `@ActiveUser(field?)`, lấy role/permission hiện tại qua `@ActiveRolePermissions(field?)` — không tự parse JWT thủ công trong controller/service.
- Khi kiểm tra quyền sở hữu tài nguyên (ví dụ chỉ chủ sở hữu Product mới được sửa), luôn lấy dữ liệu **hiện tại trong DB** để so sánh, không tin field client gửi trong body (ví dụ không tin `roleId` gửi từ client khi kiểm tra "ai được đổi role của ai").
- Không trả `password`, `totpSecret` ra response — luôn `.omit({ password: true, totpSecret: true })` trên schema.

## Database & Transaction

- Soft-delete mặc định cho entity chính (set `deletedAt`, `deletedById`) — hard-delete chỉ dùng khi đã có tiền lệ rõ ràng (hiện tại: `Language`).
- Dùng `$transaction` (dạng callback interactive, không phải mảng sequential) cho mọi thao tác ảnh hưởng nhiều bảng liên quan tới tồn kho/tiền (tạo order, xác nhận thanh toán) — đảm bảo atomicity, rollback toàn bộ nếu 1 bước lỗi.
- Khi cần optimistic locking (ví dụ trừ tồn kho tránh race condition), dùng pattern `where: { id, updatedAt: <giá trị đã đọc>, <điều kiện business> }` rồi bắt lỗi not-found → map thành exception nghiệp vụ rõ ràng (xem `order.repo.ts` làm ví dụ).
- Webhook/callback từ hệ thống ngoài (thanh toán) phải có cơ chế idempotency (kiểm tra ID giao dịch đã xử lý chưa trước khi ghi) để tránh xử lý trùng khi bên ngoài gọi lại.

## Đa ngôn ngữ

- Chọn ngôn ngữ response dựa vào `I18nContext.current()?.lang` (resolve từ query `?lang=` hoặc header `Accept-Language`), không tự thêm query param riêng cho từng module.
- Hằng số `ALL_LANGUAGE_CODE = 'all'` cho phép trả tất cả bản dịch khi cần (ví dụ trang quản trị).
- Message lỗi nghiệp vụ theo convention `Error.XxxYyy` để tương thích `nestjs-i18n` — dù file dịch hiện chưa đầy đủ (xem `.agent/decisions/known-gaps.md`), vẫn giữ convention này cho nhất quán.

## Không tự ý thay đổi

- Không bật lại code đang bị comment (Redis, BullMQ, CatchEverythingFilter, TransformInterceptor, react-email template) mà không hỏi người dùng trước — xem lý do trong `.agent/decisions/known-gaps.md`.
- Không tạo pattern file mới khác với cấu trúc 6-7 file chuẩn của module, trừ khi người dùng yêu cầu rõ.

## Ngôn ngữ giao tiếp

- Luôn trả lời người dùng bằng tiếng Việt.
- Comment code ngắn gọn, chỉ giải thích lý do (why) khi không hiển nhiên từ code, không giải thích lại "cái gì" code đã tự nói rõ qua tên biến/hàm.
