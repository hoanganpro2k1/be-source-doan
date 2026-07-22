# Auth & Authorization (module `auth`, `user`, `role`, `permission`)

## Luồng đăng ký (bắt buộc OTP email)

1. `POST /auth/otp` (public) — body `{ email, type: TypeOfVerificationCode }`. Nếu `type=REGISTER` mà email đã tồn tại → `EmailAlreadyExistsException`. Nếu `type=FORGOT_PASSWORD` mà email chưa tồn tại → `EmailNotFoundException`. Lưu `VerificationCode` (upsert theo unique `email+type`), `expiresAt = now + OTP_EXPIRES_IN` (env, hiện `5m`). Gửi qua `EmailService.sendOTP`.
2. `POST /auth/register` (public) — body `{ email, password, name, phoneNumber, confirmPassword, code }`. Validate `code` khớp `VerificationCode` (type `REGISTER`), role mặc định = `Client` (`SharedRoleRepository.getClientRoleId()`), password hash bằng `HashingService`, xoá verification code sau khi dùng.

User mới mặc định `status: INACTIVE` (default Prisma) — **không có bước "kích hoạt" tường minh nào sau OTP** trong service hiện tại.

## Đăng nhập

`POST /auth/login` (public) — body `{ email, password, totpCode?, code? }` (`superRefine` cấm gửi cả `totpCode` và `code` cùng lúc).

1. Tìm user theo email → sai → `EmailNotFoundException`.
2. So khớp password bằng `HashingService.compare` → sai → `InvalidPasswordException`.
3. Nếu user đã bật 2FA (`totpSecret` khác null): bắt buộc có `totpCode` (verify TOTP) hoặc `code` (OTP email type `LOGIN`), thiếu cả hai → `InvalidTOTPAndCodeException`.
4. Tạo `Device` mới (mỗi lần login luôn tạo device mới, không merge theo user-agent trùng).
5. `generateTokens({ userId, deviceId, roleId, roleName })` → trả `{ accessToken, refreshToken }`.

## Refresh token — cơ chế rotation (single-use)

`POST /auth/refresh-token` (public):

1. Verify chữ ký JWT refresh token → lấy `userId`.
2. Tìm bản ghi trong bảng `RefreshToken` theo token — **không tồn tại** (đã bị xoá vì đã dùng 1 lần trước đó) → `RefreshTokenAlreadyUsedException` (401, dấu hiệu token bị đánh cắp/tái sử dụng).
3. Update `Device` (ip, userAgent mới), xoá refresh token cũ, sinh cặp token mới — cả 3 việc chạy song song.

`RefreshToken` **luôn bị xoá cứng khỏi DB ngay sau khi dùng** — mọi endpoint mới liên quan phiên đăng nhập phải tuân theo pattern: verify JWT trước, sau đó bắt buộc kiểm tra tồn tại trong DB (không chỉ tin JWT còn hạn).

## Đăng xuất

`POST /auth/logout` — **cần access token**. Xoá `RefreshToken`, set `Device.isActive = false`.

## Quên mật khẩu

`POST /auth/forgot-password` (public) — body `{ email, code, newPassword, confirmNewPassword }`, validate OTP type `FORGOT_PASSWORD`, hash mật khẩu mới.

## 2FA / TOTP

Dùng thư viện `otpauth` (`TwoFactorService`), `algorithm: SHA1, digits: 6, period: 30`, verify `window: 1`.

- `POST /auth/2fa/setup` (cần login) — body rỗng bắt buộc (dùng POST thay GET để tránh trigger qua URL trình duyệt). Trả `{ secret, uri }` để FE tự vẽ QR.
- `POST /auth/2fa/disable` (cần login) — body `{ totpCode?, code? }`, bắt buộc đúng 1 trong 2 (`superRefine`).

## Google OAuth

- `GET /auth/google-link` (public) — trả `{ url }`, `state` = base64(`{userAgent, ip}`).
- `GET /auth/google/callback` (public, redirect) — nếu email chưa tồn tại thì **tự động đăng ký** (role `Client`, password ngẫu nhiên bằng `uuid()` đã hash, `avatar` lấy từ Google) rồi tạo Device + token như login thường, redirect về `GOOGLE_CLIENT_REDIRECT_URI?accessToken=...&refreshToken=...`.

**Lưu ý**: user đăng ký qua Google không set password thật — họ không đăng nhập được bằng password thường trừ khi dùng "quên mật khẩu" để đặt lại.

## JWT

| | Access Token | Refresh Token |
|---|---|---|
| Payload tạo | `{ userId, deviceId, roleId, roleName }` + `uuid` | `{ userId }` + `uuid` |
| Secret | `ACCESS_TOKEN_SECRET` | `REFRESH_TOKEN_SECRET` |
| Hạn (env hiện tại) | `1h` | `7d` |
| Lưu DB? | Không | Có (bảng `RefreshToken`, unique `token`) |
| Revoke | Không cần (ngắn hạn) | Xoá bản ghi DB = revoke ngay lập tức |

