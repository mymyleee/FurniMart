const axios = require("axios");

class CatalogServiceClient {
  constructor() {
    this.baseUrl =
      process.env.CATALOG_SERVICE_URL || "http://catalog-service:5002";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
    });
  }

  /**
   * Lấy thông tin sản phẩm từ Catalog Service
   */
  async getProduct(productId) {
    try {
      const response = await this.client.get(`/api/products/${productId}`);
      return response.data.data.product;
    } catch (error) {
      console.error(
        `Error fetching product ${productId} from catalog service:`,
        error.message
      );
      throw new Error(`Failed to fetch product from catalog service`);
    }
  }

  /**
   * Lấy danh mục sản phẩm
   */
  async getCategory(categoryId) {
    try {
      const response = await this.client.get(`/api/categories/${categoryId}`);
      return response.data.data.category;
    } catch (error) {
      console.error(
        `Error fetching category ${categoryId}:`,
        error.message
      );
      throw new Error(`Failed to fetch category from catalog service`);
    }
  }

  /**
   * Lấy danh sách sản phẩm
   */
  async getProducts(options = {}) {
    try {
      const response = await this.client.get("/api/products", { params: options });
      return response.data.data.products;
    } catch (error) {
      console.error("Error fetching products:", error.message);
      throw new Error(`Failed to fetch products from catalog service`);
    }
  }

  /**
   * Kiểm tra sản phẩm có tồn tại không
   */
  async productExists(productId) {
    try {
      const product = await this.getProduct(productId);
      return !!product;
    } catch (error) {
      return false;
    }
  }

  /**
   * Lấy tất cả danh mục
   */
  async getAllCategories() {
    try {
      const response = await this.client.get("/api/categories");
      return response.data.data.categories;
    } catch (error) {
      console.error("Error fetching categories:", error.message);
      throw new Error(`Failed to fetch categories from catalog service`);
    }
  }
}

module.exports = new CatalogServiceClient();
