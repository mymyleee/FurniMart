# Catalog Service

## Overview
Manages product catalog including product information, categories, 3D models, images, and product details.

## Responsibilities
- Product CRUD operations
- Category management
- Product search & filtering
- 3D model metadata management
- Product images management
- Product reviews & ratings

## Database
- Database: `catalog_db`
- Tables: Products, Categories, ProductImages, Product3DModels, Reviews, Ratings, etc.

## API Endpoints (Planned)
- `GET /products` - List products with filtering
- `GET /products/:id` - Get product details
- `POST /products` - Create product (Seller/Admin)
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /categories` - List categories
- `GET /products/:id/3d` - Get 3D model info
- `POST /products/:id/reviews` - Add review

## Technology Stack
- To be determined

## Status
🚧 Placeholder - Implementation pending
