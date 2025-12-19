# Microservices

Thư mục này chứa tất cả các microservices của hệ thống FurniMart. Mỗi service có:
- Database SQL Server riêng
- API endpoints riêng
- Dockerfile riêng
- Có thể scale độc lập

## Danh sách Services

### 1. auth-service
Quản lý xác thực và phân quyền:
- Đăng ký/Đăng nhập
- JWT token management
- Role-based access control (RBAC)
- Password reset

### 2. product-service
Quản lý sản phẩm:
- CRUD sản phẩm
- Danh mục sản phẩm
- Upload ảnh và file 3D
- Tìm kiếm và lọc

### 3. order-service
Quản lý đơn hàng:
- Tạo đơn hàng
- Cập nhật trạng thái đơn
- Hủy đơn hàng
- Lịch sử đơn hàng

### 4. inventory-service
Quản lý tồn kho đa chi nhánh:
- Tồn kho theo chi nhánh
- Cập nhật số lượng
- Cảnh báo hết hàng
- Chuyển kho giữa chi nhánh

### 5. delivery-service
Quản lý giao hàng:
- Gán đơn cho delivery staff
- Cập nhật trạng thái giao hàng
- Upload bằng chứng giao hàng
- Theo dõi vị trí giao hàng

### 6. payment-service
Xử lý thanh toán:
- Tích hợp Momo, ZaloPay, Stripe
- Xử lý webhook từ payment gateway
- Quản lý ví escrow
- Hoàn tiền

### 7. customer-service
Quản lý thông tin khách hàng:
- Profile khách hàng
- Địa chỉ giao hàng
- Đánh giá sản phẩm
- Yêu cầu hỗ trợ

### 8. branch-service
Quản lý chi nhánh:
- Thông tin chi nhánh
- Vị trí địa lý
- Nhân viên chi nhánh
- Báo cáo doanh thu

## Cấu trúc chung của mỗi service

```
service-name/
├── src/
│   ├── controllers/     # Business logic
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── config/          # Configuration
│   └── index.js         # Entry point
├── migrations/           # Database migrations
├── Dockerfile
├── package.json
└── README.md
```




