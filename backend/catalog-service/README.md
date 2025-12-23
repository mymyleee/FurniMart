# Catalog Service

Microservice quản lý catalog sản phẩm cho hệ thống FurniMart.

## 📋 Tổng Quan

Service này xử lý:

- Quản lý sản phẩm (Products) - Các thao tác CRUD
- Quản lý danh mục (Categories) - Phân loại sản phẩm
- Tìm kiếm và lọc sản phẩm
- Quản lý hình ảnh sản phẩm
- Quản lý metadata mô hình 3D
- Đánh giá và Xếp hạng

## 🗄️ Database

- **Database**: `catalog_db`
- **Tables**:
  - `Categories` - Danh mục sản phẩm
  - `Products` - Thông tin sản phẩm
  - `ProductImages` - Hình ảnh sản phẩm
  - `Product3DModels` - Metadata cho 3D models
  - `ProductAttributes` - Thuộc tính bổ sung của sản phẩm
  - `Reviews` - Đánh giá sản phẩm
  - `ReviewImages` - Hình ảnh trong đánh giá

## 🛠️ Công Nghệ Sử Dụng

- Node.js 18
- Express.js
- SQL Server (mssql)
- express-validator (xác thực đầu vào)
- uuid (tạo UUID)
- jsonwebtoken (xác thực JWT)

## 🚀 Chạy Service

### Với Docker Compose (Khuyến nghị)

```bash
# Từ thư mục root của project
docker-compose up catalog-service

# Hoặc chạy background
docker-compose up -d catalog-service

# Xem logs
docker-compose logs -f catalog-service

# Dừng service
docker-compose stop catalog-service
```

### Chạy Local (Development)

```bash
cd backend/catalog-service

# Cài đặt dependencies
npm install

# Chạy development mode (yêu cầu database đã setup)
npm run dev
```

### Yêu Cầu

- Docker & Docker Compose (nếu dùng Docker)
- SQL Server đang chạy (qua docker-compose hoặc local)
- Database `catalog_db` đã được tạo và có schema
- Identity Service đang chạy để lấy JWT token (cho các endpoint yêu cầu authentication)

## 🔐 Authentication & Authorization

Service này sử dụng JWT token từ Identity Service để xác thực và phân quyền.

### Lấy Access Token

Trước khi test các endpoint yêu cầu authentication, bạn cần đăng nhập để lấy token:

**POST** `http://localhost:5001/api/auth/login`

**Headers:**

```
Content-Type: application/json
```

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
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "uuid-v4"
    }
  }
}
```

**Lưu ý:** Copy `accessToken` từ response để sử dụng cho các request tiếp theo.

### Sử dụng Token trong Postman

1. Tạo một **Environment** trong Postman (khuyến nghị)
2. Thêm biến `token` và set giá trị là `accessToken` vừa lấy được
3. Thêm header `Authorization` với giá trị: `Bearer {{token}}`

Hoặc thêm trực tiếp vào mỗi request:

```
Authorization: Bearer <paste-access-token-here>
```

### Phân Quyền

- **ADMIN**: Toàn quyền truy cập
- **BRANCH_MANAGER**: Quản lý categories và products
- **SELLER**: Quản lý products (tạo, sửa, xóa)
- **CUSTOMER**: Chỉ xem (GET endpoints)

## 📝 API Endpoints

### Health Check

#### GET `/health`

Kiểm tra service có hoạt động không.

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/health`
- **Headers:** Không cần

**Response:**

```json
{
  "status": "OK",
  "service": "catalog-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Categories (Danh Mục)

#### GET `/api/categories`

Lấy danh sách tất cả danh mục (không cần authentication).

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/api/categories`
- **Query Params (Optional):**
  - `isActive` (boolean): Lọc theo trạng thái kích hoạt
  - `parentCategoryId` (integer): Lọc theo danh mục cha

**Ví dụ:**

- `http://localhost:5002/api/categories`
- `http://localhost:5002/api/categories?isActive=true`
- `http://localhost:5002/api/categories?parentCategoryId=1`

**Response:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "Id": 1,
        "Name": "Living Room",
        "Slug": "living-room",
        "Description": "Furniture for living room",
        "ParentCategoryId": null,
        "IsActive": true,
        "DisplayOrder": 1,
        "CreatedAt": "2024-01-01T00:00:00.000Z",
        "UpdatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 5
  }
}
```

---

#### GET `/api/categories/:id`

Lấy thông tin chi tiết một danh mục theo ID.

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/api/categories/1`
- **Headers:** Không cần

**Response:**

```json
{
  "success": true,
  "data": {
    "category": {
      "Id": 1,
      "Name": "Living Room",
      ...
    }
  }
}
```

---

#### GET `/api/categories/slug/:slug`

