# 📖 TÀI LIỆU GIẢI THÍCH CHI TIẾT CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

Tài liệu này giải thích chi tiết cấu trúc file [schema.prisma](file:///d:/SourceDoan/be-source-doan/prisma/schema.prisma) của dự án **Website bán Source Code (Digital Products)**. Cơ sở dữ liệu sử dụng hệ quản trị **PostgreSQL**, được thiết kế theo chuẩn hóa cao, hỗ trợ phân quyền chặt chẽ, đa ngôn ngữ và tối ưu hóa cho thanh toán tự động.

---

## 🗺️ Bản Đồ Phân Loại Các Nhóm Bảng (Model Groups)

Để dễ quản lý, 21 bảng (models) trong cơ sở dữ liệu được chia làm 6 nhóm nghiệp vụ chính:

| Nhóm Nghiệp Vụ | Các Bảng (Models) Liên Quan |
| :--- | :--- |
| **1. Xác thực & Bảo mật** | `User`, `VerificationCode`, `Device`, `RefreshToken` |
| **2. Phân quyền (RBAC)** | `Role`, `Permission` |
| **3. Quản lý Source Code** | `Product`, `SKU` (License), `Category`, `Brand`, `UserOwnership` |
| **4. Đa ngôn ngữ (Localization)** | `Language`, `UserTranslation`, `ProductTranslation`, `CategoryTranslation`, `BrandTranslation` |
| **5. Giỏ hàng & Đơn hàng** | `CartItem`, `Order`, `ProductSKUSnapshot`, `Payment`, `PaymentTransaction` |
| **6. Tương tác & Real-time** | `Review`, `ReviewMedia`, `Message`, `Websocket` |

---

## 📘 Giải Thích Chi Tiết Từng Bảng (Models)

### Nhóm 1: Xác thực & Bảo mật (Authentication & Security)

#### 1. Bảng `User` (Người dùng)
* **Chức năng:** Lưu trữ thông tin tài khoản của khách hàng, admin, developer.
* **Đặc điểm thiết kế:**
  * Hỗ trợ bảo mật 2 lớp Google Authenticator (`totpSecret`).
  * **Cơ chế Audit Trail (Ghi dấu vết) 🌟:** Có mối quan hệ tự liên kết (Self-relation) phức tạp (`createdById`, `updatedById`, `deletedById`) để ghi lại lịch sử: tài khoản này do ai tạo, ai sửa, ai xóa (rất hữu ích trong môi trường quản lý doanh nghiệp).
  * Hỗ trợ lưu trữ thiết bị đăng nhập, giỏ hàng, lịch sử đơn hàng, tin nhắn và quyền sở hữu source code.

#### 2. Bảng `VerificationCode` (Mã xác thực OTP)
* **Chức năng:** Lưu trữ mã OTP 6 số gửi qua email cho các hành động cần bảo mật.
* **Các trường quan trọng:**
  * `type`: Kiểu xác thực (`REGISTER`, `FORGOT_PASSWORD`, `LOGIN`, `DISABLE_2FA`).
  * `expiresAt`: Thời gian hết hạn của OTP để kiểm tra tính hợp lệ.

#### 3. Bảng `Device` (Thiết bị đăng nhập)
* **Chức năng:** Theo dõi các thiết bị mà người dùng dùng để đăng nhập.
* **Các trường quan trọng:**
  * `userAgent`: Lưu thông tin trình duyệt & hệ điều hành (ví dụ: Chrome on Windows).
  * `ip`: Địa chỉ IP của thiết bị.
  * `isActive`: Trạng thái thiết bị (đăng nhập hay đã logout). Giúp phát hiện đăng nhập lạ và hỗ trợ tính năng **"Đăng xuất khỏi thiết bị khác"**.

#### 4. Bảng `RefreshToken` (Token làm mới phiên đăng nhập)
* **Chức năng:** Lưu trữ token dùng để lấy Access Token mới mà không cần bắt người dùng đăng nhập lại liên tục.
* **Quan hệ:** Liên kết chặt chẽ với cả `User` và `Device` để kiểm soát bảo mật theo từng thiết bị riêng biệt.

---

### Nhóm 2: Hệ thống Phân quyền (Role-Based Access Control - RBAC)

#### 5. Bảng `Role` (Vai trò)
* **Chức năng:** Định nghĩa các vai trò trong hệ thống (ví dụ: `SUPER_ADMIN`, `DEVELOPER`, `CUSTOMER`).
* **Quan hệ:** Quan hệ nhiều-nhiều (`Many-to-Many`) với bảng `Permission`.

#### 6. Bảng `Permission` (Quyền hạn chi tiết)
* **Chức năng:** Định nghĩa quyền truy cập cụ thể tới từng API Endpoint của hệ thống.
* **Các trường quan trọng:**
  * `path` (API path, ví dụ: `/products` hoặc `/users/:id`).
  * `method` (Phương thức HTTP: `GET`, `POST`, `PUT`, `DELETE`).
  * *Nhờ bảng này, hệ thống của bạn có thể phân quyền động cực kỳ bảo mật (chặn request lỗi ngay từ tầng Guard).*

---

### Nhóm 3: Quản lý Source Code & Bản quyền (Product & Licensing)

#### 7. Bảng `Product` (Sản phẩm Source Code)
* **Chức năng:** Lưu trữ thông tin giới thiệu chung về các bộ Source Code được bán.
* **Các trường đặc thù mới thêm:**
  * `demoUrl`: Link chạy thử giao diện trực quan của source code.
  * `githubUrl`: Link chứa source code (nếu cấp quyền qua GitHub repo).
  * `documentation`: Tài liệu hướng dẫn cài đặt phần mềm.
  * `version`: Phiên bản hiện tại của mã nguồn (ví dụ: `v1.2.4`).
  * `techStack`: Mảng danh sách công nghệ (ví dụ: `['NextJS', 'NestJS', 'PostgreSQL']`).

#### 8. Bảng `SKU` (Gói Bản Quyền - License)
* **Chức năng:** Đối với sản phẩm số, bảng này đại diện cho **các gói bản quyền** của bộ Source Code đó (ví dụ: Gói cá nhân `Personal`, Gói thương mại `Commercial`, Gói doanh nghiệp `Enterprise`).
* **Các trường quan trọng:**
  * `value`: Tên gói License.
  * `price`: Giá của gói License tương ứng.
  * `stock`: Đặt mặc định số lượng lớn (`999999`) vì là sản phẩm số.

#### 9. Bảng `UserOwnership` (Quyền sở hữu bản quyền) 🔑
* **Chức năng:** Quản lý quyền tải xuống của người dùng sau khi mua hàng thành công.
* **Các trường quan trọng:**
  * `downloadUrl`: Đường dẫn tải file source code trực tiếp (S3 Signed URL).
  * `downloadCount`: Đếm số lần tải xuống của người dùng đó (để thiết lập giới hạn tải, ngăn chặn spam hoặc rò rỉ link tải).

#### 10. Bảng `Category` (Danh mục)
* **Chức năng:** Phân loại source code (ví dụ: Website Bán Hàng, App Di Động, Tool Tự Động Hóa...).
* **Đặc điểm thiết kế:** Hỗ trợ cấu trúc cây thư mục cha-con đệ quy (`parentCategoryId` chỉ đến `Category` cha).

#### 11. Bảng `Brand` (Thương hiệu / Nhà phát triển)
* **Chức năng:** Lưu thông tin của các nhà phát triển hoặc tác giả của bộ source code đó.

---

### Nhóm 4: Đa Ngôn Ngữ (Localization)

Để website có thể bán cho khách hàng nước ngoài, cơ sở dữ liệu của bạn có các bảng chuyên biệt cho việc dịch thuật:
* **`Language`**: Định nghĩa danh sách ngôn ngữ hệ thống hỗ trợ (ví dụ: `vi`, `en`, `ja`).
* Các bảng dịch thuật: **`UserTranslation`**, **`ProductTranslation`**, **`CategoryTranslation`**, **`BrandTranslation`**.
  * Thay vì lưu trực tiếp văn bản vào bảng chính, các mô tả dài, tên sản phẩm theo các ngôn ngữ khác nhau sẽ được lưu ở các bảng này kèm theo khóa ngoại `languageId`.

---

### Nhóm 5: Giỏ hàng, Đơn hàng & Thanh toán (Checkout & Payment)

#### 12. Bảng `CartItem` (Giỏ hàng)
* **Chức năng:** Lưu tạm thời các gói License source code mà người dùng thêm vào giỏ hàng trước khi thanh toán.

#### 13. Bảng `ProductSKUSnapshot` (Ảnh chụp nhanh sản phẩm khi mua) 📸
* **Chức năng:** Lưu lại toàn bộ thông tin sản phẩm và giá cả tại **đúng thời điểm khách hàng bấm đặt mua**.
* **Ý nghĩa:** Đây là thiết kế tuyệt vời! Giúp lịch sử đơn hàng của khách hàng không bị thay đổi dữ liệu hoặc sai lệch giá tiền khi sau này Admin chỉnh sửa giá sản phẩm hay cập nhật phiên bản mới.

#### 14. Bảng `Order` (Đơn hàng)
* **Chức năng:** Quản lý các đơn mua source code.
* **Các trường quan trọng:**
  * `status`: Trạng thái đơn (`PENDING_PAYMENT`, `SUCCESS`, `CANCELLED`).
  * `receiver` (Json): Lưu email nhận code và tên người mua.

#### 15. Bảng `Payment` (Trạng thái thanh toán)
* **Chức năng:** Liên kết với đơn hàng để xác định tình trạng thanh toán (`PENDING`, `SUCCESS`, `FAILED`).

#### 16. Bảng `PaymentTransaction` (Nhật ký giao dịch tự động)
* **Chức năng:** Nơi nhận dữ liệu Webhook từ các cổng thanh toán ngân hàng (như SePay, VietQR...). Ghi nhận số tài khoản gửi, số tiền nhận (`amountIn`), mã giao dịch (`code`) để BE đối chiếu và tự động mở khóa quyền tải source code.

---

### Nhóm 6: Tương tác & Real-time (Chat & Review)

#### 17. Bảng `Review` & `ReviewMedia` (Đánh giá)
* **Chức năng:** Khách hàng viết đánh giá về chất lượng source code, độ dễ cài đặt, đính kèm hình ảnh hoặc video chạy demo thực tế.

#### 18. Bảng `Message` (Tin nhắn hỗ trợ)
* **Chức năng:** Lưu trữ các tin nhắn trao đổi chat trực tiếp giữa **Khách hàng** và **Developer/Admin** để phục vụ hỗ trợ kỹ thuật cài đặt source code.

#### 19. Bảng `Websocket` (Phiên kết nối thời gian thực)
* **Chức năng:** Quản lý danh sách các Socket đang active của người dùng để đẩy thông báo đẩy (push notification) hoặc tin nhắn chat ngay lập tức không cần tải lại trang.

---

> [!TIP]
> **Lời khuyên vận hành:**
> * Khi thêm một bảng mới hoặc sửa trường, luôn đảm bảo cập nhật các bảng dịch thuật `Translation` tương ứng nếu trường đó cần hiển thị đa ngôn ngữ.
> * Hãy tận dụng bảng `PaymentTransaction` để xây dựng hệ thống cộng tiền tự động (tự động hóa 100%), giải phóng sức lao động của Admin!