Payload **không chứa danh sách permission chi tiết** — permission được query real-time mỗi request trong `AccessTokenGuard` (không cache), nên revoke quyền của 1 role có hiệu lực ngay ở request tiếp theo, không cần chờ token hết hạn.

## Cơ chế phân quyền (RBAC theo path + method)

`AccessTokenGuard.validateUserPermission`:

```ts
prismaService.role.findFirstOrThrow({
  where: { id: roleId, deletedAt: null, isActive: true },
  include: { permissions: { where: { deletedAt: null, path, method } } },
})
```

Nếu `role.permissions.length === 0` (không permission nào khớp đúng `path`+`method` hiện tại) → `ForbiddenException`. **Quyền không dựa trên tên permission tuỳ ý** (kiểu `user:create`) mà dựa trên khớp chính xác route — vì vậy mọi route mới bắt buộc phải có bản ghi `Permission` tương ứng (chạy `initialScript/create-permissions.ts`).

Quan hệ Prisma: `User.roleId → Role.id` (1 role/user), `Role` ↔ `Permission` nhiều-nhiều qua bảng ngầm `"PermissionToRole"`.

## Decorator quan trọng

- `@IsPublic()` = `@Auth([AuthType.None])` — bỏ hoàn toàn xác thực.
- `@ActiveUser(field?)` — đọc payload access token đã decode (`request['user']`).
- `@ActiveRolePermissions(field?)` — đọc `Role` (kèm permissions đã lọc theo path/method) gán bởi `AccessTokenGuard` (`request['role_permissions']`). Dùng để lấy `roleName` khi cần kiểm tra business rule (ví dụ chỉ Admin mới được thao tác Admin).

## Business rule quan trọng — User/Role/Permission CRUD

- **Không tự cập nhật/xoá chính mình** ở `PUT/DELETE /users/:userId` → `CannotUpdateOrDeleteYourselfException`.
- **Chỉ Admin agent mới được tạo/sửa user có role đích là Admin** — so sánh `roleName` của người gọi (từ `@ActiveRolePermissions('name')`) với `RoleName.Admin`, không tin `roleId` client gửi; với update/delete luôn lấy roleId **hiện tại trong DB của user target**, không dùng giá trị request body.
- **3 role gốc (`Admin/Client/Seller`) không được sửa/xoá qua API Role** → `ProhibitedActionOnBaseRoleException`.
- `PUT /roles/:roleId` dùng Prisma `set` cho `permissionIds` — **thay thế toàn bộ** danh sách permission, không phải thêm.
- Trùng `path`+`method` khi tạo Permission → `PermissionAlreadyExistsException`.

## Enum chính xác

```ts
UserStatus = { ACTIVE, INACTIVE, BLOCKED }          // default INACTIVE khi tạo user
RoleName = { Admin: 'ADMIN', Client: 'CLIENT', Seller: 'SELLER' }
TypeOfVerificationCode = { REGISTER, FORGOT_PASSWORD, LOGIN, DISABLE_2FA }
HTTPMethod = { GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD }
AuthType = { Bearer: 'Bearer', None: 'None', PaymentAPIKey: 'PaymentAPIKey' }
ConditionGuard = { And: 'and', Or: 'or' }
```

## Profile vs User module

- `GET/PUT /profile`, `PUT /profile/change-password` — luôn thao tác trên **chính user đang đăng nhập** (`userId` từ token), chỉ sửa được `name, phoneNumber, avatar`.
- `GET/POST/PUT/DELETE /users/...` — dành cho admin quản lý user khác, nhận `userId` từ URL param, có thể đổi thêm `roleId`, `status`.
- Cả hai dùng chung `SharedUserRepository` và response schema (`GetUserProfileResDTO`, `UpdateProfileResDTO`) để tránh lặp code.

## Điểm cần lưu ý khi code thêm

1. Luôn hash password qua `HashingService`, không gọi `bcrypt` trực tiếp.
2. Route mới cần Permission tương ứng, nếu không sẽ luôn 403 dù token hợp lệ.
3. Response luôn qua Zod schema (`@ZodResponse`) — không trả `password`/`totpSecret` (dùng `.omit()`).
4. Repo có `@SerializeAll()` (User/Role/Permission repo) tự JSON serialize kết quả — Date thành ISO string tự động.
5. OTP luôn kèm `type` — thêm nghiệp vụ OTP mới thì thêm giá trị `TypeOfVerificationCode`, tái dùng `validateVerificationCode`, không viết lại logic riêng.
6. 2FA dùng `superRefine` để đảm bảo invariant loại trừ giữa `totpCode`/`code` — giữ nguyên cách này khi mở rộng.
