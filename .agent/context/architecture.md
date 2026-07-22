# Kiến trúc tổng thể

## Stack

- **NestJS 11** + **Prisma 7** (PostgreSQL, output client tại `src/generated/prisma`)
- **Zod validation** qua `nestjs-zod` — KHÔNG dùng `class-validator`/`class-transformer` ở bất kỳ đâu
- **nestjs-i18n** cho đa ngôn ngữ message lỗi
- **AWS S3** cho lưu trữ file (ảnh sản phẩm, avatar)
- **Resend** cho gửi email (hiện chỉ gửi OTP)
- **BullMQ + Redis**: có khai báo nhưng **đang tắt hoàn toàn** (xem `.agent/decisions/known-gaps.md`)

## Providers toàn cục (`app.module.ts`)

```ts
providers: [
  AppService,
  { provide: APP_PIPE, useClass: CustomZodValidationPipe },
  { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  { provide: APP_FILTER, useClass: HttpExceptionFilter },
  // CatchEverythingFilter — CÓ code nhưng đang bị comment, KHÔNG active
]
```

Guard toàn cục đăng ký ở `SharedModule` (không phải `AppModule`):

```ts
{ provide: APP_GUARD, useClass: AuthenticationGuard }
```

## Luồng xử lý 1 request

```
Client
  → AuthenticationGuard (đọc metadata @Auth, mặc định Bearer)
    → AccessTokenGuard (verify JWT + check Permission theo path+method) | PaymentAPIKeyGuard | bỏ qua nếu @IsPublic()
  → CustomZodValidationPipe (validate body/query/param theo Zod schema, lỗi → 422)
  → Controller
  → Service (business logic)
  → Repo (Prisma thuần, có @SerializeAll() ở một số repo để chuẩn hoá Date → ISO string)
  → ZodSerializerInterceptor (strip field theo @ZodResponse schema)
  → HttpExceptionFilter (log thêm nếu là ZodSerializationException, rồi ủy quyền cho Nest BaseExceptionFilter)
  → Client
```

**Quan trọng**: response KHÔNG có envelope `{ data, statusCode }` — trả thẳng object theo đúng shape Zod schema. `TransformInterceptor` có code định nghĩa envelope này nhưng **không được đăng ký**, đừng giả định nó đang hoạt động.

## Danh sách module đã đăng ký (`app.module.ts`)

```
AuthModule, LanguageModule, PermissionModule, RoleModule, ProfileModule,
UserModule, MediaModule, BrandModule, BrandTranslationModule,
CategoryModule, CategoryTranslationModule, ProductModule,
ProductTranslationModule, CartModule, OrderModule, PaymentModule
```

`ReviewModule` được import nhưng dòng đăng ký đang **comment** trong `app.module.ts` — Review/Message/Websocket có model Prisma nhưng chưa có route module tương ứng được bật.

## Quy ước đặt tên file mỗi domain (`src/routes/<domain>/`)

| File | Vai trò |
|---|---|
| `<domain>.module.ts` | Đăng ký DI |
| `<domain>.controller.ts` | Nhận request, gọi service, khai báo `@ZodResponse` |
| `<domain>.service.ts` | Business logic |
| `<domain>.repo.ts` | CHỈ thao tác Prisma |
| `<domain>.dto.ts` | `class XxxDTO extends createZodDto(XxxSchema)` |
| `<domain>.model.ts` | Zod schema thuần + `type Xxx = z.infer<typeof XxxSchema>` |
| `<domain>.error.ts` (tùy chọn) | Exception nghiệp vụ riêng, dạng `export const XxxException = new UnprocessableEntityException([{ path, message: 'Error.Xxx' }])` |

Domain có bản dịch đa ngôn ngữ (Brand, Category, Product, User) có thêm module con `<domain>-translation/` với cùng cấu trúc 6-7 file trên, route riêng (ví dụ `/brand-translations`, không lồng dưới `/brands/:id/translations`).

## Shared layer quan trọng (`src/shared/`)

- `config.ts` — load `.env` qua Zod schema (`configSchema`), fail-fast (`process.exit(1)`) nếu thiếu biến bắt buộc. Xem toàn bộ danh sách biến env trong file này trước khi thêm biến mới.
- `guards/` — `AuthenticationGuard` (điều phối), `AccessTokenGuard` (verify JWT + check Permission), `PaymentAPIKeyGuard` (webhook thanh toán)
- `decorators/` — `@IsPublic()`, `@Auth([...])`, `@ActiveUser(field?)`, `@ActiveRolePermissions(field?)`, `@UserAgent()`
- `services/` — `PrismaService`, `HashingService` (bcrypt, saltRounds=10), `TokenService` (JWT sign/verify), `TwoFactorService` (TOTP), `EmailService` (Resend), `S3Service`
- `pipes/custom-zod-validation.pipe.ts` — validate lỗi trả **422** (không phải 400 mặc định của nestjs-zod), `path` là chuỗi nối dấu chấm thay vì mảng
- `filters/` — `HttpExceptionFilter` (đang active), `CatchEverythingFilter` (có code, KHÔNG active)
- `repositories/shared-user.repo.ts`, `shared-role.repo.ts` — dùng chung giữa nhiều module (auth, profile, user)

## Response & lỗi

- Response thành công: object thẳng theo Zod schema, không có wrapper.
- Lỗi validate (Zod): HTTP 422, body là mảng `[{ path: 'field.path', message: 'Error.Xxx', code, ... }]`.
- Lỗi nghiệp vụ tự throw: dùng cùng format `[{ path, message }]` để đồng nhất với validation pipe.
- Message lỗi dùng convention `Error.XxxYyy` để tương thích `nestjs-i18n`, nhưng **file dịch `src/i18n/{en,vi}/error.json` hiện chỉ có đúng 1 key `NOT_FOUND`** — phần lớn message `Error.Xxx` khác chưa có bản dịch, trả thẳng chuỗi khoá ra client. Khi thêm exception mới, cân nhắc bổ sung luôn bản dịch tương ứng nếu cần UX tốt hơn.

## Seed & Permission

- `initialScript/index.ts` — seed 3 role (`Admin`, `Client`, `Seller`) + 1 tài khoản Admin đầu tiên từ biến env `ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME/ADMIN_PHONE_NUMBER`. Chỉ chạy được khi DB chưa có Role nào (dừng nếu `roleCount > 0`).
- `initialScript/create-permissions.ts` — quét toàn bộ route thực tế đăng ký trong code (qua Express router), đồng bộ bảng `Permission` (xoá permission ứng với route đã bị xoá khỏi code, tạo mới permission ứng với route mới), rồi gán lại permission cho 3 role theo danh sách module cố định khai báo cứng trong file. **Phải chạy lại script này sau khi thêm/sửa/xoá route** để RBAC hoạt động đúng, nếu không endpoint mới sẽ luôn trả 403.
