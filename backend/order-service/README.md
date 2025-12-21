# Order Service

## Overview
Manages the complete order lifecycle from creation to fulfillment, including order assignment to branches.

## Responsibilities
- Order creation & management
- Order assignment to nearest branch
- Order status tracking
- Order cancellation (before delivery)
- Order history
- Invoice generation

## Database
- Database: `order_db`
- Tables: Orders, OrderItems, OrderStatusHistory, Invoices, etc.

## API Endpoints (Planned)
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `GET /orders` - List orders (with filters)
- `PUT /orders/:id/status` - Update order status
- `POST /orders/:id/cancel` - Cancel order
- `GET /orders/:id/invoice` - Generate invoice
- `POST /orders/:id/assign-branch` - Assign order to branch

## Technology Stack
- To be determined

## Status
🚧 Placeholder - Implementation pending
