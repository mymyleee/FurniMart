# Inventory Service

Microservice quản lý kho hàng và tồn kho cho hệ thống FurniMart.

## 📋 Tổng Quan

Service này xử lý:

- Quản lý tồn kho đa chi nhánh (Multi-branch inventory tracking)
- Quản lý mức stock và sẵn có
- Đặt trữ hàng cho đơn hàng (Inventory reservation)
- Chuyển kho giữa các chi nhánh (Inter-branch transfers)
- Cảnh báo stock thấp (Low stock alerts)
- Lịch sử thay đổi stock (Stock movements history)
- Kiểm tra sẵn có sản phẩm trên tất cả chi nhánh

## 🗄️ Database

- **Database**: `inventory_db`
- **Tables**:
  - `BranchInventory` - Tồn kho theo chi nhánh
  - `StockMovements` - Lịch sử thay đổi stock
  - `StockAlerts` - Cảnh báo stock thấp
  - `Branches` - Thông tin chi nhánh (liên kết)
  - `Products` - Thông tin sản phẩm (liên kết)

## 🛠️ Công Nghệ Sử Dụng

- Node.js 18
- Express.js
- SQL Server (mssql)
- express-validator (xác thực đầu vào)
- axios (giao tiếp với các service khác)
- uuid (tạo UUID)
- jsonwebtoken (xác thực JWT)

## 🚀 Chạy Service

### Với Docker Compose (Khuyến nghị)

```bash
# Từ thư mục root của project
docker-compose up inventory-service

# Hoặc chạy background
docker-compose up -d inventory-service

# Xem logs
docker-compose logs -f inventory-service

# Dừng service
docker-compose stop inventory-service
```

### Chạy Local (Development)

```bash
cd backend/inventory-service

# Cài đặt dependencies
npm install

# Chạy development mode (yêu cầu database đã setup)
npm run dev
```

### Yêu Cầu

- Docker & Docker Compose (nếu dùng Docker)
- SQL Server đang chạy (qua docker-compose hoặc local)
- Database `inventory_db` đã được tạo và có schema
- Identity Service đang chạy để lấy JWT token
- Catalog Service đang chạy
- Order Service đang chạy (cho tích hợp)

## 🔐 Authentication & Authorization

Service này sử dụng JWT token từ Identity Service để xác thực và phân quyền.

### Lấy Access Token

**POST** `http://localhost:5001/api/auth/login`

**Body:**

```json
{
  "email": "admin@furnimart.com",
  "password": "Admin@123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }    {
      "quantityOnHand": 200,
      "reason": "Received new shipment"
    }
  }
}
```

### Phân Quyền

- **ADMIN**: Toàn quyền
- **BRANCH_MANAGER**: Quản lý inventory chi nhánh
- **WAREHOUSE_STAFF**: Cập nhật stock, transfer
- **ORDER_MANAGER**: Reserve & release inventory
- **REPORT_VIEWER**: Xem reports

## 📝 API Endpoints

### Health Check

#### GET `/health`

Kiểm tra service có hoạt động không.

**Response:**

```json
{
  "status": "OK",
  "service": "inventory-service",
  "timestamp": "2024-12-26T10:00:00.000Z"
}
```

---

### Branch Inventory

#### GET `/api/inventory/:branchId/products`

Lấy danh sách tồn kho của một chi nhánh.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| branchId | number | ✅ | ID chi nhánh |
| page | number | ❌ | Trang (default: 1) |
| limit | number | ❌ | Số item/trang (default: 20) |
| lowStockOnly | boolean | ❌ | Chỉ hiển thị stock thấp |

**Example:**

