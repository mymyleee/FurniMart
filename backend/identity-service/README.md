# Identity Service

Microservice quản lý xác thực và phân quyền người dùng cho hệ thống FurniMart.

## 📋 Tổng Quan

Service này xử lý:

- Đăng ký và đăng nhập người dùng
- Quản lý JWT tokens (access token & refresh token)
- Phân quyền dựa trên vai trò (RBAC)
- Quản lý thông tin người dùng

## 🗄️ Database

- **Database**: `identity_db`
- **Tables**:
  - `Users` - Thông tin người dùng
  - `Roles` - Vai trò hệ thống
  - `UserProfiles` - Thông tin mở rộng
  - `RefreshTokens` - Refresh tokens
  - `PasswordResetTokens` - Tokens đặt lại mật khẩu
  - `EmailVerificationTokens` - Tokens xác thực email

## 🛠️ Technology Stack

- Node.js 18
- Express.js
- SQL Server (mssql)
- JWT (jsonwebtoken)
- bcryptjs (password hashing)
- express-validator (input validation)

## 🚀 Chạy Service

### Với Docker Compose (Khuyến nghị)

```bash
# Từ thư mục root của project
docker-compose up identity-service

# Hoặc chạy background
docker-compose up -d identity-service

# Xem logs
docker-compose logs -f identity-service

# Dừng service
docker-compose stop identity-service
```

### Chạy Local (Development)

```bash
cd backend/identity-service

# Cài đặt dependencies
npm install

# Chạy development mode (yêu cầu database đã setup)
npm run dev
```

### Prerequisites

- Docker & Docker Compose (nếu dùng Docker)
- SQL Server đang chạy (qua docker-compose hoặc local)
- Database `identity_db` đã được tạo và có schema

### Tạo Tài Khoản Admin Gốc

Sau khi database đã được setup, bạn có thể tạo tài khoản admin gốc:

**Cách 1: Sử dụng script Node.js (Khuyến nghị)**

```bash
cd backend/identity-service

# Tạo admin với thông tin mặc định
npm run seed:admin

# Hoặc tùy chỉnh thông tin
node scripts/seed-admin.js --email admin@example.com --password YourSecurePass123 --name "Admin User"
```

**Thông tin mặc định:**

- Email: `admin@furnimart.com`
- Password: `Admin@123`
- Name: `System Administrator`

⚠️ **Lưu ý:** Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

**Cách 2: Sử dụng SQL Script**

```bash
# Chạy script SQL từ thư mục root
docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "FurniMart@2024" -d identity_db -i /path/to/seed-admin.sql
```

## ⚙️ Environment Variables

Tạo file `.env` hoặc set các biến môi trường:

```env
# Server
PORT=5001
NODE_ENV=development

# Database
SQL_SERVER_HOST=sqlserver
SQL_SERVER_PORT=1433
SQL_SERVER_USER=sa
SQL_SERVER_PASSWORD=FurniMart@2024

# JWT
JWT_SECRET=furnimart-secret-key-change-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=*
```

## 📡 API Endpoints

### Authentication

#### 1. Register User

**POST** `/api/auth/register`

Đăng ký người dùng mới.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "fullName": "John Doe",
  "phone": "+84123456789",
  "role": "CUSTOMER" // Optional, default: CUSTOMER
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+84123456789",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "uuid-v4"
    }
  }
}
```

**Lưu ý:**

- Role `CUSTOMER` tự động được kích hoạt (status: ACTIVE)
- Các role khác cần chờ phê duyệt (status: PENDING_APPROVAL)

#### 2. Login

**POST** `/api/auth/login`

Đăng nhập người dùng.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "uuid-v4"
    }
  }
}
```

#### 3. Refresh Token

**POST** `/api/auth/refresh`

Làm mới access token bằng refresh token.

**Request Body:**

```json
{
  "refreshToken": "uuid-v4-refresh-token"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "new-uuid-v4"
    }
  }
}
```

#### 4. Logout

**POST** `/api/auth/logout`

Đăng xuất và thu hồi refresh token.

**Request Body:**

```json
{
  "refreshToken": "uuid-v4-refresh-token"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### 5. Get Current User

**GET** `/api/auth/me`

Lấy thông tin người dùng hiện tại (yêu cầu authentication).

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+84123456789",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "emailVerified": false,
      "phoneVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLoginAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### User Management

#### 6. Get User By ID (Admin Only)

**GET** `/api/users/:id`

Lấy thông tin user theo ID (chỉ Admin).

**Headers:**

```
Authorization: Bearer <accessToken>
```

#### 7. Update Profile

**PUT** `/api/users/profile`

Cập nhật thông tin profile (đang phát triển).

**Headers:**

```
Authorization: Bearer <accessToken>
```

#### 8. Change Password

**PUT** `/api/users/password`

Đổi mật khẩu (yêu cầu authentication).

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### 9. Update User Status (Admin Only)

**PUT** `/api/users/:id/status`

Cập nhật trạng thái của user (chỉ Admin mới có quyền).

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "status": "ACTIVE",
  "reason": "Account approved" // Optional
}
```

