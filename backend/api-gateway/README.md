# API Gateway Service

## Overview

Centralized entry point for all microservices. Handles routing, authentication, rate limiting, and request/response transformation.

## Responsibilities

- Route requests to appropriate microservices
- Handle authentication & authorization
- Rate limiting & throttling
- Request/response logging
- CORS configuration
- Load balancing (if multiple instances)

## Technology Stack

- To be determined (Node.js/Express, .NET, Spring Cloud Gateway, etc.)

## Endpoints

- `/api/auth/*` → Identity Service
- `/api/catalog/*` → Catalog Service
- `/api/inventory/*` → Inventory Service
- `/api/orders/*` → Order Service
- `/api/delivery/*` → Delivery Service
- `/api/payment/*` → Payment Service
- `/api/reports/*` → Reporting Service

## Configuration

- Port: 8080 (configurable via environment)
- Database: Uses Identity Service for auth validation

## Status

🚧 Placeholder - Implementation pending
