# Luồng mua hàng (module `product`, `cart`, `order`, `payment`)

## Tổng quan luồng, từng bước

1. **Buyer thêm SKU vào giỏ hàng** — `POST /cart`, body `{ skuId, quantity }`. Validate SKU tồn tại/còn hàng/sản phẩm đã publish; nếu SKU đã có trong giỏ thì **cộng dồn quantity** (`upsert` theo unique `userId_skuId`).
2. **Buyer xem giỏ hàng** — `GET /cart?page=&limit=`, nhóm theo `shop` (= `Product.createdById`).
3. **Buyer tạo đơn hàng** — `POST /orders`, body là **mảng** theo từng shop: `[{ shopId, receiver: { name, phone, address }, cartItemIds: number[] }]`. Trong 1 `$transaction`:
   - Lấy cart items, kiểm tra đủ số lượng, đủ tồn kho, sản phẩm chưa xoá/ẩn.
   - Kiểm tra `sku.createdById === shopId` khai báo → sai thì `SKUNotBelongToShopException`.
   - Tạo 1 `Payment` (`status: PENDING`) dùng chung cho mọi order trong request.
   - Với mỗi shop: tạo 1 `Order` (`status: PENDING_PAYMENT`) + snapshot từng item thành `ProductSKUSnapshot`.
   - Xoá cart item đã dùng, trừ tồn kho SKU (optimistic locking, xem mục "Race condition").
   - Response: `{ orders: Order[], paymentId }`.
4. **Buyer thanh toán** — không có endpoint tạo giao dịch trong code. Buyer tự chuyển khoản qua SePay với nội dung chứa `PREFIX_PAYMENT_CODE + paymentId` (ví dụ `DOAN123`). Không có API tạo QR ở backend — FE tự build QR VietQR từ `paymentId`.
5. **Webhook xác nhận thanh toán** — `POST /payment/receiver`, bảo vệ bởi `PaymentAPIKeyGuard` (`Authorization: Bearer <PAYMENT_API_KEY>`, không phải JWT user). Body theo format SePay (`id, gateway, transactionDate, accountNumber, code, content, transferAmount, ...`).
   - Chống trùng: nếu `PaymentTransaction.id = body.id` đã tồn tại → từ chối ngay (idempotency key = ID giao dịch ngân hàng).
   - Parse `paymentId` từ `body.code`/`body.content`, tính tổng tiền các order thuộc payment đó, so khớp với `body.transferAmount` — không khớp thì không cập nhật gì.
   - Khớp: `Payment.status = SUCCESS`, **toàn bộ Order thuộc payment đó** → `PENDING_PICKUP`.
6. **Cấp quyền sở hữu (`UserOwnership`) & tải file** — **CHƯA ĐƯỢC IMPLEMENT** trong code hiện tại (xem `.agent/decisions/known-gaps.md`). Đây là phần cần bổ sung khi được giao việc liên quan tải file sau khi mua.

## Model Product / SKU

`Product` có field không nằm trong `ProductSchema` (Zod response) nhưng có trong Prisma: `demoUrl`, `githubUrl`, `documentation`, `version` (default `"1.0.0"`), `techStack: string[]`. Nếu cần trả các field này ra API, phải bổ sung vào `ProductSchema`.

**`variants` (Json field)** — cấu trúc thật (`VariantsSchema` trong `shared-product.model.ts`):

```ts
Variant = { value: string, options: string[] }
Variants = Variant[]   // validate không trùng value/option, case-insensitive
```

Ví dụ: `[{ value: "Gói license", options: ["Personal", "Commercial", "Enterprise"] }]`.

SKU được sinh tự động từ variants (hàm `generateSKUs`): tổ hợp Cartesian các `options`, nối bằng `-` (ví dụ `"Personal-Basic"`), mỗi tổ hợp → 1 SKU mặc định `{ value, price: 0, stock: 100, image: '' }`. Khi tạo/sửa Product, server validate số lượng + thứ tự SKU client gửi phải khớp đúng tổ hợp tính được.

**"Seller" không phải model riêng** — là `User` mà `Product.createdById` trỏ tới. `SKU.createdById` luôn = `Product.createdById` (set chung lúc tạo Product). `Order.shopId` lưu seller nhận đơn, được validate khớp với `SKU.createdById` của các item trong order.

**Brand ↔ Product**: 1-N chuẩn (`Product.brandId → Brand.id`).

