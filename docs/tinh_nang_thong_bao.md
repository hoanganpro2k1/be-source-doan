# Tính năng Thông báo (Notifications) real-time

## Tổng quan

Hệ thống thông báo cho phép người dùng (buyer, seller, admin) nhận thông báo real-time qua Socket.IO khi có sự kiện nghiệp vụ liên quan, đồng thời lưu lại lịch sử thông báo trong database để xem lại/đánh dấu đã đọc.

Trước khi có tính năng này, backend hoàn toàn chưa có model/module `Notification`. Model `Websocket` (map `socketId ↔ userId`) đã tồn tại sẵn trong schema nhưng không có code nào thao tác — cùng với đó, `payment.service.ts` có sẵn code Socket.IO bị comment (import trỏ tới file không tồn tại). Tính năng này viết lại toàn bộ phần đó theo đúng ý định thiết kế ban đầu.

## Kiến trúc

### Backend (`be-doan-24h`)

```
src/routes/notification/
├── notification.model.ts       # Zod schemas: Notification, GetNotificationsQuery/Res, GetUnreadCountRes
├── notification.dto.ts         # createZodDto wrappers
├── notification.repo.ts        # Prisma thuần: list, countUnread, markAsRead, markAllAsRead, create
├── notification.service.ts     # notify() = create() + emitToUser() qua gateway
├── notification.controller.ts  # Route /notifications (auth required)
├── notification.gateway.ts     # Socket.IO gateway, namespace /notifications
└── notification.module.ts      # Export NotificationService để domain khác dùng

src/shared/repositories/
└── shared-websocket.repo.ts    # CRUD bảng Websocket (socketId ↔ userId)
```

Model Prisma mới (`prisma/schema.prisma`):

```prisma
enum NotificationType {
  PAYMENT_SUCCESS
  ORDER_CREATED
  ORDER_STATUS_CHANGED
  ORDER_CANCELLED
}

model Notification {
  id        Int
  userId    Int
  type      NotificationType
  title     String
  message   String
  metadata  Json?      // vd { orderId, status } để FE điều hướng khi click
  readAt    DateTime?  // null = chưa đọc, có giá trị = đã đọc lúc nào
  createdAt DateTime
}
```

### API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/notifications` | Danh sách thông báo của chính user gọi (phân trang), trả kèm `unreadCount` |
| GET | `/notifications/unread-count` | Số thông báo chưa đọc — dùng cho badge số |
| PATCH | `/notifications/read-all` | Đánh dấu tất cả đã đọc |
| PATCH | `/notifications/:notificationId/read` | Đánh dấu 1 thông báo đã đọc |

Tất cả route yêu cầu đăng nhập (không `@IsPublic()`), luôn lọc theo `userId` của người gọi — không có khái niệm "xem thông báo của người khác".

### Socket.IO Gateway

- Namespace: `/notifications`.
- Client kết nối kèm `auth: { token: accessToken }` trong handshake.
- Gateway verify token bằng `TokenService.verifyAccessToken()` (dùng lại service JWT có sẵn, không qua HTTP Guard vì đó là middleware riêng cho HTTP).
- Token hợp lệ → client `join` room `userId-<id>` (dùng helper có sẵn `generateRoomUserId`), đồng thời ghi 1 record vào bảng `Websocket`.
- Token không hợp lệ/thiếu → gateway chủ động `disconnect()` (lưu ý: sự kiện `connect` phía client vẫn luôn fire trước do cơ chế của Socket.IO — client cần lắng nghe `disconnect` để biết bị từ chối).
- Khi ngắt kết nối (đóng tab, mất mạng...): xoá record `Websocket` tương ứng.
- `emitToUser(userId, notification)`: gửi event `'notification'` tới toàn bộ socket trong room của user đó.

### Nơi bắn thông báo (4 sự kiện)

Tất cả gọi qua `NotificationService.notify(...)` ở **lớp Service** (không phải Repo), theo đúng convention "Repo chỉ chứa Prisma thuần":

| Sự kiện | Vị trí code | Loại | Người nhận |
|---|---|---|---|
| Thanh toán thành công | `payment.service.ts::receiver` | `PAYMENT_SUCCESS` | Buyer |
| Tạo đơn hàng mới | `order.service.ts::create` | `ORDER_CREATED` | Seller (mỗi `shopId`) |
| Admin đổi trạng thái đơn hàng | `manage-order.service.ts::updateStatus` | `ORDER_STATUS_CHANGED` | Buyer |
| Buyer huỷ đơn hàng | `order.service.ts::cancel` | `ORDER_CANCELLED` | Seller |

### Permission

Route `/notifications` (module `NOTIFICATIONS`) đã được thêm vào cả `SellerModule` và `ClientModule` trong `initialScript/create-permissions.ts`. Sau khi thêm route mới thuộc module này, **luôn phải chạy lại**:

```
pnpm create-permissions
```

Nếu quên, Client/Seller sẽ nhận 403 dù token hợp lệ (chỉ Admin luôn full quyền mặc định).

---

## Frontend (`fe-doan-24h`)

```
src/types/notification.ts             # Notification, GetNotificationsParams/Response
src/services/notification.service.ts  # gọi API qua apiClient
src/hooks/use-notifications.ts        # useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead
src/hooks/use-notification-socket.ts  # kết nối Socket.IO, invalidate query khi có event mới
src/components/notification-popover.tsx  # UI popup dùng chung cho cả client & admin
```

- `useNotificationSocket()` được gọi 1 lần duy nhất trong `AuthProvider` (`src/providers/auth-provider.tsx`) — bọc toàn bộ app nên cả client site lẫn admin đều tự động có kết nối khi đã đăng nhập.
- Khi socket nhận event `'notification'`, hook chỉ `queryClient.invalidateQueries(...)` — không tự quản lý state thủ công, để react-query tự fetch lại danh sách/unread-count mới nhất (đúng convention "không dùng useState/useEffect thủ công để fetch").
- `NotificationPopover` là component dùng chung, nhận `triggerClassName` để style khớp với từng nơi:
  - Client: `src/components/layout/Header.tsx` — nút chuông cạnh giỏ hàng.
  - Admin: `src/app/(admin)/admin/layout.tsx` — nút chuông trong `HeaderRight`.

## Kiểm thử đã thực hiện

- Gateway từ chối đúng kết nối với token không hợp lệ (log `"Kết nối socket bị từ chối: jwt malformed"`, client nhận `disconnect` với reason `"io server disconnect"`).
- Gateway chấp nhận và duy trì kết nối với token hợp lệ, ghi đúng record vào bảng `Websocket`.
- `GET /notifications`, `GET /notifications/unread-count` trả đúng response shape, đúng 200/401.
- `create-permissions` chạy thành công, thêm đúng 4 permission mới, gán đúng cho Seller/Client/Admin.
- Typecheck sạch cả 2 dự án.

## Việc chưa làm / có thể mở rộng sau

- Chưa test end-to-end thật với luồng tạo đơn hàng/thanh toán thật (cần dữ liệu category/product/cart thật trong DB).
- Reviews mới, "duyệt sản phẩm" — không tồn tại trong hệ thống, không nằm trong phạm vi tính năng này.
- Redis pub/sub cho Socket.IO đa-instance — không cần ở quy mô hiện tại (1 instance).
