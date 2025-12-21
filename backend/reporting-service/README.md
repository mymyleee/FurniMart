# Reporting Service

## Overview
Provides analytics, reporting, and business intelligence features for administrators and branch managers.

## Responsibilities
- Sales reports
- Product performance analytics
- Branch performance metrics
- Revenue analysis
- Top products/sellers
- Custom report generation

## Database
- Database: `reporting_db`
- Tables: ReportConfigs, ReportHistory, AnalyticsCache, etc.
- Reads from: order_db, inventory_db, catalog_db (via data aggregation)

## API Endpoints (Planned)
- `GET /reports/sales` - Sales reports
- `GET /reports/products` - Product performance
- `GET /reports/branches` - Branch performance
- `GET /reports/revenue` - Revenue analysis
- `GET /reports/top-products` - Top selling products
- `POST /reports/custom` - Generate custom report

## Technology Stack
- To be determined

## Status
🚧 Placeholder - Implementation pending