```
GET http://localhost:5003/api/inventory/1/products?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "Id": "550e8400-e29b-41d4-a716-446655440000",
        "BranchId": 1,
        "ProductId": 101,
        "QuantityOnHand": 50,
        "QuantityReserved": 10,
        "QuantityAvailable": 40,
        "MinimumStockLevel": 20,
        "BranchName": "Chi nhánh TP.HCM",
        "UpdatedAt": "2024-12-26T10:00:00.000Z"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

#### GET `/api/inventory/product/:productId/availability`

Kiểm tra sẵn có sản phẩm trên tất cả chi nhánh.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| productId | number | ✅ | ID sản phẩm |

**Example:**

```
GET http://localhost:5003/api/inventory/product/101/availability
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": 101,
    "totalAvailable": 120,
    "branches": [
      {
        "BranchId": 1,
        "BranchName": "Chi nhánh TP.HCM",
        "QuantityOnHand": 50,
        "QuantityReserved": 10,
        "QuantityAvailable": 40
      },
      {
        "BranchId": 2,
        "BranchName": "Chi nhánh Hà Nội",
        "QuantityOnHand": 80,
        "QuantityReserved": 0,
        "QuantityAvailable": 80
      }
    ]
  }
}
```

---

### Stock Management

#### PUT `/api/inventory/:branchId/products/:productId`

Cập nhật mức stock của sản phẩm (yêu cầu authenticate).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| branchId | number | ✅ | ID chi nhánh |
| productId | number | ✅ | ID sản phẩm |

**Body:**

```json
{
  "quantityOnHand": 100,
  "reason": "Received new shipment"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "inventory": {
      "Id": "550e8400-e29b-41d4-a716-446655440000",
      "BranchId": 1,
      "ProductId": 101,
      "QuantityOnHand": 100,
      "QuantityReserved": 10,
      "QuantityAvailable": 90
    }
  }
}
```

---

#### POST `/api/inventory/transfer`

Chuyển stock giữa hai chi nhánh (yêu cầu authenticate).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "fromBranchId": 1,
  "toBranchId": 2,
  "productId": 101,
  "quantity": 20,
  "reason": "Balance inventory between branches"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Inventory transferred successfully",
  "data": {
    "transfer": {
      "from": {
        "Id": "550e8400-e29b-41d4-a716-446655440000",
        "QuantityOnHand": 30
      },
      "to": {
        "Id": "660e8400-e29b-41d4-a716-446655440001",
        "QuantityOnHand": 100
      },
      "quantity": 20
    }
  }
}
```

---

### Order Integration

#### POST `/api/inventory/reserve`

Đặt trữ stock cho đơn hàng (yêu cầu authenticate).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "branchId": 1,
  "productId": 101,
  "quantity": 5,
  "orderId": "ORD-2024-001"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Inventory reserved successfully",
  "data": {
    "inventory": {
      "Id": "550e8400-e29b-41d4-a716-446655440000",
      "QuantityReserved": 15,
      "QuantityAvailable": 35
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Insufficient inventory for reservation",
  "available": 10,
  "requested": 15
}
```

---

#### POST `/api/inventory/release-reserve`

Giải phóng đặt trữ khi hủy đơn hàng (yêu cầu authenticate).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "branchId": 1,
  "productId": 101,
  "quantity": 5,
  "orderId": "ORD-2024-001"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Reservation released successfully",
  "data": {
    "inventory": {
      "Id": "550e8400-e29b-41d4-a716-446655440000",
      "QuantityReserved": 10,
      "QuantityAvailable": 40
    }
  }
}
```

---

### Stock Alerts

#### GET `/api/inventory/alerts`

Lấy danh sách cảnh báo stock thấp.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| branchId | number | ❌ | Lọc theo chi nhánh |
| productId | number | ❌ | Lọc theo sản phẩm |
| status | string | ❌ | Active/Resolved/Ignored (default: Active) |
| page | number | ❌ | Trang (default: 1) |
| limit | number | ❌ | Số item/trang (default: 20) |

**Example:**

```
GET http://localhost:5003/api/inventory/alerts?status=Active&page=1
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "Id": "550e8400-e29b-41d4-a716-446655440002",
        "BranchId": 1,
        "ProductId": 101,
        "AlertType": "LOW_STOCK",
        "CurrentStock": 15,
        "ThresholdLevel": 20,
        "Status": "Active",
        "CreatedAt": "2024-12-26T10:00:00.000Z"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

#### GET `/api/inventory/alerts/:alertId`

Lấy chi tiết cảnh báo.

**Example:**

```
GET http://localhost:5003/api/inventory/alerts/550e8400-e29b-41d4-a716-446655440002
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alert": {
      "Id": "550e8400-e29b-41d4-a716-446655440002",
      "BranchId": 1,
      "ProductId": 101,
      "AlertType": "LOW_STOCK",
      "CurrentStock": 15,
      "ThresholdLevel": 20,
      "Status": "Active",
      "CreatedAt": "2024-12-26T10:00:00.000Z"
    }
  }
}
```

---

#### PUT `/api/inventory/alerts/:alertId`

Cập nhật status cảnh báo (yêu cầu authenticate).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "status": "Resolved"
}
```

