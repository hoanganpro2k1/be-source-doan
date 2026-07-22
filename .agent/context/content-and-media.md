# Nội dung đa ngôn ngữ, Media, Profile (module `brand`, `category`, `media`, `profile`, `language`)

## Pattern Translation (Brand & Category — giống hệt nhau)

Bảng chính (`Brand`, `Category`) chỉ giữ field không phụ thuộc ngôn ngữ (`logo`, và field `name` dùng chung — có phần trùng lặp nhẹ với `name` trong bảng dịch, đây là thiết kế hiện tại, không phải lỗi cần sửa ngay). Bảng dịch (`BrandTranslation`, `CategoryTranslation`) gắn `brandId/categoryId + languageId`, chứa `name`, `description`, unique theo `(id đó, languageId)`.

**Chọn ngôn ngữ khi trả response — dùng i18n context toàn cục, KHÔNG phải query param riêng của module:**

```ts
const brand = await this.brandRepo.findById(id, I18nContext.current()?.lang as string)
```

`languageId` lấy từ ngôn ngữ mà `nestjs-i18n` đã resolve (`?lang=vi` hoặc header `Accept-Language`, fallback `en`). Có hằng số đặc biệt `ALL_LANGUAGE_CODE = 'all'` — nếu client truyền `?lang=all`, repo trả **tất cả** bản dịch, không lọc theo 1 ngôn ngữ.

`create`/`update` của Brand/Category luôn trả về **toàn bộ** `brandTranslations`/`categoryTranslations` (không lọc theo ngôn ngữ) — chỉ `list()` và `findById()` mới áp dụng lọc ngôn ngữ.

Module con `brand-translation`, `category-translation` có route riêng (`/brand-translations`, `/category-translations`, không lồng dưới `/brands/:id/translations`), không có endpoint `list()` riêng (muốn xem tất cả translation của 1 brand thì gọi `GET /brands/:id?lang=all`). Trùng `(brandId, languageId)` → `BrandTranslationAlreadyExistsException`.

**Soft vs hard delete**: Brand/Category/BrandTranslation/CategoryTranslation luôn soft-delete (`isHard` param tồn tại trong repo nhưng service luôn gọi mặc định). **Language lại hard-delete thật** — đây là ngoại lệ duy nhất.

## Media / Upload

**2 luồng upload khác nhau:**

**A — Upload qua backend** (`POST /media/images/upload`, multipart, field `files`, tối đa 100 file):
- File tạm lưu ở `upload/` (root project) qua `multer.diskStorage`, tên random hoá bằng `generateRandomFilename()`.
- `ParseFilePipeWithUnlink` validate: **3MB/file** (dù comment code ghi nhầm 5MB), chỉ chấp nhận `jpg|jpeg|png|webp`. Nếu validate fail, **tự động xoá file tạm đã lưu** trước khi throw lỗi (tránh rác đĩa).
- Service upload từng file lên S3 (`S3Service.uploadedFile`, multipart upload qua `@aws-sdk/lib-storage`), rồi xoá file tạm local sau khi upload xong.
- Response: `{ data: [{ url }] }`.

**B — Presigned URL** (`POST /media/images/upload/presigned-url`, public, body `{ filename, filesize ≤5MB }`):
- Backend chỉ cấp URL ký sẵn (`PutObjectCommand`, `expiresIn: 10 giây` — client phải upload ngay), không nhận file qua backend.
- Trả `{ presignedUrl, url }` — FE tự `fetch(presignedUrl, { method: 'PUT', body: file })`.
- Dùng khi muốn tiết kiệm băng thông/CPU server (FE upload thẳng lên S3).

`GET /media/static/:filename` (public) — serve file local từ `upload/`, chủ yếu dự phòng vì luồng A luôn xoá file local sau khi lên S3 thành công.

`S3Service`: dùng AWS SDK v3, region/credentials từ env (`S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`), endpoint mặc định AWS (dòng custom endpoint đang bị comment — không phải dịch vụ S3-compatible khác như MinIO/R2).

## Email

Chỉ có **1 loại email đang hoạt động thật: gửi OTP** (`EmailService.sendOTP`, dùng Resend). Template là **file HTML tĩnh** `src/shared/email-templates/otp.html`, thay placeholder `{{subject}}`/`{{code}}` bằng `String.replaceAll`.

Có component react-email (`emails/otp.tsx`, thư mục ở root project, dùng `@react-email/components`) nhưng **KHÔNG được `email.service.ts` sử dụng** — 2 phần đang lệch nhau, đừng mô tả là hệ thống render email bằng react-email thật sự (xem known-gaps.md).

Không có email thông báo đơn hàng/hoá đơn hiện tại.

## Profile vs User (xem thêm `auth-and-authorization.md`)

`ProfileController` (`/profile`) luôn thao tác trên **user đang đăng nhập** — `GET /profile`, `PUT /profile` (chỉ `name, phoneNumber, avatar`), `PUT /profile/change-password` (`superRefine` check `newPassword === confirmNewPassword`, verify password cũ bằng `HashingService.compare`). Dùng chung response schema và `SharedUserRepository` với `user.controller.ts` (route quản trị của admin).

## Validation pipe — khác biệt với mặc định nestjs-zod

`CustomZodValidationPipe` (factory `createZodValidationPipe`) khác bản mặc định ở 2 điểm:
- Trả **422** thay vì 400.
- `path` convert từ mảng thành **chuỗi nối dấu chấm** (`'confirmNewPassword'` thay vì `['confirmNewPassword']`) — giúp FE dễ map lỗi field.

## Redis — hiện chưa dùng thật

`src/shared/redis.ts` toàn bộ nội dung (`ioredis` + `redlock`) đang bị **comment**. `docker-compose.yml` chỉ có service Postgres, không có Redis. Đừng mô tả hệ thống "có cache Redis" hay "có distributed lock" — chỉ là định hướng chưa triển khai (xem known-gaps.md).

## Seed script

`initialScript/index.ts` seed 3 role + 1 admin (env `ADMIN_*`). `initialScript/create-permissions.ts` quét route thực tế qua Express router, đồng bộ bảng `Permission`, gán quyền cho role theo danh sách module cố định:

```ts
SellerModule = ['AUTH', 'MEDIA', 'MANAGE-PRODUCT', 'PRODUCT-TRANSLATION', 'PROFILE', 'CART', 'ORDERS', 'REVIEWS']
ClientModule = ['AUTH', 'MEDIA', 'PROFILE', 'CART', 'ORDERS', 'REVIEWS']
// Admin: tất cả permission, không lọc module
```
Việc gán là **ghi đè hoàn toàn** (Prisma `set`), không phải cộng dồn — chạy lại script này sau khi thêm/sửa/xoá route.

## Tài liệu có sẵn (không lặp lại, tham chiếu khi cần)

- `docs/giai_thich_database.md` — giải thích 21 bảng Prisma theo 6 nhóm nghiệp vụ.
- `docs/huong_dan_phat_trien.md` — quy trình 9 bước thêm module mới (chưa đề cập file `.error.ts` tuỳ chọn — xem `architecture.md`).
