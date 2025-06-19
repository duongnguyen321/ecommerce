import {
  StoreStatus,
  ActivityStatus,
  EmployeeStatus,
  Gender,
  ProductStatus,
  OrderType,
  CommentStatus,
  stores,
  tags,
  attributes,
  attribute_values,
  roles,
  permissions,
  employees,
  users,
  products,
  product_variants,
  orders,
  user_profiles,
  companies,
  customer_groups,
  posts,
  vouchers,
  order_items,
  DiscountType,
  PromotionType,
  PointTransactionType,
  PostStatus,
  TicketStatus,
  TicketPriority,
  ActorType,
  EmailType,
  EmailStatus,
  payment_methods,
  TransactionStatus,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/utils/prisma';

const USERS_TO_CREATE = 200;
const EMPLOYEES_TO_CREATE = 50;
const PRODUCTS_TO_CREATE = 100;
const ORDERS_TO_CREATE = 500;
const STORES_TO_CREATE = 5;
const PASSWORD = 'password123';

async function main() {
  console.log('--------------------------------------------------');
  console.log('🌱 Starting to seed the database...');
  console.log('--------------------------------------------------');

  // For a clean seed, it's recommended to run `npx prisma migrate reset`
  // before running this script.

  // --- Parallel Batch 1: Independent Reference Data ---
  console.log('- Seeding reference data...');
  await Promise.all([
    seedOrderStatuses(),
    seedPaymentMethods(),
    seedPaymentStatuses(),
    seedMembershipTiers(),
    seedCustomerGroups(),
    seedVouchers(),
    seedPromotions(),
  ]);

  // --- Parallel Batch 2: Core Entities ---
  console.log('\n- Seeding core entities...');
  const [
    stores,
    tags,
    suppliers,
    companies,
    customerGroups,
    vouchers,
    paymentMethods,
  ] = await Promise.all([
    seedStores(),
    seedTags(),
    seedSuppliers(),
    seedCompanies(),
    prisma.customer_groups.findMany(),
    prisma.vouchers.findMany(),
    prisma.payment_methods.findMany(),
  ]);

  const { attributes, attributeValues } = await seedAttributesAndValues();

  // --- RBAC: Depends on nothing from above, but needed for employees ---
  console.log('\n- Seeding RBAC (roles, permissions)...');
  const { roles, permissions } = await seedRolesAndPermissions();

  // --- Users & Employees ---
  console.log('\n- Seeding users and employees...');
  const [employees, users] = await Promise.all([
    seedEmployees(stores, roles).then(async (createdEmployees) => {
      await seedEmployeeRoles(createdEmployees, roles);
      return createdEmployees;
    }),
    seedUsers(companies),
  ]);
  await seedCustomerGroupMembers(users, customerGroups);

  // --- Products & Supply Chain ---
  console.log('\n- Seeding products and supply chain data...');
  const products = await seedProducts(tags);
  const productVariants = await seedProductVariants(products, attributeValues);

  await Promise.all([
    seedInventory(productVariants, stores),
    seedImages(products, productVariants),
    seedGoodsReceipts(suppliers, employees, stores, productVariants),
  ]);

  // --- Content (Posts & Comments) ---
  console.log('\n- Seeding Content (Posts & Comments)...');
  const posts = await seedPosts(employees);
  await seedPostComments(posts, users);

  // --- Orders & Sales ---
  console.log('\n- Seeding orders and sales data...');
  const [_, orders] = await Promise.all([
    seedCarts(users, productVariants),
    seedOrders(users, employees, stores, productVariants, vouchers),
  ]);

  // --- Post-Order Operations (can run in parallel) ---
  console.log('\n- Seeding post-order data...');
  await Promise.all([
    seedOrderFulfillment(orders, employees),
    seedSupportTicketsAndReplies(users, orders, employees),
    seedLoyaltyPoints(users, orders),
    seedPaymentTransactions(orders, paymentMethods),
  ]);

  // --- Final async operations ---
  console.log('\n- Seeding final interaction data and logs...');
  await Promise.all([
    seedProductViewHistory(users, products),
    seedEmailHistory(),
    seedActivityLogs(users, employees, orders, products),
    seedDailySalesReports(stores, orders),
    seedProductReviews(orders, users),
    seedWishlists(users, products),
  ]);

  console.log('--------------------------------------------------');
  console.log('✅ Database seeded successfully!');
  console.log('--------------------------------------------------');
}

// =================================================================
// Seeder Functions
// =================================================================

async function seedOrderStatuses() {
  const statuses = [
    { id: 'pending_confirmation', status_name: 'Pending Confirmation' },
    { id: 'processing', status_name: 'Processing' },
    { id: 'shipped', status_name: 'Shipped' },
    { id: 'delivered', status_name: 'Delivered' },
    { id: 'cancelled', status_name: 'Cancelled' },
    { id: 'awaiting_stock', status_name: 'Awaiting Stock' },
  ];
  await prisma.order_statuses.createMany({
    data: statuses,
    skipDuplicates: true,
  });
}

async function seedPaymentMethods() {
  const methods = [
    { id: 'cod', method_name: 'Cash on Delivery (COD)' },
    { id: 'bank_transfer', method_name: 'Bank Transfer' },
    { id: 'card', method_name: 'Card Payment' },
    { id: 'ewallet', method_name: 'E-wallet' },
  ];
  await prisma.payment_methods.createMany({
    data: methods,
    skipDuplicates: true,
  });
}

async function seedPaymentStatuses() {
  const statuses = [
    { id: 'unpaid', status_name: 'Unpaid' },
    { id: 'paid', status_name: 'Paid' },
    { id: 'failed', status_name: 'Failed' },
    { id: 'refunded', status_name: 'Refunded' },
  ];
  await prisma.payment_statuses.createMany({
    data: statuses,
    skipDuplicates: true,
  });
}

async function seedMembershipTiers() {
  const tiers = [
    {
      tier_name: 'Bronze',
      points_threshold: 0,
      benefits_description: 'Basic benefits for new members.',
    },
    {
      tier_name: 'Silver',
      points_threshold: 1000,
      benefits_description: 'Exclusive discounts and early access.',
    },
    {
      tier_name: 'Gold',
      points_threshold: 5000,
      benefits_description: 'Premium support and special gifts.',
    },
    {
      tier_name: 'Diamond',
      points_threshold: 10000,
      benefits_description: 'All benefits, plus personal account manager.',
    },
  ];
  await prisma.membership_tiers.createMany({
    data: tiers,
    skipDuplicates: true,
  });
}

async function seedCompanies() {
  const companyData = [];
  for (let i = 0; i < 20; i++) {
    companyData.push({
      company_name: faker.company.name(),
      tax_code: faker.string.alphanumeric(10).toUpperCase(),
      billing_address: faker.location.streetAddress(true),
      company_email: faker.internet.email().toLowerCase(),
      company_phone: faker.phone.number().slice(0, 20),
    });
  }
  await prisma.companies.createMany({
    data: companyData,
    skipDuplicates: true,
  });
  return prisma.companies.findMany();
}

async function seedCustomerGroups() {
  const groupData = [
    {
      group_name: 'New Customers',
      description: 'Customers who registered in the last 30 days.',
    },
    { group_name: 'VIP Customers', description: 'High-value customers.' },
    { group_name: 'Wholesale', description: 'B2B wholesale customers.' },
  ];
  await prisma.customer_groups.createMany({
    data: groupData,
    skipDuplicates: true,
  });
}

async function seedVouchers() {
  const voucherData = [
    {
      code: 'SUMMER10',
      title: '10% Off Summer Sale',
      description: 'Get 10% off your entire order.',
      discount_type: 'percentage' as DiscountType,
      discount_value: 10,
      min_order_value: 50,
      max_discount_amount: 20,
      start_date: faker.date.past(),
      end_date: faker.date.future(),
      initial_quantity: 1000,
    },
    {
      code: 'FREESHIP',
      title: 'Free Shipping',
      description: 'Free shipping on orders over $100.',
      discount_type: 'fixed_amount' as DiscountType,
      discount_value: 999, // Represents shipping fee
      min_order_value: 100,
      start_date: faker.date.past(),
      end_date: faker.date.future(),
      initial_quantity: 500,
    },
  ];
  await prisma.vouchers.createMany({ data: voucherData, skipDuplicates: true });
}

async function seedPromotions() {
  const promotionData = [
    {
      name: 'Buy 2 Get 1 Free on T-Shirts',
      description: 'Add 3 T-shirts to your cart, and one will be free!',
      type: 'BUY_X_GET_Y' as PromotionType,
      conditions: { required_tag: 'T-shirt', min_quantity: 3 },
      actions: { discount_type: 'percentage_on_cheapest', value: 100 },
      start_date: faker.date.past(),
      end_date: faker.date.future(),
      status: 'active' as ActivityStatus,
    },
    {
      name: '20% Off Electronics',
      description: 'Get 20% off all electronics.',
      type: 'PRODUCT_DISCOUNT' as PromotionType,
      conditions: { required_tag: 'Electronics' },
      actions: { discount_type: 'percentage', value: 20 },
      start_date: faker.date.past(),
      end_date: faker.date.future(),
      status: 'active' as ActivityStatus,
    },
  ];
  await prisma.promotions.createMany({
    data: promotionData,
    skipDuplicates: true,
  });
}

async function seedStores() {
  const storeData: {
    name: string;
    address: string;
    phone_number: string;
    status: StoreStatus;
  }[] = [];
  for (let i = 0; i < STORES_TO_CREATE; i++) {
    storeData.push({
      name: `Store ${faker.location.city()}`,
      address: faker.location.streetAddress(),
      phone_number: faker.phone.number().slice(0, 20),
      status: 'active',
    });
  }
  await prisma.stores.createMany({ data: storeData, skipDuplicates: true });
  return await prisma.stores.findMany();
}

async function seedSuppliers() {
  const supplierData = [];
  for (let i = 0; i < 10; i++) {
    supplierData.push({
      name: faker.company.name(),
      contact_person: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone_number: faker.phone.number().slice(0, 20),
      address: faker.location.streetAddress(),
    });
  }
  await prisma.suppliers.createMany({
    data: supplierData,
    skipDuplicates: true,
  });
  return prisma.suppliers.findMany();
}

async function seedTags() {
  const tagData = [
    'New Arrival',
    'Best Seller',
    'On Sale',
    'Clothing',
    'Electronics',
    'Books',
    'Home Goods',
  ].map((name) => ({ tag_name: name }));
  await prisma.tags.createMany({ data: tagData, skipDuplicates: true });
  return await prisma.tags.findMany();
}

async function seedAttributesAndValues() {
  const attributesData = [
    {
      name: 'Color',
      values: ['Red', 'Blue', 'Green', 'Black', 'White', 'Silver', 'Gold'],
    },
    { name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
    {
      name: 'Material',
      values: ['Cotton', 'Polyester', 'Leather', 'Metal', 'Plastic'],
    },
  ];

  const createdAttributes: attributes[] = [];
  const createdAttributeValues: attribute_values[] = [];

  for (const attr of attributesData) {
    const newAttr = await prisma.attributes.create({
      data: { attribute_name: attr.name },
    });
    createdAttributes.push(newAttr);
    const valuesData = attr.values.map((val) => ({
      attribute_id: newAttr.id,
      value: val,
    }));
    await prisma.attribute_values.createMany({ data: valuesData });
    const newValues = await prisma.attribute_values.findMany({
      where: { attribute_id: newAttr.id },
    });
    createdAttributeValues.push(...newValues);
  }
  return {
    attributes: createdAttributes,
    attributeValues: createdAttributeValues,
  };
}

async function seedRolesAndPermissions() {
  const resources = ['product', 'order', 'user', 'employee', 'store', 'report'];
  const actions = ['create', 'read', 'update', 'delete'];

  const allPermissions = [];
  for (const resource of resources) {
    for (const action of actions) {
      allPermissions.push({
        permission_name: `${resource}:${action}`,
        permission_group: resource.charAt(0).toUpperCase() + resource.slice(1),
        description: `Allows ${action}ing ${resource}s.`,
      });
    }
  }
  await prisma.permissions.createMany({
    data: allPermissions,
    skipDuplicates: true,
  });
  const permissions = await prisma.permissions.findMany();

  const rolesData: {
    role_name: string;
    description: string;
    status: ActivityStatus;
  }[] = [
    {
      role_name: 'Super Admin',
      description: 'Full system access.',
      status: 'active',
    },
    {
      role_name: 'Store Manager',
      description: 'Manages a specific store.',
      status: 'active',
    },
    {
      role_name: 'Sales Staff',
      description: 'Handles in-store and online sales.',
      status: 'active',
    },
    {
      role_name: 'Inventory Manager',
      description: 'Manages stock and supplies.',
      status: 'active',
    },
  ];
  await prisma.roles.createMany({ data: rolesData, skipDuplicates: true });
  const roles = await prisma.roles.findMany();

  const rolePermissions: { role_id: string; permission_id: string }[] = [];
  const superAdminRole = roles.find((r) => r.role_name === 'Super Admin');
  if (superAdminRole) {
    permissions.forEach((p) =>
      rolePermissions.push({ role_id: superAdminRole.id, permission_id: p.id })
    );
  }
  // TODO: Add more granular permissions for other roles

  await prisma.role_permissions.createMany({
    data: rolePermissions,
    skipDuplicates: true,
  });

  return { roles, permissions };
}

async function seedEmployees(stores: stores[], roles: roles[]) {
  const employeeData: {
    full_name: string;
    email: string;
    password_hash: string;
    phone_number: string;
    store_id: string | null;
    status: EmployeeStatus;
    is_super_admin: boolean;
  }[] = [];
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(PASSWORD, salt);

  for (let i = 0; i < EMPLOYEES_TO_CREATE; i++) {
    employeeData.push({
      full_name: faker.person.fullName(),
      email: faker.internet.email({ firstName: `employee${i}` }).toLowerCase(),
      password_hash: passwordHash,
      phone_number: faker.phone.number().slice(0, 20),
      store_id: faker.helpers.arrayElement(stores).id,
      status: 'active',
      is_super_admin: i === 0, // First employee is a super admin
    });
  }
  await prisma.employees.createMany({
    data: employeeData,
    skipDuplicates: true,
  });
  return await prisma.employees.findMany();
}

async function seedCustomerGroupMembers(
  users: users[],
  customerGroups: customer_groups[]
) {
  const membershipData = [];
  const newCustomerGroup = customerGroups.find(
    (g) => g.group_name === 'New Customers'
  );
  if (newCustomerGroup) {
    for (const user of users.slice(0, 50)) {
      // First 50 users are "new"
      membershipData.push({
        user_id: user.id,
        customer_group_id: newCustomerGroup.id,
      });
    }
  }
  await prisma.customer_group_members.createMany({
    data: membershipData,
    skipDuplicates: true,
  });
}

async function seedEmployeeRoles(employees: employees[], roles: roles[]) {
  const salesRole = roles.find((r) => r.role_name === 'Sales Staff');
  const managerRole = roles.find((r) => r.role_name === 'Store Manager');
  const inventoryRole = roles.find((r) => r.role_name === 'Inventory Manager');

  if (!salesRole || !managerRole || !inventoryRole) return;

  const employeeRolesData = [];
  for (const employee of employees) {
    if (employee.is_super_admin) continue;

    // Assign a random role
    const role = faker.helpers.arrayElement([
      salesRole,
      managerRole,
      inventoryRole,
    ]);
    employeeRolesData.push({ employee_id: employee.id, role_id: role.id });
  }

  await prisma.employee_roles.createMany({
    data: employeeRolesData,
    skipDuplicates: true,
  });
}

async function seedUsers(companies: companies[]) {
  // Prepare password hash once for all users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(PASSWORD, salt);

  // Prepare all user data first
  const userData = [];
  for (let i = 0; i < USERS_TO_CREATE; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    userData.push({
      email: faker.internet
        .email({
          firstName,
          lastName,
          provider: `example${i}.com`,
        })
        .toLowerCase(),
      password_hash: passwordHash,
      user_profiles: {
        create: {
          full_name: `${firstName} ${lastName}`,
          phone_number: faker.phone.number().slice(0, 20),
          avatar_url: faker.image.avatar(),
          gender: faker.helpers.arrayElement<Gender>([
            'male',
            'female',
            'other',
          ]),
          date_of_birth: faker.date.birthdate(),
          company_id:
            i % 10 === 0 ? faker.helpers.arrayElement(companies).id : undefined, // 1 in 10 users is a B2B customer
        },
      },
      user_addresses: {
        create: {
          province_city: faker.location.city(),
          district: faker.location.state(),
          ward_commune: faker.location.street(),
          street_address: faker.location.streetAddress(),
          is_default: true,
        },
      },
    });
  }

  // Create users in batches to improve performance
  const BATCH_SIZE = 50;
  const batches = [];

  for (let i = 0; i < userData.length; i += BATCH_SIZE) {
    const batch = userData.slice(i, i + BATCH_SIZE);
    batches.push(batch);
  }

  // Process batches in parallel
  await Promise.all(
    batches.map(async (batch) => {
      await Promise.all(
        batch.map(async (data) => {
          await prisma.users.create({ data });
        })
      );
    })
  );

  return await prisma.users.findMany({ include: { user_profiles: true } });
}

async function seedProducts(tags: tags[]) {
  const productData: {
    name: string;
    description: string;
    status: ProductStatus;
    product_tags: { create: { tag_id: string } };
  }[] = [];

  for (let i = 0; i < PRODUCTS_TO_CREATE; i++) {
    productData.push({
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      status: 'active',
      product_tags: {
        create: {
          tag_id: faker.helpers.arrayElement(tags).id,
        },
      },
    });
  }

  // Create products in batches to improve performance
  const BATCH_SIZE = 25;
  const batches = [];

  for (let i = 0; i < productData.length; i += BATCH_SIZE) {
    const batch = productData.slice(i, i + BATCH_SIZE);
    batches.push(batch);
  }

  // Process batches in parallel
  await Promise.all(
    batches.map(async (batch) => {
      await Promise.all(
        batch.map(async (data) => {
          await prisma.products.create({ data });
        })
      );
    })
  );

  return await prisma.products.findMany();
}

async function seedProductVariants(
  products: products[],
  attributeValues: attribute_values[]
) {
  const [colorAttribute, sizeAttribute] = await Promise.all([
    prisma.attributes.findUnique({
      where: { attribute_name: 'Color' },
    }),
    prisma.attributes.findUnique({
      where: { attribute_name: 'Size' },
    }),
  ]);

  if (!colorAttribute || !sizeAttribute) return [];

  const colors = attributeValues.filter(
    (av) => av.attribute_id === colorAttribute.id
  );
  const sizes = attributeValues.filter(
    (av) => av.attribute_id === sizeAttribute.id
  );

  // Prepare variant data
  const variantPromises = [];

  for (const product of products) {
    const numVariants = faker.number.int({ min: 2, max: 5 });
    for (let i = 0; i < numVariants; i++) {
      const color = faker.helpers.arrayElement(colors);
      const size = faker.helpers.arrayElement(sizes);
      const variantName = `${color.value} ${size.value}`;

      const variantData = {
        product_id: product.id,
        sku: faker.string.alphanumeric(10).toUpperCase(),
        variant_name: `${product.name} - ${variantName}`,
        price: faker.commerce.price({ min: 10, max: 200 }),
        status: 'active' as ProductStatus,
        variant_attribute_values: {
          create: [
            { attribute_value_id: color.id },
            { attribute_value_id: size.id },
          ],
        },
      };

      // Check for uniqueness and create if unique
      variantPromises.push(
        (async () => {
          const existing = await prisma.product_variants.findFirst({
            where: {
              product_id: variantData.product_id,
              variant_name: variantData.variant_name,
            },
          });
          if (!existing) {
            return prisma.product_variants.create({ data: variantData });
          }
          return null;
        })()
      );
    }
  }

  // Process variant creation in parallel
  await Promise.all(variantPromises);

  return await prisma.product_variants.findMany();
}

async function seedInventory(
  productVariants: product_variants[],
  stores: stores[]
) {
  const inventoryData = [];
  for (const variant of productVariants) {
    for (const store of stores) {
      inventoryData.push({
        variant_id: variant.id,
        store_id: store.id,
        quantity: faker.number.int({ min: 0, max: 100 }),
      });
    }
  }

  // Create inventory in batches for better performance
  const BATCH_SIZE = 500;
  for (let i = 0; i < inventoryData.length; i += BATCH_SIZE) {
    const batch = inventoryData.slice(i, i + BATCH_SIZE);
    await prisma.inventory.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function seedImages(
  products: products[],
  productVariants: product_variants[]
) {
  const imagesData = [];
  // Product images
  for (const product of products) {
    for (let i = 0; i < 3; i++) {
      imagesData.push({
        url: faker.image.urlLoremFlickr({ category: 'technics' }),
        alt_text: product.name,
        product_id: product.id,
      });
    }
  }
  // Variant-specific images
  for (const variant of productVariants.slice(
    0,
    Math.floor(productVariants.length / 2)
  )) {
    imagesData.push({
      url: faker.image.urlLoremFlickr({ category: 'fashion' }),
      alt_text: variant.variant_name,
      product_id: variant.product_id,
      variant_id: variant.id,
    });
  }

  // Create images in batches for better performance
  const BATCH_SIZE = 500;
  for (let i = 0; i < imagesData.length; i += BATCH_SIZE) {
    const batch = imagesData.slice(i, i + BATCH_SIZE);
    await prisma.images.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function seedCarts(
  users: (users & { user_profiles: user_profiles | null })[],
  productVariants: product_variants[]
) {
  const cartData = [];
  const usersWithCarts = faker.helpers.arrayElements(
    users,
    Math.floor(USERS_TO_CREATE / 4)
  );
  for (const user of usersWithCarts) {
    const itemsToCart = faker.helpers.arrayElements(
      productVariants,
      faker.number.int({ min: 1, max: 5 })
    );
    for (const variant of itemsToCart) {
      cartData.push({
        user_id: user.id,
        variant_id: variant.id,
        quantity: faker.number.int({ min: 1, max: 3 }),
      });
    }
  }

  // Create cart items in batches for better performance
  const BATCH_SIZE = 500;
  for (let i = 0; i < cartData.length; i += BATCH_SIZE) {
    const batch = cartData.slice(i, i + BATCH_SIZE);
    await prisma.cart_items.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function seedOrders(
  users: (users & { user_profiles: user_profiles | null })[],
  employees: employees[],
  stores: stores[],
  productVariants: product_variants[],
  vouchers: vouchers[]
) {
  // Fetch all status IDs in parallel
  const [orderStatusIds, paymentMethodIds, paymentStatusIds] =
    await Promise.all([
      prisma.order_statuses
        .findMany()
        .then((statuses) => statuses.map((s) => s.id)),
      prisma.payment_methods
        .findMany()
        .then((methods) => methods.map((m) => m.id)),
      prisma.payment_statuses
        .findMany()
        .then((statuses) => statuses.map((s) => s.id)),
    ]);

  // Create orders in batches
  const BATCH_SIZE = 50;
  const orderBatches = [];

  for (
    let batchIndex = 0;
    batchIndex < Math.ceil(ORDERS_TO_CREATE / BATCH_SIZE);
    batchIndex++
  ) {
    const batchSize = Math.min(
      BATCH_SIZE,
      ORDERS_TO_CREATE - batchIndex * BATCH_SIZE
    );
    const batchPromises = [];

    for (let i = 0; i < batchSize; i++) {
      const user = faker.helpers.arrayElement(users);
      const employee = faker.helpers.arrayElement(employees);
      const store = faker.helpers.arrayElement(stores);
      const orderItems = [];
      let subtotal = 0;

      const numItems = faker.number.int({ min: 1, max: 5 });
      const variantsInOrder = faker.helpers.arrayElements(
        productVariants,
        numItems
      );

      for (const variant of variantsInOrder) {
        const quantity = faker.number.int({ min: 1, max: 3 });
        const unitPrice = parseFloat(variant.price as any);
        const itemSubtotal = unitPrice * quantity;
        subtotal += itemSubtotal;
        orderItems.push({
          variant_id: variant.id,
          sku_snapshot: variant.sku,
          product_name_snapshot: 'Product Name Snapshot', // simplified for seed
          variant_name_snapshot: variant.variant_name,
          quantity: quantity,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
        });
      }

      const shippingFee = faker.number.float({
        min: 0,
        max: 20,
        fractionDigits: 2,
      });
      const discountAmount = 0; // simplified
      const total = subtotal + shippingFee - discountAmount;
      const useVoucher = faker.datatype.boolean(0.3); // 30% chance to use a voucher

      const orderData = {
        code: `ORD-${faker.string.alphanumeric(10).toUpperCase()}`,
        user_id: user.id,
        employee_id: faker.helpers.arrayElement([employee.id, null]),
        store_id: faker.helpers.arrayElement([store.id, null]),
        type: faker.helpers.arrayElement<OrderType>(['online', 'in_store']),
        voucher_id: useVoucher
          ? faker.helpers.arrayElement(vouchers).id
          : undefined,
        user_name_snapshot: user.user_profiles!.full_name,
        user_email_snapshot: user.email,
        user_phone_snapshot: user.user_profiles!.phone_number,
        shipping_address_snapshot: faker.location.streetAddress(true),
        subtotal: subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        total: total,
        order_status_id: faker.helpers.arrayElement(orderStatusIds),
        payment_method_id: faker.helpers.arrayElement(paymentMethodIds),
        payment_status_id: faker.helpers.arrayElement(paymentStatusIds),
        order_items: {
          create: orderItems,
        },
      };

      batchPromises.push(prisma.orders.create({ data: orderData }));
    }

    orderBatches.push(Promise.all(batchPromises));
  }

  await Promise.all(orderBatches);

  return (await prisma.orders.findMany({
    include: { order_items: true },
  })) as any;
}

async function seedProductReviews(
  orders: (orders & {
    order_items: (order_items & {
      product_variants: product_variants | null;
    })[];
  })[],
  users: users[]
) {
  const reviewsData: {
    order_id: string;
    product_id: string;
    user_id: string;
    rating: number;
    comment: string;
    status: CommentStatus;
  }[] = [];
  const deliveredOrders = await prisma.orders.findMany({
    where: { order_status_id: 'delivered' },
    include: { order_items: { include: { product_variants: true } } },
  });

  for (const order of deliveredOrders.slice(0, 50)) {
    // Review 50 orders
    if (!order.user_id) continue;
    for (const item of order.order_items) {
      if (!item.variant_id || !item.product_variants) continue;
      const product_id = item.product_variants.product_id;

      reviewsData.push({
        order_id: order.id,
        product_id: product_id,
        user_id: order.user_id,
        rating: faker.number.int({ min: 3, max: 5 }),
        comment: faker.lorem.paragraph(),
        status: 'approved',
      });
    }
  }

  await prisma.product_reviews.createMany({
    data: reviewsData,
    skipDuplicates: true,
  });
}

async function seedWishlists(users: users[], products: products[]) {
  const wishlistData = [];
  for (const user of users.slice(0, Math.floor(USERS_TO_CREATE / 2))) {
    const wishlistedProducts = faker.helpers.arrayElements(
      products,
      faker.number.int({ min: 1, max: 10 })
    );
    for (const product of wishlistedProducts) {
      wishlistData.push({
        user_id: user.id,
        product_id: product.id,
      });
    }
  }
  await prisma.wishlists.createMany({
    data: wishlistData,
    skipDuplicates: true,
  });
}

async function seedPosts(employees: employees[]) {
  const postsData = [];
  for (let i = 0; i < 20; i++) {
    const title = faker.lorem.sentence();
    postsData.push({
      title,
      slug: faker.helpers.slugify(title).toLowerCase(),
      content: faker.lorem.paragraphs(5),
      featured_image_url: faker.image.url(),
      author_id: faker.helpers.arrayElement(employees).id,
      status: faker.helpers.arrayElement(['published', 'draft']) as PostStatus,
      published_at: new Date(),
    });
  }
  await prisma.posts.createMany({ data: postsData, skipDuplicates: true });
  return prisma.posts.findMany();
}

async function seedPostComments(posts: posts[], users: users[]) {
  const commentsData = [];
  for (const post of posts) {
    for (let i = 0; i < faker.number.int({ min: 0, max: 10 }); i++) {
      commentsData.push({
        post_id: post.id,
        content: faker.lorem.sentence(),
        user_id: faker.helpers.arrayElement(users).id,
        status: 'approved' as CommentStatus,
      });
    }
  }
  await prisma.post_comments.createMany({
    data: commentsData,
    skipDuplicates: true,
  });
}

async function seedGoodsReceipts(
  suppliers: any[],
  employees: employees[],
  stores: stores[],
  productVariants: product_variants[]
) {
  for (let i = 0; i < 50; i++) {
    const items = [];
    let total_amount = 0;
    const numItems = faker.number.int({ min: 1, max: 10 });
    const variants = faker.helpers.arrayElements(productVariants, numItems);

    for (const variant of variants) {
      const quantity = faker.number.int({ min: 10, max: 100 });
      const unit_cost = parseFloat(faker.commerce.price({ min: 5, max: 100 }));
      const subtotal = quantity * unit_cost;
      total_amount += subtotal;
      items.push({
        variant_id: variant.id,
        quantity,
        unit_cost,
        subtotal,
      });
    }

    await prisma.goods_receipts.create({
      data: {
        code: `GR-${faker.string.alphanumeric(10).toUpperCase()}`,
        supplier_id: faker.helpers.arrayElement(suppliers).id,
        created_by_employee_id: faker.helpers.arrayElement(employees).id,
        store_id: faker.helpers.arrayElement(stores).id,
        total_amount,
        goods_receipt_items: {
          create: items,
        },
      },
    });
  }
}

async function seedOrderFulfillment(
  orders: (orders & { order_items: order_items[] })[],
  employees: employees[]
) {
  const shippedOrders = faker.helpers.arrayElements(
    orders,
    Math.floor(orders.length * 0.8)
  ); // 80% of orders are shipped

  // Seed Shipments
  const shipmentPromises = shippedOrders.map((order) => {
    return prisma.shipments.create({
      data: {
        order_id: order.id,
        code: `SH-${faker.string.alphanumeric(12).toUpperCase()}`,
        shipping_carrier: faker.helpers.arrayElement([
          'GHTK',
          'BEST Express',
          'Ninja Van',
        ]),
        tracking_code: faker.string.alphanumeric(15),
        status: 'delivered',
        shipment_items: {
          create: order.order_items.map((item) => ({
            order_item_id: item.id,
            quantity: item.quantity,
          })),
        },
      },
    });
  });
  await Promise.all(shipmentPromises);

  // Seed Returns
  const returnedOrders = faker.helpers.arrayElements(
    shippedOrders,
    Math.floor(shippedOrders.length * 0.1)
  ); // 10% of shipped orders are returned
  const returnPromises = returnedOrders.map((order) => {
    const total_refund_amount = order.total; // Simplified
    return prisma.return_requests.create({
      data: {
        code: `RR-${faker.string.alphanumeric(10).toUpperCase()}`,
        original_order_id: order.id,
        processed_by_employee_id: faker.helpers.arrayElement(employees).id,
        reason: faker.lorem.sentence(),
        total_refund_amount: total_refund_amount,
        status: 'completed',
        return_request_items: {
          create: order.order_items.map((item) => ({
            order_item_id: item.id,
            quantity: item.quantity,
          })),
        },
        refund_transactions: {
          create: {
            refund_amount: total_refund_amount,
            refund_method: 'Bank Transfer',
            status: 'successful',
          },
        },
      },
    });
  });
  await Promise.all(returnPromises);
}

async function seedPaymentTransactions(
  orders: (orders & { order_items: order_items[] })[],
  paymentMethods: payment_methods[]
) {
  const transactionData = [];
  const paidOrders = orders.filter((o) => o.payment_status_id === 'paid');

  for (const order of paidOrders) {
    const paymentMethod = paymentMethods.find(
      (pm) => pm.id === order.payment_method_id
    );
    if (paymentMethod) {
      transactionData.push({
        order_id: order.id,
        gateway_transaction_id: faker.string.uuid(),
        amount: order.total,
        payment_method: paymentMethod.method_name,
        status: 'successful' as TransactionStatus,
        transaction_date: order.created_at,
      });
    }
  }
  await prisma.payment_transactions.createMany({
    data: transactionData,
    skipDuplicates: true,
  });
}

async function seedLoyaltyPoints(users: users[], orders: orders[]) {
  const loyaltyData = [];
  for (const order of faker.helpers.arrayElements(orders, 100)) {
    if (order.user_id) {
      loyaltyData.push({
        user_id: order.user_id,
        points_change: Math.floor(parseFloat(order.total as any) / 10),
        transaction_type: 'purchase' as PointTransactionType,
        order_id: order.id,
      });
    }
  }
  await prisma.loyalty_point_history.createMany({
    data: loyaltyData,
    skipDuplicates: true,
  });
}

async function seedSupportTicketsAndReplies(
  users: users[],
  orders: orders[],
  employees: employees[]
) {
  const tickets = [];
  for (let i = 0; i < 50; i++) {
    const user = faker.helpers.arrayElement(users);
    const order = faker.helpers.arrayElement(orders);
    const ticket = await prisma.support_tickets.create({
      data: {
        code: `TKT-${faker.string.alphanumeric(8).toUpperCase()}`,
        user_id: user.id,
        order_id: order.id,
        subject: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        assignee_id: faker.helpers.arrayElement(employees).id,
        status: 'closed' as TicketStatus,
        priority: faker.helpers.arrayElement([
          'low',
          'medium',
          'high',
        ]) as TicketPriority,
      },
    });
    tickets.push(ticket);
  }

  // Seed Replies
  const replyPromises = tickets.map((ticket) => {
    return prisma.ticket_replies.create({
      data: {
        ticket_id: ticket.id,
        content: faker.lorem.paragraph(),
        replier_id: ticket.assignee_id!,
        replier_type: 'EMPLOYEE' as ActorType,
      },
    });
  });
  await Promise.all(replyPromises);
}

async function seedProductViewHistory(users: users[], products: products[]) {
  const historyData = [];
  for (let i = 0; i < 1000; i++) {
    historyData.push({
      user_id: faker.helpers.arrayElement(users).id,
      product_id: faker.helpers.arrayElement(products).id,
    });
  }
  await prisma.product_view_history.createMany({
    data: historyData,
    skipDuplicates: true,
  });
}

async function seedEmailHistory() {
  const emailData = [];
  for (let i = 0; i < 100; i++) {
    emailData.push({
      recipient_email: faker.internet.email().toLowerCase(),
      subject: faker.lorem.sentence(),
      body_html: `<p>${faker.lorem.paragraphs()}</p>`,
      email_type: faker.helpers.arrayElement<EmailType>([
        'ORDER_CONFIRMATION',
        'MARKETING',
        'PASSWORD_RESET',
      ]),
      status: 'sent' as EmailStatus,
    });
  }
  await prisma.email_history.createMany({
    data: emailData,
    skipDuplicates: true,
  });
}

async function seedActivityLogs(
  users: users[],
  employees: employees[],
  orders: orders[],
  products: products[]
) {
  const logs = [];
  // Log order creation
  for (const order of faker.helpers.arrayElements(orders, 20)) {
    logs.push({
      actor_id: order.user_id,
      actor_type: 'USER' as ActorType,
      action: 'CREATE_ORDER',
      entity: 'orders',
      entity_id: order.id,
    });
  }
  // Log product update
  for (const product of faker.helpers.arrayElements(products, 10)) {
    logs.push({
      actor_id: faker.helpers.arrayElement(employees).id,
      actor_type: 'EMPLOYEE' as ActorType,
      action: 'UPDATE_PRODUCT',
      entity: 'products',
      entity_id: product.id,
      change_data: {
        before: { status: 'active' },
        after: { status: 'hidden' },
      },
    });
  }
  await prisma.activity_logs.createMany({ data: logs, skipDuplicates: true });
}

async function seedDailySalesReports(stores: stores[], orders: orders[]) {
  // This is a mock. In a real system, this would be a complex aggregation job.
  const reportData = [];
  for (const store of stores) {
    for (let i = 0; i < 30; i++) {
      // 30 days of reports
      const report_date = faker.date.recent({ days: 30 });
      reportData.push({
        report_date,
        store_id: store.id,
        total_revenue: faker.finance.amount({ min: 5000, max: 20000, dec: 2 }),
        order_count: faker.number.int({ min: 50, max: 200 }),
        products_sold_count: faker.number.int({ min: 100, max: 500 }),
        new_customer_count: faker.number.int({ min: 5, max: 20 }),
      });
    }
  }

  // Remove duplicates by date and store
  const uniqueReportData = Array.from(
    new Map(
      reportData.map((item) => [
        `${item.report_date.toISOString()}-${item.store_id}`,
        item,
      ])
    ).values()
  );

  await prisma.daily_sales_reports.createMany({
    data: uniqueReportData,
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