**Giá trị status hợp lệ:** `Active` | `Resolved` | `Ignored`

**Response:**

```json
{
  "success": true,
  "message": "Alert updated successfully",
  "data": {
    "alert": {
      "Id": "550e8400-e29b-41d4-a716-446655440002",
      "Status": "Resolved",
      "ResolvedAt": "2024-12-26T11:00:00.000Z"
    }
  }
}
```

---

### History & Reports

#### GET `/api/inventory/products/:productId/history`

Lấy lịch sử thay đổi stock của sản phẩm.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| productId | number | ✅ | ID sản phẩm |
| limit | number | ❌ | Số records (default: 50) |

**Example:**

```
GET http://localhost:5003/api/inventory/products/101/history?limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": 101,
    "history": [
      {
        "Id": "550e8400-e29b-41d4-a716-446655440003",
        "BranchId": 1,
        "MovementType": "RESTOCK",
        "Quantity": 30,
        "Reason": "Received new shipment",
        "BalanceBefore": 70,
        "BalanceAfter": 100,
        "CreatedAt": "2024-12-26T10:00:00.000Z",
        "CreatedBy": "admin@furnimart.com"
      },
      {
        "Id": "550e8400-e29b-41d4-a716-446655440004",
        "BranchId": 1,
        "MovementType": "SALE",
        "Quantity": 5,
        "Reason": "Sold in order ORD-2024-001",
        "BalanceBefore": 100,
        "BalanceAfter": 95,
        "CreatedAt": "2024-12-26T11:00:00.000Z",
        "CreatedBy": "warehouse@furnimart.com"
      }
    ],
    "count": 2
  }
}
```

---

#### GET `/api/inventory/branches/:branchId/report`

Lấy report thay đổi stock của chi nhánh trong khoảng thời gian (yêu cầu authenticate).

**Headers:**