Lấy thông tin chi tiết một danh mục theo slug.

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/api/categories/slug/living-room`
- **Headers:** Không cần

---

#### POST `/api/categories`

Tạo danh mục mới (yêu cầu: ADMIN hoặc BRANCH_MANAGER).

**Request trong Postman:**

- **Method:** `POST`
- **URL:** `http://localhost:5002/api/categories`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (raw JSON):**

```json
{
  "name": "Office Furniture",
  "slug": "office-furniture",
  "description": "Furniture for office spaces",
  "parentCategoryId": null,
  "isActive": true,
  "displayOrder": 6
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "Id": 6,
      "Name": "Office Furniture",
      "Slug": "office-furniture",
      ...
    }
  }
}
```

---

#### PUT `/api/categories/:id`

Cập nhật danh mục (yêu cầu: ADMIN hoặc BRANCH_MANAGER).

**Request trong Postman:**

- **Method:** `PUT`
- **URL:** `http://localhost:5002/api/categories/6`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (raw JSON):**

```json
{
  "name": "Updated Office Furniture",
  "description": "Updated description",
  "isActive": false
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "category": {
      "Id": 6,
      "Name": "Updated Office Furniture",
      ...
    }
  }
}
```

---

#### DELETE `/api/categories/:id`

Xóa danh mục (yêu cầu: ADMIN hoặc BRANCH_MANAGER).

**Request trong Postman:**

- **Method:** `DELETE`
- **URL:** `http://localhost:5002/api/categories/6`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

### Products (Sản Phẩm)

#### GET `/api/products`

Lấy danh sách sản phẩm với bộ lọc và phân trang (không cần authentication).

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/api/products`
- **Query Params (Optional):**
  - `page` (integer, default: 1): Số trang
  - `limit` (integer, default: 20): Số mục mỗi trang
  - `categoryId` (integer): Lọc theo danh mục
  - `isActive` (boolean): Lọc theo trạng thái kích hoạt
  - `stockStatus` (string): IN_STOCK, OUT_OF_STOCK, BACKORDER, PREORDER
  - `isFeatured` (boolean): Lọc sản phẩm nổi bật
  - `search` (string): Tìm kiếm theo tên, mô tả, SKU
  - `minPrice` (number): Giá tối thiểu
  - `maxPrice` (number): Giá tối đa
  - `sortBy` (string, default: "CreatedAt"): Name, BasePrice, CreatedAt, ViewCount
  - `sortOrder` (string, default: "DESC"): ASC hoặc DESC

**Ví dụ:**

- `http://localhost:5002/api/products`
- `http://localhost:5002/api/products?categoryId=1&isActive=true&page=1&limit=10`
- `http://localhost:5002/api/products?search=sofa`
- `http://localhost:5002/api/products?minPrice=1000000&maxPrice=5000000`
- `http://localhost:5002/api/products?sortBy=BasePrice&sortOrder=ASC`

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "Id": "UUID",
        "Name": "Modern Sofa Set",
        "Slug": "modern-sofa-set",
        "SKU": "SOFA-001",
        "BasePrice": 5000000,
        "SalePrice": 4500000,
        "CategoryId": 1,
        "CategoryName": "Living Room",
        "IsActive": true,
        "IsFeatured": false,
        "ViewCount": 0,
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

#### GET `/api/products/:id`

Lấy thông tin chi tiết một sản phẩm theo ID.

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/api/products/{product-id}`
- **Query Params (Optional):**
  - `include` (string): Danh sách dữ liệu liên quan, phân cách bằng dấu phẩy
    - `images` - Bao gồm hình ảnh sản phẩm
    - `3d` - Bao gồm mô hình 3D
    - `attributes` - Bao gồm thuộc tính sản phẩm
    - `reviews` - Bao gồm đánh giá (5 đánh giá đã duyệt đầu tiên)
    - `rating` - Bao gồm tóm tắt xếp hạng
    - `all` (default) - Bao gồm tất cả dữ liệu liên quan

**Ví dụ:**

- `http://localhost:5002/api/products/{product-id}?include=all`
- `http://localhost:5002/api/products/{product-id}?include=images,attributes`

**Response:**

```json
{
  "success": true,
  "data": {
    "product": {
      "Id": "UUID",
      "Name": "Executive Office Desk",
      ...
      "images": [...],
      "attributes": [...],
      "reviews": [...],
      "ratingSummary": {
        "averageRating": 4.5,
        "totalReviews": 10,
        "ratingDistribution": {
          "5": 5,
          "4": 3,
          "3": 1,
          "2": 1,
          "1": 0
        }
      }
    }
  }
}
```

---

#### GET `/api/products/slug/:slug`

Lấy thông tin chi tiết một sản phẩm theo slug (tự động tăng ViewCount).

