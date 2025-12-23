# Database Initialization

## Tổng quan

Thư mục này chứa các script SQL để khởi tạo tất cả các database cho các microservices của FurniMart.

## Databases

- `identity_db.sql` - Database cho Identity Service
- `catalog_db.sql` - Database cho Catalog Service
- `inventory_db.sql` - Database cho Inventory Service
- `order_db.sql` - Database cho Order Service
- `delivery_db.sql` - Database cho Delivery Service
- `payment_db.sql` - Database cho Payment & After-Sale Service
- `reporting_db.sql` - Database cho Reporting Service

## 🚀 Khởi tạo Tự động (Khuyến nghị)

### Cách 1: Sử dụng Docker Compose (Tự động)

Chỉ cần chạy:

```bash
docker-compose up
```

Script `init.sh` sẽ tự động:

- Chờ SQL Server sẵn sàng
- Chạy tất cả các file SQL theo thứ tự
- Bỏ qua các database đã tồn tại
- Hiển thị tóm tắt kết quả

**Lưu ý:** Service `db-init` sẽ tự động chạy sau khi SQL Server healthy và chỉ chạy 1 lần.

### Cách 2: Chạy thủ công script init.sh

Nếu muốn chạy lại script init:

```bash
docker-compose run --rm db-init
```

## 📝 Khởi tạo Thủ công

### Windows (PowerShell)

Sau khi SQL Server container đã chạy:

```powershell
# Chạy từng file SQL
Get-Content .\database\sqlserver\identity_db.sql | docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "FurniMart@2024" -C

Get-Content .\database\sqlserver\catalog_db.sql | docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "FurniMart@2024" -C
```

### Linux/Mac

```bash
# Chờ SQL Server sẵn sàng (khoảng 30 giây)
sleep 30

# Chạy các script SQL
docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "FurniMart@2024" \
  -i /docker-entrypoint-initdb.d/identity_db.sql

docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "FurniMart@2024" \
  -i /docker-entrypoint-initdb.d/catalog_db.sql
```

### SQL Server Management Studio (SSMS)

1. Kết nối đến `localhost,1433` với:

   - Username: `sa`
   - Password: `FurniMart@2024`

2. Mở và chạy từng file `.sql` theo thứ tự

## ✅ Kiểm tra Databases

```sql
-- Kiểm tra các database đã được tạo
SELECT name FROM sys.databases WHERE name LIKE '%_db'

-- Kiểm tra tables trong identity_db
USE identity_db
SELECT name FROM sys.tables

-- Kiểm tra roles
SELECT * FROM Roles

-- Kiểm tra tài khoản admin
SELECT Email, FullName, Status, EmailVerified
FROM Users
WHERE Email = 'admin@furnimart.com'
```

## 🔧 Xử lý Sự cố

### SQL Server chưa sẵn sàng

Đợi thêm một chút (SQL Server cần 20-30 giây để khởi động):

```bash
docker logs furnimart-sqlserver
```

### Lỗi quyền truy cập

Đảm bảo bạn đang sử dụng user `sa` với mật khẩu đúng.

### Database đã tồn tại

Scripts sử dụng kiểm tra `IF NOT EXISTS`, nên an toàn khi chạy nhiều lần. Script `init.sh` cũng tự động bỏ qua các database đã tồn tại.

### Chạy lại script init

Nếu muốn chạy lại script init (ví dụ sau khi sửa SQL):

```bash
# Xóa container init cũ (nếu có)
docker rm furnimart-db-init 2>/dev/null || true

# Chạy lại
docker-compose run --rm db-init
```

### Xóa và tạo lại database

Nếu muốn xóa và tạo lại database:

```powershell
# Xóa database
docker exec furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "FurniMart@2024" \
  -Q "DROP DATABASE IF EXISTS identity_db" -C

# Chạy lại script
Get-Content .\database\sqlserver\identity_db.sql | docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "FurniMart@2024" -C
```

## 📋 Tài khoản Admin Mặc định

Sau khi chạy `identity_db.sql`, tài khoản admin mặc định sẽ được tạo:

- **Email**: `admin@furnimart.com`
- **Password**: `Admin@123`
- **Status**: `ACTIVE`
- **EmailVerified**: `true`

⚠️ **Lưu ý**: Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!