**Status values:**

- `ACTIVE` - Tài khoản hoạt động
- `INACTIVE` - Tài khoản không hoạt động
- `SUSPENDED` - Tài khoản bị tạm khóa
- `PENDING_APPROVAL` - Chờ phê duyệt

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "User status updated to ACTIVE",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "User Name",
      "role": "SELLER",
      "status": "ACTIVE",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "reason": "Account approved"
  }
}
```

**Lưu ý:**

- Chỉ Admin mới có quyền thay đổi status
- Admin không thể thay đổi status của chính mình
- Thường dùng để phê duyệt các tài khoản SELLER, BRANCH_MANAGER, DELIVERY_STAFF, ADMIN

## 👥 User Roles

Hệ thống hỗ trợ 5 vai trò:

- **CUSTOMER** - Khách hàng (tự động kích hoạt khi đăng ký)
- **SELLER** - Nhân viên bán hàng (cần phê duyệt)
- **BRANCH_MANAGER** - Quản lý chi nhánh (cần phê duyệt)
- **DELIVERY_STAFF** - Nhân viên giao hàng (cần phê duyệt)
- **ADMIN** - Quản trị viên (cần phê duyệt)

## 🧪 Testing

### Health Check

```bash
curl http://localhost:5001/health
```

**Response:**

```json
{
  "status": "OK",
  "service": "identity-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Flow Hoàn Chỉnh

#### 1. Đăng ký User

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "fullName": "Test User",
    "phone": "+84123456789"
  }'
```

Lưu `accessToken` và `refreshToken` từ response.

#### 2. Lấy Thông Tin User

```bash
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

#### 3. Làm Mới Token

```bash
curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

#### 4. Đăng Xuất

```bash
curl -X POST http://localhost:5001/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

### Validation Rules

**Email:**

- Phải là email hợp lệ
- Tự động normalize (lowercase)

**Password:**

- Tối thiểu 8 ký tự
- Phải có ít nhất 1 chữ hoa
- Phải có ít nhất 1 chữ thường
- Phải có ít nhất 1 số

**Full Name:**

- Tối thiểu 2 ký tự
- Tối đa 255 ký tự

**Phone:**

- Tùy chọn
- Nếu có thì phải là số điện thoại hợp lệ

### Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [...]
}
```

**401 Unauthorized:**

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**403 Forbidden:**

```json
{
  "success": false,
  "message": "User account is not active"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "message": "Route not found",
  "path": "/api/auth/invalid",
  "method": "GET"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## 📁 Cấu Trúc Thư Mục

```
identity-service/
├── src/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── controllers/
│   │   ├── auth.controller.js   # Auth logic
│   │   └── user.controller.js   # User management
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT authentication
│   │   └── error.middleware.js  # Error handling
│   ├── models/
│   │   ├── user.model.js        # User data model
│   │   └── refreshToken.model.js # Refresh token model
│   ├── routes/
│   │   ├── auth.routes.js       # Auth routes
│   │   └── user.routes.js       # User routes
│   ├── utils/
│   │   ├── jwt.utils.js         # JWT utilities
│   │   └── password.utils.js    # Password hashing
│   └── server.js                # Express app entry point
├── Dockerfile
├── package.json
└── README.md
```

## 🔒 Security Features

- Password hashing với bcryptjs
- JWT tokens với expiration
- Rate limiting (100 requests/15 minutes per IP)
- Helmet.js security headers
- CORS configuration
- Input validation với express-validator
- SQL injection protection (parameterized queries)

## 📝 Notes

- Debug logs chỉ hiển thị khi `NODE_ENV=development`
- Access token mặc định hết hạn sau 1 giờ
- Refresh token mặc định hết hạn sau 7 ngày
- Service sử dụng UTC timezone cho timestamps

## 🚧 TODO

- [ ] Implement update profile endpoint
- [ ] Implement change password endpoint
- [ ] Email verification flow
- [ ] Password reset flow
- [ ] User profile management

## 📞 Support

Nếu gặp vấn đề, kiểm tra:

1. Database connection (SQL Server đang chạy?)
2. Environment variables đã đúng chưa?
3. Database schema đã được tạo chưa?
4. Logs của service: `docker-compose logs identity-service`
