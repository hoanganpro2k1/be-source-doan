# AI Project Instructions — Backend (be-doan-24h)

Project Name: Đồ Án 24h — Backend

Backend NestJS cho nền tảng marketplace bán source code / đồ án tốt nghiệp.
Framework: NestJS 11 + Prisma 7 (PostgreSQL) + Zod (nestjs-zod) — KHÔNG dùng class-validator/class-transformer.

---

## Frontend Integration (CRITICAL)

Dự án Frontend nằm ở thư mục riêng biệt:

- **Đường dẫn Frontend**: `D:\DUAN\DOAN_24H\fe-doan-24h`
- **Địa chỉ Local**: `http://localhost:3000`

Khi thay đổi API (thêm/sửa DTO, đổi response shape, đổi route), luôn kiểm tra xem Frontend có đang gọi API đó không (`grep` trong `fe-doan-24h/src`) để tránh phá vỡ tính năng đang hoạt động.

---

## IMPORTANT — Đọc trước khi code

Trước khi sinh code, đọc và tuân theo toàn bộ ngữ cảnh trong `.agent/`:

- `.agent/context/` — kiến trúc tổng thể, từng domain (auth, product, order/payment, brand/category/media)
- `.agent/rules/` — quy tắc bắt buộc khi code (coding convention, bảo mật, response/error)
- `.agent/decisions/` — các quyết định thiết kế và lý do, kèm phần "đã biết nhưng chưa triển khai" (không tự ý bật lại nếu chưa hỏi)
- `.agent/examples/` — ví dụ module chuẩn để copy pattern

Luôn ưu tiên theo thứ tự:
1. Pattern đã có trong codebase (đọc module tương tự trước khi viết module mới)
2. `.agent/examples/`
3. `.agent/rules/`
4. File này (AGENTS.md)

Tài liệu có sẵn khác (không trùng lặp, tham chiếu khi cần):
- `docs/giai_thich_database.md` — giải thích từng bảng Prisma theo nhóm nghiệp vụ
- `docs/huong_dan_phat_trien.md` — quy trình 9 bước thêm module mới (schema → model → dto → repo → service → controller → module → đăng ký app.module)

---

## Kiến trúc bắt buộc tuân theo

Mỗi domain nằm trong `src/routes/<domain>/`, đặt tên file cố định:

```
<domain>.module.ts       # đăng ký DI
<domain>.controller.ts   # nhận request, gọi service, @ZodResponse
<domain>.service.ts      # logic nghiệp vụ
<domain>.repo.ts         # CHỈ thao tác Prisma, không chứa business logic
<domain>.dto.ts          # class createZodDto(Schema) — request/response
<domain>.model.ts        # Zod schema thuần + type suy ra bằng z.infer
<domain>.error.ts        # (tùy chọn) exception nghiệp vụ riêng của domain
```

Domain có bản dịch đa ngôn ngữ thêm module con `<domain>-translation/` với cùng 6 file trên.

Không tạo file/pattern khác đi (không dùng class-validator DTO, không viết business logic trong controller hay repo).

---

## Quy tắc bắt buộc (tóm tắt — chi tiết xem `.agent/rules/`)

1. Toàn bộ request/response DTO là `createZodDto(Schema)` — không dùng `class-validator`.
2. Response luôn khai báo qua `@ZodResponse({ type: XxxDTO })`; `ZodSerializerInterceptor` tự strip field thừa.
3. Password luôn qua `HashingService.hash()/compare()` — không tự gọi `bcrypt` trực tiếp.
4. Không thêm `@IsPublic()` trừ khi endpoint thực sự công khai. Mọi route mới cần có `Permission` record khớp `path`+`method` (chạy `initialScript/create-permissions.ts` sau khi thêm route) nếu không sẽ luôn nhận 403 dù token hợp lệ.
5. Soft-delete mặc định (`deletedAt`) cho toàn bộ entity chính — không hard-delete trừ khi đã có tiền lệ (`Language` là ngoại lệ hard-delete).
6. Dùng `$transaction` cho mọi thao tác nhiều bảng liên quan tới tồn kho/tiền (tạo order, xác nhận thanh toán).
7. Không tự ý bật lại code đang bị comment (Redis, BullMQ queue, CatchEverythingFilter, TransformInterceptor) mà không hỏi trước — xem `.agent/decisions/known-gaps.md`.
8. Luôn dùng tiếng Việt khi trả lời người dùng và viết message lỗi nghiệp vụ; comment code ngắn gọn.

---

## Language Rules

- Luôn trả lời bằng tiếng Việt.
- Comment code ngắn gọn, chỉ khi cần giải thích lý do (không giải thích cái gì code đã tự nói rõ).
- Đặt tên rõ ràng, dễ đọc, theo đúng convention hiện có trong codebase.
