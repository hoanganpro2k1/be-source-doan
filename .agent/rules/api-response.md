# Quy tắc Response & Error

## Response thành công

Không có envelope chung. Response trả **thẳng object** theo đúng shape của Zod schema khai báo trong `@ZodResponse({ type: XxxDTO })`. `ZodSerializerInterceptor` (global, đăng ký qua `APP_INTERCEPTOR`) tự động strip mọi field không có trong schema.

```ts
// Đúng
@ZodResponse({ type: GetBrandDetailResDTO })
async getById(@Param('id') id: string) {
  return this.brandService.findById(+id); // trả thẳng object Brand, không bọc { data: ... }
}
```

Không tự thêm wrapper `{ data, statusCode }` — `TransformInterceptor` định nghĩa envelope này tồn tại trong code nhưng **không được đăng ký**, đừng dùng làm căn cứ.

## Response lỗi

- Lỗi validate Zod (body/query/param sai schema): HTTP **422**, body dạng mảng:
```json
[{ "path": "confirmNewPassword", "message": "Error.ConfirmPasswordNotMatch", "code": "custom" }]
```
`path` là chuỗi nối bằng dấu chấm (`'brandTranslations.0.name'` nếu lỗi lồng), không phải mảng.

- Exception nghiệp vụ tự throw trong service: nên giữ **cùng format mảng `[{ path, message }]`** để đồng nhất với validation pipe, dùng `UnprocessableEntityException`:
```ts
export const BrandTranslationAlreadyExistsException = new UnprocessableEntityException([
  { path: 'languageId', message: 'Error.BrandTranslationAlreadyExists' },
]);
```

- Message luôn theo convention `Error.XxxYyy` (PascalCase sau `Error.`) để tương thích `nestjs-i18n`, dù phần lớn key hiện chưa có bản dịch thật trong `src/i18n/{en,vi}/error.json` (chỉ có `NOT_FOUND`).

## Filter đang active

Chỉ có `HttpExceptionFilter` (`@Catch(HttpException)`) đang đăng ký — chỉ bắt lỗi kiểu `HttpException` (bao gồm mọi exception ném từ Nest như `NotFoundException`, `UnprocessableEntityException`...), log thêm khi lỗi là `ZodSerializationException` rồi ủy quyền cho `BaseExceptionFilter` mặc định của Nest.

`CatchEverythingFilter` (bắt mọi exception kể cả non-HTTP, xử lý riêng Prisma unique constraint → 409) có code sẵn nhưng **không active** — nếu ném lỗi không phải `HttpException` (ví dụ lỗi Prisma chưa được bắt/map thủ công), nó sẽ không được filter đặc biệt xử lý, rơi vào exception handler mặc định của Nest.

## Khi viết exception mới cho 1 domain

- Nếu domain cần message riêng biệt (không phải lỗi chung như not-found), tạo file `<domain>.error.ts`, export hằng số kiểu:
```ts
export const XxxNotFoundException = new NotFoundException('Error.XxxNotFound');
export const XxxAlreadyExistsException = new UnprocessableEntityException([
  { path: 'fieldName', message: 'Error.XxxAlreadyExists' },
]);
```
- Bắt lỗi Prisma unique constraint bằng helper có sẵn (`isUniqueConstraintPrismaError`, xem cách dùng trong `brand-translation.repo.ts`/`category-translation.repo.ts`), không tự parse `error.code` thủ công.
- Bắt lỗi Prisma not-found bằng `isNotFoundPrismaError` (xem `order.repo.ts`, `auth.service.ts`).