**Request trong Postman:**

- **Method:** `GET`
- **URL:** `http://localhost:5002/api/products/slug/executive-offisk`
- **Query Params:** Giống như GET `/api/products/:id`ce-de

**Ví dụ:**

- `http://localhost:5002/api/products/slug/executive-office-desk?include=images`
- `http://localhost:5002/api/products/slug/executive-office-desk?include=all`

**Lưu ý:** Mỗi lần gọi endpoint này, `ViewCount` sẽ tự động tăng lên 1. Để test, gọi nhiều lần và kiểm tra `ViewCount` trong response.

---

#### POST `/api/products`

Tạo sản phẩm mới (yêu cầu: ADMIN, BRANCH_MANAGER hoặc SELLER).

**Request trong Postman:**

- **Method:** `POST`
- **URL:** `http://localhost:5002/api/products`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (raw JSON):**

```json
{
  "name": "Executive Office Desk",
  "slug": "executive-office-desk",
  "sku": "DESK-001",
  "categoryId": 2,
  "basePrice": 5000000,
  "salePrice": 4500000,
  "description": "Large executive desk with drawers",
  "shortDescription": "Executive desk for office",
  "stockStatus": "IN_STOCK",
  "isActive": true,
  "isFeatured": false,
  "weight": 50.5,
  "length": 200,
  "width": 90,
  "height": 85,
  "material": "Wood",
  "color": "Brown",
  "brand": "FurniMart",
  "warrantyPeriod": 12,
  "metaTitle": "Executive Office Desk - FurniMart",
  "metaDescription": "Large executive desk with drawers for your office"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "Id": "UUID",
      "Name": "Executive Office Desk",
      "Slug": "executive-office-desk",
      "SKU": "DESK-001",
      ...
    }
  }
}
```

---

#### PUT `/api/products/:id`

Cập nhật sản phẩm (yêu cầu: ADMIN, BRANCH_MANAGER hoặc SELLER).

**Request trong Postman:**

- **Method:** `PUT`
- **URL:** `http://localhost:5002/api/products/{product-id}`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (raw JSON):** (chỉ gửi các field cần cập nhật)

```json
{
  "name": "Updated Executive Office Desk",
  "basePrice": 5500000,
  "salePrice": 5000000,
  "isActive": true
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {
      "Id": "UUID",
      "Name": "Updated Executive Office Desk",
      ...
    }
  }
}
```

---

#### DELETE `/api/products/:id`

Xóa sản phẩm (yêu cầu: ADMIN, BRANCH_MANAGER hoặc SELLER).

**Request trong Postman:**

- **Method:** `DELETE`
- **URL:** `http://localhost:5002/api/products/{product-id}`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## 🧪 Hướng Dẫn Test với Postman

### Bước 1: Setup Postman Environment

1. Tạo Environment mới trong Postman (ví dụ: "FurniMart Local")
2. Thêm các biến:
   - `base_url_identity`: `http://localhost:5001`
   - `base_url_catalog`: `http://localhost:5002`
   - `token`: (sẽ được set sau khi login)

### Bước 2: Đăng nhập để lấy Token

1. Tạo request mới:

   - **Method:** `POST`
   - **URL:** `{{base_url_identity}}/api/auth/login`
   - **Headers:** `Content-Type: application/json`
   - **Body:**

   ```json
   {
     "email": "admin@furnimart.com",
     "password": "Admin@123"
   }
   ```

2. Sau khi nhận response, thêm script vào tab **Tests**:

   ```javascript
   if (pm.response.code === 200) {
     var jsonData = pm.response.json();
     pm.environment.set("token", jsonData.data.tokens.accessToken);
     console.log("Token đã được lưu:", pm.environment.get("token"));
   }
   ```

3. Send request, token sẽ tự động được lưu vào environment variable `token`

### Bước 3: Test các Endpoints

#### Test Health Check

- **Method:** `GET`
- **URL:** `{{base_url_catalog}}/health`
- Không cần headers

#### Test GET Categories

- **Method:** `GET`
- **URL:** `{{base_url_catalog}}/api/categories`
- Không cần headers

#### Test POST Category (Cần Authentication)

- **Method:** `POST`
- **URL:** `{{base_url_catalog}}/api/categories`
- **Headers:**
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- **Body:**

```json
{
  "name": "Test Category",
  "slug": "test-category",
  "description": "Test category description",
  "isActive": true,
  "displayOrder": 99
}
```

#### Test GET Products

- **Method:** `GET`
- **URL:** `{{base_url_catalog}}/api/products?page=1&limit=10`
- Không cần headers

#### Test GET Product by Slug (Test ViewCount)

