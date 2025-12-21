# Database Initialization

## Overview
This directory contains SQL scripts to initialize all databases for FurniMart microservices.

## Databases
- `identity_db.sql` - Identity Service database
- `catalog_db.sql` - Catalog Service database  
- `inventory_db.sql` - Inventory Service database
- `order_db.sql` - Order Service database
- `delivery_db.sql` - Delivery Service database
- `payment_db.sql` - Payment & After-Sale Service database
- `reporting_db.sql` - Reporting Service database

## Initialization Methods

### Method 1: Manual Execution (Recommended for First Time)

After SQL Server container is running:

**Windows (PowerShell):**
```powershell
# From project root
cd database/sqlserver
.\init-databases.ps1
```

**Linux/Mac:**
```bash
# Wait for SQL Server to be ready (about 30 seconds)
sleep 30

# Run SQL scripts manually
docker exec -i furnimart-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "FurniMart@2024" \
  -i /docker-entrypoint-initdb.d/identity_db.sql
```

### Method 2: Docker Exec

```bash
# Execute all SQL files
docker exec -i furnimart-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "FurniMart@2024" \
  < database/sqlserver/identity_db.sql

# Or execute them one by one
for file in database/sqlserver/*.sql; do
  docker exec -i furnimart-sqlserver /opt/mssql-tools/bin/sqlcmd \
    -S localhost -U sa -P "FurniMart@2024" \
    < "$file"
done
```

### Method 3: SQL Server Management Studio (SSMS)

1. Connect to `localhost,1433` with:
   - Username: `sa`
   - Password: `FurniMart@2024`

2. Open and execute each `.sql` file in order

## Verify Databases

```sql
-- Check if databases exist
SELECT name FROM sys.databases WHERE name LIKE '%_db'

-- Check identity_db tables
USE identity_db
SELECT name FROM sys.tables

-- Check roles
SELECT * FROM Roles
```

## Troubleshooting

### SQL Server not ready
Wait a bit longer (SQL Server takes 20-30 seconds to start):
```bash
docker logs furnimart-sqlserver
```

### Permission errors
Ensure you're using the `sa` user with correct password.

### Database already exists
Scripts use `IF NOT EXISTS` checks, so they're safe to run multiple times.


