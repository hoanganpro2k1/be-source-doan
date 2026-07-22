# Đã biết nhưng chưa triển khai (đọc trước khi "sửa" các phần này)

Đây là danh sách các phần **có code sẵn trong repo nhưng chưa thực sự hoạt động**, hoặc **thiếu hẳn logic** dù model/hạ tầng đã có. Không tự ý bật lại/hoàn thiện các mục này nếu người dùng không yêu cầu rõ ràng — vì chúng có thể đang tắt có chủ đích (ví dụ chưa test kỹ, hoặc đổi hướng thiết kế).

## 1. Redis — hoàn toàn chưa dùng

`src/shared/redis.ts` toàn bộ nội dung (`ioredis`, `redlock`) đang bị comment. `docker-compose.yml` chỉ có Postgres. `CacheModule` (`@nestjs/cache-manager`) được import ở `app.module.ts` nhưng không thấy cấu hình Redis store cụ thể nào.

**Không mô tả hệ thống là "có cache/lock Redis"**. Nếu được giao việc cần Redis (ví dụ chống race condition mạnh hơn khi mua hàng), phải: bật `redis.ts`, thêm Redis service vào `docker-compose.yml`, rồi mới dùng `redlock` theo code mẫu sẵn có trong `order.repo.ts` (đang bị comment: raw `SELECT ... FOR UPDATE` + `redlock.acquire('lock:sku:${skuId}')`).

## 2. BullMQ / Queue — bị tắt hoàn toàn

`order.producer.ts`, `payment.producer.ts`, và phần `BullModule`/`InjectQueue` trong `order.module.ts`/`payment.module.ts` đều bị comment. Không có `Processor`/`@Process` handler nào tồn tại trong `src/` (đã xác nhận bằng grep).

Hệ quả trực tiếp: **không có job tự động huỷ đơn `PENDING_PAYMENT` quá hạn**. Vì tồn kho SKU đã bị trừ ngay khi tạo order (bước tạo order thành công), nếu buyer bỏ ngang không thanh toán, hàng bị "giữ chỗ" vô thời hạn trừ khi buyer tự bấm huỷ qua `PUT /orders/:orderId`.

**Nếu được giao việc "tự động huỷ đơn chưa thanh toán sau X giờ"**: bật lại `OrderProducer.addCancelPaymentJob` (delay 24h có sẵn trong code) + `PaymentProducer.removeJob`, viết thêm Processor xử lý job — hiện chưa có file Processor nào để tham khảo, phải viết mới.

## 3. Hoàn kho khi huỷ đơn — chưa có (có thể coi là bug)

`OrderRepo.cancel()` chỉ đổi `status = CANCELLED`, **không hoàn trả `stock` cho SKU** đã trừ lúc tạo order. Nếu được yêu cầu sửa luồng huỷ đơn, cần thêm bước `increment` lại stock trong cùng transaction.

## 4. UserOwnership — model có, logic không có

Bảng `UserOwnership` (`userId, productId, skuId, downloadUrl, downloadCount`, unique `(userId, productId)`) tồn tại trong `schema.prisma` nhưng **không có bất kỳ dòng code TypeScript nào trong `src/` thao tác với nó** (đã grep, 0 kết quả).

Đây là phần **AI cần tự viết mới hoàn toàn** khi được yêu cầu làm tính năng "buyer tải file sau khi mua". Khuyến nghị (không phải đã có sẵn):
- Hook vào cuối `PaymentRepo.receiver` (trong cùng transaction khi set order `PENDING_PICKUP`), loop qua `ProductSKUSnapshot` của các order vừa thanh toán, `upsert UserOwnership` theo `(userId, productId)`.
- `downloadUrl`: dùng `GetObjectCommand` + `getSignedUrl` (S3, đọc — khác với `PutObjectCommand` hiện có cho upload) để sinh URL có thời hạn.
- `downloadCount`: hiện chỉ là field đếm, schema chưa có giới hạn tối đa — nếu cần giới hạn số lần tải phải tự thêm logic chặn.

## 5. Endpoint chuyển trạng thái đơn hàng giao vận — chưa có

Luồng `OrderStatus` hiện chỉ có: tạo (`PENDING_PAYMENT`) → buyer huỷ (`CANCELLED`) → hệ thống xác nhận thanh toán (`PENDING_PICKUP`). **Không có endpoint nào cho seller/admin chuyển `PENDING_PICKUP → PENDING_DELIVERY → DELIVERED`/`RETURNED`.** Nếu được giao việc này, cần tạo mới controller method + guard theo `roleName` hoặc `Order.shopId === userId` (tương tự pattern `ManageProductService.validatePrivilege`).

## 6. TransformInterceptor — có code, không đăng ký

`src/shared/interceptor/transform.interceptor.ts` định nghĩa envelope `{ data, statusCode }` nhưng **không xuất hiện trong `providers` của `app.module.ts`**. Response thực tế hiện tại KHÔNG có envelope này — trả thẳng object theo Zod schema. Đừng giả định mọi response có field `data` bọc ngoài.

## 7. CatchEverythingFilter — có code, bị comment

Filter này xử lý riêng lỗi Prisma unique constraint (trả 409) và bắt mọi exception (không chỉ `HttpException`), nhưng dòng đăng ký `APP_FILTER` trong `app.module.ts` đang bị comment. Filter đang active thực sự chỉ là `HttpExceptionFilter` (chỉ bắt `HttpException`, log thêm khi là lỗi Zod serialize).

## 8. react-email template — có code, không được dùng

`emails/otp.tsx` (thư mục root, dùng `@react-email/components`) là component email OTP viết sẵn, nhưng `EmailService.sendOTP` thực tế đang gửi bằng **file HTML tĩnh** (`src/shared/email-templates/otp.html`, thay placeholder bằng `String.replaceAll`), không import/render component `.tsx` này. Đừng nói hệ thống "render email bằng React" — code 2 phần đang lệch nhau.

## 9. i18n — chỉ có 1 key dịch thật

`src/i18n/{en,vi}/error.json` hiện chỉ định nghĩa đúng key `NOT_FOUND`. Rất nhiều exception dùng message dạng `Error.XxxYyy` (ví dụ `Error.InvalidPassword`, `Error.BrandTranslationAlreadyExists`) nhưng **chưa có bản dịch tương ứng trong file JSON** — client nhận thẳng chuỗi khoá thô, không phải câu tiếng Việt/Anh đã dịch. Khi thêm exception mới theo đúng convention `Error.Xxx`, cân nhắc hỏi người dùng có cần bổ sung bản dịch thật hay giữ nguyên hiện trạng.

## 10. Serve file static local — gần như vô dụng

`GET /media/static/:filename` serve file từ `upload/`, nhưng luồng upload chính (A) luôn xoá file local ngay sau khi đẩy S3 thành công — endpoint này hầu như không có file để trả trong vận hành bình thường.