- **Method:** `GET`
- **URL:** `{{base_url_catalog}}/api/products/slug/executive-office-desk?include=images`
- Không cần headers
- Gọi nhiều lần và kiểm tra `ViewCount` trong response có tăng không

#### Test POST Product (Cần Authentication)

- **Method:** `POST`
- **URL:** `{{base_url_catalog}}/api/products`
- **Headers:**
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- **Body:** (xem ví dụ ở trên)

### Bước 4: Test Authorization

Để test phân quyền, đăng nhập với các tài khoản khác nhau:

1. **ADMIN**: `admin@furnimart.com` / `Admin@123`
2. **BRANCH_MANAGER**: (tạo tài khoản với role BRANCH_MANAGER)
3. **SELLER**: (tạo tài khoản với role SELLER)
4. **CUSTOMER**: (tạo tài khoản với role CUSTOMER)

Sau đó test các endpoint:

- **POST/PUT/DELETE Categories**: Chỉ ADMIN và BRANCH_MANAGER được phép
- **POST/PUT/DELETE Products**: ADMIN, BRANCH_MANAGER và SELLER được phép
- **GET endpoints**: Tất cả đều được phép (không cần authentication)

---

## 🔧 Xử Lý Sự Cố

### Lỗi: "No token provided" hoặc "Authentication required"

**Nguyên nhân:** Thiếu hoặc token không hợp lệ.

**Giải pháp:**

1. Đăng nhập lại để lấy token mới từ Identity Service
2. Đảm bảo header `Authorization: Bearer {{token}}` được thêm vào request
3. Kiểm tra token chưa hết hạn (access token có thời hạn 15 phút)

### Lỗi: "Insufficient permissions"

**Nguyên nhân:** User không có quyền truy cập endpoint.

**Giải pháp:**

- Categories (POST/PUT/DELETE): Cần ADMIN hoặc BRANCH_MANAGER
- Products (POST/PUT/DELETE): Cần ADMIN, BRANCH_MANAGER hoặc SELLER
- Đăng nhập với tài khoản có đủ quyền

### Lỗi: "Failed to open the explicitly specified database 'catalog_db'"

**Nguyên nhân:** Database chưa được tạo.

**Giải pháp:** Chạy script SQL để tạo database:

```bash
Get-Content .\database\sqlserver\catalog_db.sql | docker exec -i furnimart-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "FurniMart@2024" -C
```

### Lỗi: "The target table 'Categories' of the DML statement cannot have any enabled triggers"

**Nguyên nhân:** Đã được sửa trong code. Nếu vẫn gặp, rebuild container:

```bash
docker-compose build --no-cache catalog-service
docker-compose up -d catalog-service
```

### ViewCount không tăng

**Nguyên nhân:** Đã được sửa trong code. Đảm bảo:

- Gọi endpoint `/api/products/slug/:slug` (không phải `/api/products/:id`)
- Rebuild container sau khi cập nhật code

### Token hết hạn

**Nguyên nhân:** Access token có thời hạn 15 phút.

**Giải pháp:**

1. Đăng nhập lại để lấy token mới
2. Hoặc sử dụng refresh token endpoint để lấy access token mới

---

## 📊 Cấu Trúc Database

### Bảng Categories

- `Id` (INT, PK)
- `Name` (NVARCHAR(255))
- `Description` (NVARCHAR(1000))
- `ParentCategoryId` (INT, FK)
- `Slug` (NVARCHAR(255), UNIQUE)
- `IsActive` (BIT)
- `DisplayOrder` (INT)
- `CreatedAt`, `UpdatedAt` (DATETIME2)

### Bảng Products

- `Id` (UNIQUEIDENTIFIER, PK)
- `Name`, `Description`, `ShortDescription`
- `SKU` (NVARCHAR(100), UNIQUE)
- `CategoryId` (INT, FK)
- `BasePrice`, `SalePrice` (DECIMAL(18,2))
- `StockStatus` (NVARCHAR(50))
- `IsActive`, `IsFeatured` (BIT)
- `Weight`, `Length`, `Width`, `Height` (DECIMAL)
- `Material`, `Color`, `Brand` (NVARCHAR)
- `WarrantyPeriod` (INT)
- `Slug` (NVARCHAR(255), UNIQUE)
- `ViewCount` (INT)
- `CreatedAt`, `UpdatedAt` (DATETIME2)

---

## 📝 Ghi Chú

- Service này sử dụng JWT token từ Identity Service để xác thực
- Các endpoint GET (xem) không cần authentication
- Các endpoint POST/PUT/DELETE yêu cầu authentication và phân quyền phù hợp
- ViewCount chỉ tăng khi gọi endpoint `/api/products/slug/:slug`
- Tất cả timestamps sử dụng UTC
- Access token có thời hạn 15 phút, cần refresh khi hết hạn