## Giỏ hàng — chi tiết logic

`CartRepo.create` dùng `upsert` theo unique `(userId, skuId)`:
```ts
update: { quantity: { increment: body.quantity } }   // cộng dồn nếu đã có
create: { userId, skuId, quantity }
```
Validate (`validateSKU`): SKU không tồn tại/đã xoá → `NotFoundSKUException`; nếu create và đã có sẵn trong giỏ, tổng quantity mới+cũ vượt tồn kho → `InvalidQuantityException`; tồn kho không đủ → `OutOfStockSKUException`; sản phẩm đã xoá/chưa publish/publish trong tương lai → `ProductNotFoundException`.

Đây chỉ là **soft check tại thời điểm thêm giỏ hàng** — không lock hàng, vẫn có thể hết hàng thật khi tạo order (xử lý ở bước tạo order, xem race condition bên dưới).

## Enum Order

```ts
OrderStatus = { PENDING_PAYMENT, PENDING_PICKUP, PENDING_DELIVERY, DELIVERED, RETURNED, CANCELLED }
```

**Luồng chuyển trạng thái đã implement:**

| Từ | Đến | Ai | Nơi |
|---|---|---|---|
| (mới) | `PENDING_PAYMENT` | Buyer (`POST /orders`) | `order.repo.ts` |
| `PENDING_PAYMENT` | `CANCELLED` | Buyer (`PUT /orders/:orderId`) | chỉ cho phép nếu đang `PENDING_PAYMENT`, ngược lại `CannotCancelOrderException` |
| `PENDING_PAYMENT` | `PENDING_PICKUP` | Hệ thống (webhook) | `payment.repo.ts` |

**Không có code chuyển `PENDING_PICKUP → PENDING_DELIVERY → DELIVERED/RETURNED`** và không có endpoint cho seller/admin cập nhật trạng thái giao hàng — cần tạo mới nếu được giao việc này (xem `known-gaps.md`).

`ProductSKUSnapshot` = bảng "order items", lưu bản chụp `productName, skuPrice, image, skuValue, quantity, productTranslations` tại thời điểm mua — để lịch sử đơn hàng không bị ảnh hưởng khi seller đổi giá/tên/xoá sản phẩm gốc sau này.

## Thanh toán

`PaymentAPIKeyGuard` — so `Authorization: Bearer <token>` với env `PAYMENT_API_KEY`, dùng cho request webhook từ SePay (không liên quan JWT user thường). Áp dụng qua `@Auth(['PaymentAPIKey'])`.

Idempotency: check `PaymentTransaction.id` (= ID giao dịch SePay) đã tồn tại **trước khi** vào transaction xử lý — nếu SePay gọi lại webhook trùng (retry) thì bị chặn ngay. Lưu ý: đây là check-then-act ngoài transaction, không tuyệt đối an toàn nếu 2 webhook trùng ID đến đồng thời cực sát nhau (xem known-gaps).

## Race condition khi tạo order (optimistic locking)

`OrderRepo.create` xử lý trong `$transaction`, trừ tồn kho bằng:

```ts
await tx.sKU.update({
  where: { id: sku.id, updatedAt: sku.updatedAt, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
})
```

Nếu giữa lúc đọc và lúc update, SKU đã bị sửa (đổi `updatedAt`) hoặc hết tồn kho, `update` không match record nào → Prisma not-found error → map thành `VersionConflictException`. Toàn bộ nằm trong 1 transaction nên nếu 1 SKU lỗi, cả order rollback.

Có sẵn code mẫu dùng `redlock` (Redis distributed lock trên `lock:sku:${skuId}`) và raw `SELECT ... FOR UPDATE` nhưng **đang bị comment/tắt** — có thể bật lại khi cần chống race condition mạnh hơn ở traffic cao, nhưng phải đi cùng với việc bật Redis thật (xem known-gaps).

## UserOwnership & download (chưa implement — xem known-gaps.md)

Model đã có trong schema (`userId, productId, skuId, downloadUrl, downloadCount`, unique `(userId, productId)`) nhưng **không có code nào tạo/đọc nó**. Hạ tầng presigned URL S3 đã sẵn (`S3Service.createPresignedUrlWithClient`, hiện dùng cho **upload**, dùng `PutObjectCommand`) — muốn làm download cần viết mới dùng `GetObjectCommand` + `getSignedUrl` để sinh `downloadUrl` có thời hạn.
