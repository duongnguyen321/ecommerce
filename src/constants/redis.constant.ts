const generateKey = (parts: (string | number | boolean)[]) => parts.join(':');

export const CACHE_KEY = {
  // === USERS & AUTHENTICATION (Session-based cache) ===
  USER_BY_TOKEN: (token: string) => generateKey(['user', 'token', token]),
  USER_PROFILE: (userId: string) => generateKey(['user', 'profile', userId]),
  USER_PATTERN: (userId: string) => `user:*:${userId}*`,

  // === USER ADDRESSES (Session-based or 15-30 min) ===
  ADDRESS_BY_USER: (userId: string) => generateKey(['address', 'user', userId]),
  ADDRESS_PATTERN: (userId: string) => `address:user:${userId}*`,

  // === PRODUCTS (Medium-term cache 5-15 minutes) ===
  PRODUCTS: (
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
    category?: string
  ) =>
    generateKey([
      'products',
      page,
      limit,
      sortBy,
      sortOrder,
      category || 'all',
    ]),
  PRODUCT_BY_ID: (id: string) => generateKey(['product', id]),
  PRODUCT_PATTERN: () => 'product*',

  // === TAGS (Static data - Long-term cache) ===
  PRODUCT_TAGS: (page: number, limit: number) =>
    generateKey(['product_tags', page, limit]),
  TAGS_PATTERN: () => 'product_tags*',

  // === REVIEWS (Medium-term cache 15-30 minutes) ===
  REVIEWS_BY_PRODUCT: (productId: string, page: number, limit: number) =>
    generateKey(['reviews', 'product', productId, page, limit]),
  REVIEWS_PATTERN: (productId: string) => `reviews:product:${productId}*`,

  // === VOUCHERS (Short-term cache 1-5 minutes) ===
  VOUCHER_BY_CODE: (code: string) => generateKey(['voucher', code]),
  VOUCHER_PATTERN: () => 'voucher:*',

  // === PROMOTIONS (Short-term cache 5-10 minutes) ===
  ACTIVE_PROMOTIONS: (page: number, limit: number) =>
    generateKey(['promotions', 'active', page, limit]),
  PROMOTIONS_PATTERN: () => 'promotions:*',

  // === WISHLIST (Session-based cache) ===
  WISHLIST_BY_USER: (userId: string) =>
    generateKey(['wishlist', 'user', userId]),
  WISHLIST_PATTERN: (userId: string) => `wishlist:user:${userId}*`,

  // === LOYALTY (Long-term cache 1 hour) ===
  LOYALTY_INFO_BY_USER: (userId: string) =>
    generateKey(['loyalty_info', 'user', userId]),
  MEMBERSHIP_TIERS: () => generateKey(['membership_tiers']),
  LOYALTY_PATTERN: (userId: string) => `loyalty_info:user:${userId}*`,

  // === SUPPORT TICKETS (DO NOT CACHE - As per DBML) ===
  SUPPORT_TICKETS_BY_USER: (userId: string, page: number, limit: number) =>
    generateKey(['support_tickets', 'user', userId, page, limit]),

  // === ORDERS (DO NOT CACHE - Transactional data) ===
  ORDER_BY_ID: (orderId: string) => generateKey(['order', orderId]),
  MY_ORDERS: (userId: string, page: number, limit: number) =>
    generateKey(['my_orders', userId, page, limit]),

  // === CONTENT/POSTS (Long-term cache several hours) ===
  POSTS: (page: number, limit: number) => generateKey(['posts', page, limit]),
  POST_BY_SLUG: (slug: string) => generateKey(['post', slug]),
  POSTS_PATTERN: () => 'posts*',
  POST_PATTERN: (slug: string) => `post:${slug}*`,

  // === EMPLOYEES & ROLES (Long-term cache) ===
  EMPLOYEE_BY_TOKEN: (token: string) =>
    generateKey(['employee', 'token', token]),
  ROLES: () => generateKey(['roles']),
  PERMISSIONS: () => generateKey(['permissions']),
  ROLE_PERMISSIONS: (roleId: string) =>
    generateKey(['role_permissions', roleId]),
  EMPLOYEE_ROLES: (employeeId: string) =>
    generateKey(['employee_roles', employeeId]),

  // === STORES (Very static data - Long-term cache) ===
  STORES: () => generateKey(['stores']),
  STORE_BY_ID: (storeId: string) => generateKey(['store', storeId]),

  // === SUPPLIERS (Static data - Long-term cache) ===
  SUPPLIERS: () => generateKey(['suppliers']),
  SUPPLIER_BY_ID: (supplierId: string) => generateKey(['supplier', supplierId]),

  // === REFERENCE TABLES (Extremely static - Cache indefinitely) ===
  ORDER_STATUSES: () => generateKey(['order_statuses']),
  PAYMENT_METHODS: () => generateKey(['payment_methods']),
  PAYMENT_STATUSES: () => generateKey(['payment_statuses']),

  // === CUSTOMER GROUPS (Long-term cache) ===
  CUSTOMER_GROUPS: () => generateKey(['customer_groups']),
  CUSTOMER_GROUP_MEMBERS: (groupId: string) =>
    generateKey(['customer_group_members', groupId]),

  // === COMPANIES B2B (Long-term cache) ===
  COMPANIES: () => generateKey(['companies']),
  COMPANY_BY_ID: (companyId: string) => generateKey(['company', companyId]),

  // === ATTRIBUTES (Static data - Long-term cache) ===
  ATTRIBUTES: () => generateKey(['attributes']),
  ATTRIBUTE_VALUES: (attributeId: string) =>
    generateKey(['attribute_values', attributeId]),
};
