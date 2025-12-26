const axios = require("axios");

class OrderServiceClient {
  constructor() {
    this.baseUrl =
      process.env.ORDER_SERVICE_URL || "http://order-service:5004";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
    });
  }

  /**
   * Thông báo cho Order Service khi sản phẩm quay lại stock
   */
  async notifyStockAvailable(productId, branchId, quantity) {
    try {
      const response = await this.client.post(
        "/api/orders/stock-available",
        {
          productId,
          branchId,
          quantity,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error notifying order service about stock:", error.message);
      // Không throw error, chỉ log vì đây là notification
      return null;
    }
  }

  /**
   * Thông báo cho Order Service khi sản phẩm hết stock
   */
  async notifyOutOfStock(productId, branchId) {
    try {
      const response = await this.client.post(
        "/api/orders/out-of-stock",
        {
          productId,
          branchId,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error notifying order service about out of stock:",
        error.message
      );
      return null;
    }
  }

  /**
   * Kiểm tra xem order có tồn tại không
   */
  async orderExists(orderId) {
    try {
      const response = await this.client.get(`/api/orders/${orderId}`);
      return response.data.data?.order || null;
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error.message);
      return null;
    }
  }

  /**
   * Lấy chi tiết order
   */
  async getOrderDetails(orderId) {
    try {
      const response = await this.client.get(`/api/orders/${orderId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching order details:`, error.message);
      throw new Error(`Failed to fetch order details from order service`);
    }
  }

  /**
   * Cập nhật status fulfillment của order
   */
  async updateOrderFulfillmentStatus(orderId, status, reason = null) {
    try {
      const response = await this.client.put(
        `/api/orders/${orderId}/fulfillment-status`,
        {
          status,
          reason,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error updating order fulfillment status:",
        error.message
      );
      throw new Error(`Failed to update order fulfillment status`);
    }
  }

  /**
   * Lấy danh sách pending orders
   */
  async getPendingOrders(branchId, options = {}) {
    try {
      const response = await this.client.get("/api/orders/pending", {
        params: { branchId, ...options },
      });
      return response.data.data.orders;
    } catch (error) {
      console.error("Error fetching pending orders:", error.message);
      return [];
    }
  }
}

module.exports = new OrderServiceClient();