```
Authorization: Bearer <token>
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| branchId | number | ✅ | ID chi nhánh |
| startDate | string | ✅ | Ngày bắt đầu (ISO format: 2024-12-01) |
| endDate | string | ✅ | Ngày kết thúc (ISO format: 2024-12-31) |

**Example:**

```
GET http://localhost:5003/api/inventory/branches/1/report?startDate=2024-12-01&endDate=2024-12-31
```

**Response:**

```json
{
  "success": true,
  "data": {
    "branchId": 1,
    "period": {
      "startDate": "2024-12-01",
      "endDate": "2024-12-31"
    },
    "report": [
      {
        "MovementType": "RESTOCK",
        "TotalMovements": 5,
        "TotalQuantity": 150
      },
      {
        "MovementType": "SALE",
        "TotalMovements": 42,
        "TotalQuantity": 78
      },
      {
        "MovementType": "RESERVE",
        "TotalMovements": 25,
        "TotalQuantity": 45
      }
    ]
  }
}
```

---

## 🏗️ Cấu Trúc Project

```
inventory-service/
├── src/
│   ├── controllers/
│   │   └── inventory.controller.js      # API logic
│   ├── models/
│   │   ├── branchInventory.model.js     # Database model
│   │   ├── stockMovements.model.js      # Movement records
│   │   └── stockAlerts.model.js         # Stock alerts
│   ├── routes/
│   │   └── inventory.routes.js          # API routes
│   ├── services/
│   │   ├── inventory.service.js         # Business logic
│   │   ├── catalogService.client.js     # Catalog integration
│   │   └── orderService.client.js       # Order integration
│   ├── middleware/
│   │   ├── auth.middleware.js           # JWT authentication
│   │   └── error.middleware.js          # Error handling
│   ├── config/
│   │   └── database.js                  # Database connection
│   └── server.js                        # Entry point
├── package.json
├── .env
├── Dockerfile
└── README.md
```

## 📊 Database Schema

### BranchInventory

```sql
CREATE TABLE BranchInventory (
  Id NVARCHAR(36) PRIMARY KEY,
  BranchId INT NOT NULL,
  ProductId INT NOT NULL,
  QuantityOnHand INT DEFAULT 0,
  QuantityReserved INT DEFAULT 0,
  QuantityAvailable INT GENERATED ALWAYS AS (QuantityOnHand - QuantityReserved),
  MinimumStockLevel INT DEFAULT 10,
  LastRestockDate DATETIME,
  CreatedAt DATETIME DEFAULT GETUTCDATE(),
  UpdatedAt DATETIME DEFAULT GETUTCDATE(),
  FOREIGN KEY (BranchId) REFERENCES Branches(Id),
  FOREIGN KEY (ProductId) REFERENCES Products(Id)
)
```

### StockMovements

```sql
CREATE TABLE StockMovements (
  Id NVARCHAR(36) PRIMARY KEY,
  BranchId INT NOT NULL,
  ProductId INT NOT NULL,
  MovementType NVARCHAR(50), -- RESTOCK, SALE, RESERVE, TRANSFER_IN, TRANSFER_OUT
  Quantity INT,
  Reason NVARCHAR(500),
  ReferenceId NVARCHAR(100),
  BalanceBefore INT,
  BalanceAfter INT,
  CreatedBy NVARCHAR(36),
  CreatedAt DATETIME DEFAULT GETUTCDATE(),
  FOREIGN KEY (BranchId) REFERENCES Branches(Id),
  FOREIGN KEY (ProductId) REFERENCES Products(Id)
)
```

### StockAlerts

```sql
CREATE TABLE StockAlerts (
  Id NVARCHAR(36) PRIMARY KEY,
  BranchId INT NOT NULL,
  ProductId INT NOT NULL,
  AlertType NVARCHAR(50), -- LOW_STOCK, OUT_OF_STOCK, OVERSTOCK
  CurrentStock INT,
  ThresholdLevel INT,
  Status NVARCHAR(50) DEFAULT 'Active', -- Active, Resolved, Ignored
  CreatedAt DATETIME DEFAULT GETUTCDATE(),
  ResolvedAt DATETIME NULL,
  FOREIGN KEY (BranchId) REFERENCES Branches(Id),
  FOREIGN KEY (ProductId) REFERENCES Products(Id)
)
```

## 🔌 Service Integration

### Với Catalog Service

- Kiểm tra sản phẩm tồn tại trước khi xử lý inventory
- Lấy thông tin danh mục & sản phẩm

### Với Order Service

- Thông báo khi sản phẩm quay lại stock
- Thông báo khi hết stock
- Cập nhật trạng thái fulfillment

### Notification Flow

```
Inventory Update → Check Stock Level → 
  (If Low) → Create Alert & Notify Order Service →
  (If Available) → Notify Order Service
```

## 🐛 Troubleshooting

### Connection Error

**Error:** `Cannot connect to SQL Server`

**Solution:**
- Kiểm tra SQL Server đang chạy: `docker-compose ps`
- Kiểm tra biến môi trường `.env`
- Kiểm tra firewall cho port 1433

### JWT Token Invalid

**Error:** `Invalid token`

**Solution:**
- Lấy token mới từ Identity Service
- Kiểm tra `JWT_SECRET` giống với Identity Service
- Kiểm tra token chưa hết hạn

### Inventory Not Found

**Error:** `Inventory not found for product`

**Solution:**
- Tạo inventory mới cho sản phẩm
- Kiểm tra `branchId` & `productId` có tồn tại không

## 📚 Tham Khảo Thêm

- [Architecture Documentation](../../docs/architecture.md)
- [Database Design](../../docs/database-design.md)
- [API Contracts](../../docs/api-contracts.md)

## 👥 Team

- Development Team - FurniMart

## 📄 License

ISC
