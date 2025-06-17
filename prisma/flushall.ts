import { prisma } from '@/utils/prisma';

// write function to delete all data from the database
async function deleteAllData() {
  console.log('Starting database cleanup...');

  // Define deletion order to respect foreign key constraints
  const deletionOrder = [
    // First delete junction tables and child tables
    'cart_items',
    'employee_roles',
    'return_request_items', // Must be before order_items
    'refund_transactions', // Must be before return_requests
    'shipment_items', // Must be before shipments and order_items
    'order_items',
    'payment_transactions',
    'post_comments',
    'product_reviews',
    'product_tags',
    'product_view_history',
    'ticket_replies',
    'user_addresses',
    'variant_attribute_values',
    'wishlists',
    'customer_group_members',
    'goods_receipt_items', // Must be before goods_receipts
    'images',
    'inventory',
    'loyalty_point_history',
    'role_permissions',

    // Then delete tables that depend on other tables
    'attribute_values',
    'daily_sales_reports',
    'email_history',
    'return_requests', // Must be after return_request_items
    'shipments', // Must be after shipment_items
    'support_tickets',
    'user_profiles',

    // Then delete main entity tables
    'activity_logs',
    'attributes',
    'companies',
    'customer_groups',
    'goods_receipts', // Must be before employees
    'membership_tiers',
    'orders',
    'product_variants', // Must be after all references to it
    'products', // Must be after product_variants
    'promotions',
    'payment_methods',
    'payment_statuses',
    'permissions',
    'posts',
    'roles',
    'stores',
    'suppliers',
    'tags',
    'employees', // Must be after goods_receipts
    'users',
    'order_statuses',
    'vouchers',
  ];

  // Delete from each table in the specified order
  for (const tableName of deletionOrder) {
    try {
      console.log(`Deleting data from table: ${tableName}`);
      // @ts-ignore - Dynamic access to prisma client models
      await prisma[tableName].deleteMany({});
    } catch (error) {
      console.error(`Error deleting from ${tableName}:`, error);
    }
  }

  // Check if any tables were missed in our deletion order
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name != '_prisma_migrations'
    `;

    // Define a type for the table object from the query result
    type TableRecord = { table_name: string };

    // @ts-ignore
    const remainingTables = tables.filter(
      (t: TableRecord) =>
        !deletionOrder.includes(t.table_name) &&
        t.table_name !== '_prisma_migrations'
    );

    if (remainingTables.length > 0) {
      console.warn(
        'The following tables were not included in the deletion order:'
      );
      // @ts-ignore
      remainingTables.forEach((t: TableRecord) =>
        console.warn(`- ${t.table_name}`)
      );
    }
  } catch (error) {
    console.error('Error checking for remaining tables:', error);
  }

  console.log('Database cleanup completed.');
}

deleteAllData()
  .then(() => console.log('All data deleted successfully'))
  .catch((e) => console.error('Error during data deletion:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
