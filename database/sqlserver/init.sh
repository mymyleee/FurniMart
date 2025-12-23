#!/bin/bash

# Script khởi tạo tự động các database cho FurniMart
# Script này sẽ chờ SQL Server sẵn sàng và chạy tất cả các file SQL

set -e

# Cấu hình
SQL_SERVER_HOST="${SQL_SERVER_HOST:-sqlserver}"
SQL_SERVER_PORT="${SQL_SERVER_PORT:-1433}"
SQL_SERVER_USER="${SQL_SERVER_USER:-sa}"
SQL_SERVER_PASSWORD="${SQL_SERVER_PASSWORD:-FurniMart@2024}"
SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
SCRIPT_DIR="/docker-entrypoint-initdb.d"
MAX_RETRIES=60
RETRY_INTERVAL=2

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}FurniMart Database Initialization${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Hàm kiểm tra SQL Server đã sẵn sàng chưa
wait_for_sql_server() {
    echo -e "${YELLOW}Đang chờ SQL Server sẵn sàng...${NC}"
    
    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if $SQLCMD -S "$SQL_SERVER_HOST" -U "$SQL_SERVER_USER" -P "$SQL_SERVER_PASSWORD" -Q "SELECT 1" -C > /dev/null 2>&1; then
            echo -e "${GREEN}✅ SQL Server đã sẵn sàng!${NC}"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $((retry_count % 5)) -eq 0 ]; then
            echo -e "${YELLOW}   Đang chờ... ($retry_count/$MAX_RETRIES)${NC}"
        fi
        sleep $RETRY_INTERVAL
    done
    
    echo -e "${RED}❌ Không thể kết nối đến SQL Server sau $MAX_RETRIES lần thử${NC}"
    return 1
}

# Hàm chạy một file SQL
run_sql_file() {
    local file=$1
    local filename=$(basename "$file")
    
    echo -e "${YELLOW}📄 Đang chạy: $filename${NC}"
    
    if $SQLCMD -S "$SQL_SERVER_HOST" -U "$SQL_SERVER_USER" -P "$SQL_SERVER_PASSWORD" -i "$file" -C; then
        echo -e "${GREEN}   ✅ Hoàn thành: $filename${NC}"
        return 0
    else
        echo -e "${RED}   ❌ Lỗi khi chạy: $filename${NC}"
        return 1
    fi
}

# Hàm kiểm tra database đã tồn tại chưa
database_exists() {
    local db_name=$1
    local result=$($SQLCMD -S "$SQL_SERVER_HOST" -U "$SQL_SERVER_USER" -P "$SQL_SERVER_PASSWORD" \
        -Q "SELECT COUNT(*) FROM sys.databases WHERE name = '$db_name'" \
        -h -1 -C 2>/dev/null | tr -d '[:space:]')
    
    [ "$result" = "1" ]
}

# Chờ SQL Server sẵn sàng
if ! wait_for_sql_server; then
    exit 1
fi

echo ""
echo -e "${YELLOW}Đang tìm các file SQL để chạy...${NC}"

# Danh sách các file SQL cần chạy theo thứ tự (tách bằng dấu cách)
SQL_FILES="identity_db.sql catalog_db.sql inventory_db.sql order_db.sql delivery_db.sql payment_db.sql reporting_db.sql"

# Đếm số file đã chạy thành công
success_count=0
skip_count=0
error_count=0

# Chạy từng file SQL
for sql_file in $SQL_FILES; do
    file_path="$SCRIPT_DIR/$sql_file"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${YELLOW}   ⏭️  Bỏ qua: $sql_file (không tìm thấy)${NC}"
        skip_count=$((skip_count + 1))
        continue
    fi
    
    # Kiểm tra database đã tồn tại chưa (dựa vào tên file)
    db_name=$(echo "$sql_file" | sed 's/\.sql$//')
    if database_exists "$db_name"; then
        echo -e "${YELLOW}   ⏭️  Bỏ qua: $sql_file (database $db_name đã tồn tại)${NC}"
        skip_count=$((skip_count + 1))
        continue
    fi
    
    # Chạy file SQL
    if run_sql_file "$file_path"; then
        success_count=$((success_count + 1))
    else
        error_count=$((error_count + 1))
    fi
    
    echo ""
done

# Tóm tắt kết quả
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Tóm tắt kết quả:${NC}"
echo -e "${GREEN}   ✅ Thành công: $success_count${NC}"
echo -e "${YELLOW}   ⏭️  Đã bỏ qua: $skip_count${NC}"
if [ $error_count -gt 0 ]; then
    echo -e "${RED}   ❌ Lỗi: $error_count${NC}"
fi
echo -e "${YELLOW}========================================${NC}"

# Kiểm tra tài khoản admin
echo ""
echo -e "${YELLOW}Kiểm tra tài khoản admin...${NC}"
admin_check=$($SQLCMD -S "$SQL_SERVER_HOST" -U "$SQL_SERVER_USER" -P "$SQL_SERVER_PASSWORD" \
    -d identity_db \
    -Q "SELECT COUNT(*) FROM Users WHERE Email = 'admin@furnimart.com' AND Status = 'ACTIVE'" \
    -h -1 -C 2>/dev/null | tr -d '[:space:]')

if [ "$admin_check" = "1" ]; then
    echo -e "${GREEN}✅ Tài khoản admin đã được tạo:${NC}"
    echo -e "${GREEN}   Email: admin@furnimart.com${NC}"
    echo -e "${GREEN}   Password: Admin@123${NC}"
    echo -e "${YELLOW}   ⚠️  Lưu ý: Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!${NC}"
else
    echo -e "${YELLOW}⚠️  Tài khoản admin chưa được tạo hoặc chưa active${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Hoàn tất khởi tạo database!${NC}"

# Thoát với mã lỗi nếu có lỗi
if [ $error_count -gt 0 ]; then
    exit 1
fi

exit 0

