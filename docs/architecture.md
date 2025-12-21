# FurniMart Architecture Documentation

## Overview

FurniMart follows a microservice architecture pattern, enabling scalability, maintainability, and independent deployment of services.

## Architecture Principles

- **Domain-Driven Design**: Services are separated by business domain, not by user role
- **Shared Database Server**: Single SQL Server instance with multiple logical databases
- **API Gateway**: Centralized entry point for all client requests
- **Containerization**: All services run in Docker containers
- **Service Independence**: Each service can be developed, deployed, and scaled independently

## Service Breakdown

### 1. API Gateway

- **Purpose**: Single entry point for all client requests
- **Responsibilities**: Routing, authentication, rate limiting, CORS

### 2. Identity Service

- **Purpose**: User authentication and authorization
- **Database**: `identity_db`
- **Scope**: All user roles (Customer, Seller, Branch Manager, Delivery Staff, Admin)

### 3. Catalog Service

- **Purpose**: Product catalog management
- **Database**: `catalog_db`
- **Scope**: Products, categories, 3D models, reviews

### 4. Inventory Service

- **Purpose**: Multi-branch inventory management
- **Database**: `inventory_db`
- **Scope**: Stock levels, branch inventory, availability

### 5. Order Service

- **Purpose**: Order lifecycle management
- **Database**: `order_db`
- **Scope**: Orders, order items, invoices, order status

### 6. Delivery Service

- **Purpose**: Delivery operations
- **Database**: `delivery_db`
- **Scope**: Delivery assignments, tracking, proof of delivery

### 7. Payment & After-Sale Service

- **Purpose**: Payments and after-sale services
- **Database**: `payment_db`
- **Scope**: Payments, returns, warranty, assembly booking

### 8. Reporting Service

- **Purpose**: Analytics and reporting
- **Database**: `reporting_db`
- **Scope**: Sales reports, analytics, business intelligence

## Database Architecture

- **Shared SQL Server**: Single container running SQL Server
- **Logical Separation**: Multiple databases (one per service)
- **Benefits**: Easier management, cost-effective, simplified backup/restore

## Frontend Architecture

Frontend applications are separated by user role:

- `web-customer` - Customer web application
- `web-seller` - Seller/Store Staff web application
- `web-branch-manager` - Branch Manager web application
- `web-delivery` - Delivery Staff web application
- `web-admin` - Admin web application
- `mobile-customer` - Customer mobile application

## Communication Patterns

- **Synchronous**: HTTP/REST for request/response
- **Asynchronous**: (To be determined - message queue if needed)

## Deployment

- **Docker Compose**: Local development and testing
- **Production**: (To be determined - Kubernetes, Docker Swarm, etc.)

## Status

🚧 **In Progress** - Architecture is being refined as implementation progresses

