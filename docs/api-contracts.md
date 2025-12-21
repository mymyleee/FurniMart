# API Contracts Documentation

## Overview

This document defines the API contracts between services and clients. All APIs go through the API Gateway.

## API Gateway Base URL

```
http://localhost:8080/api
```

## Service Endpoints

### Identity Service

**Base Path**: `/auth`

#### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user info

#### Profile Management

- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Catalog Service

**Base Path**: `/catalog`

#### Products

- `GET /catalog/products` - List products (with filters)
- `GET /catalog/products/:id` - Get product details
- `POST /catalog/products` - Create product (Seller/Admin)
- `PUT /catalog/products/:id` - Update product
- `DELETE /catalog/products/:id` - Delete product

#### Categories

- `GET /catalog/categories` - List categories
- `GET /catalog/categories/:id/products` - Get products by category

#### Reviews

- `GET /catalog/products/:id/reviews` - Get product reviews
- `POST /catalog/products/:id/reviews` - Add review

### Inventory Service

**Base Path**: `/inventory`

#### Inventory Management

- `GET /inventory/branches/:branchId/products` - Get inventory by branch
- `GET /inventory/products/:productId/availability` - Check availability
- `PUT /inventory/branches/:branchId/products/:productId` - Update stock
- `POST /inventory/transfer` - Transfer between branches

### Order Service

**Base Path**: `/orders`

#### Order Management

- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `GET /orders` - List orders (with filters)
- `PUT /orders/:id/status` - Update order status
- `POST /orders/:id/cancel` - Cancel order

### Delivery Service

**Base Path**: `/delivery`

#### Delivery Management

- `GET /delivery/deliveries` - List deliveries
- `GET /delivery/deliveries/:id` - Get delivery details
- `PUT /delivery/deliveries/:id/status` - Update delivery status
- `POST /delivery/deliveries/:id/proof` - Upload proof of delivery

### Payment & After-Sale Service

**Base Path**: `/payment`

#### Payment

- `POST /payment/process` - Process payment
- `GET /payment/:id` - Get payment status
- `POST /payment/:id/callback` - Payment gateway callback

#### After-Sale

- `POST /payment/returns` - Initiate return
- `POST /payment/warranty/claim` - Create warranty claim
- `POST /payment/assembly/booking` - Book assembly service

### Reporting Service

**Base Path**: `/reports`

#### Reports

- `GET /reports/sales` - Sales reports
- `GET /reports/products` - Product performance
- `GET /reports/branches` - Branch performance

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Status

🚧 **Placeholder** - Detailed API contracts will be defined during implementation phase

