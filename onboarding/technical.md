# Technical Overview

This document provides a detailed breakdown of the technologies used in this project and a list of its core features with corresponding file paths.

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (v14) - A React framework for building full-stack web applications.
- **Language:** [TypeScript](https://www.typescriptlang.org/) - A statically typed superset of JavaScript.
- **Database ORM:** [Prisma](https://www.prisma.io/) - A next-generation ORM for Node.js and TypeScript.
- **Database:** [PostgreSQL](https://www.postgresql.org/) - A powerful, open-source object-relational database system.
- **Caching:** [Redis](https://redis.io/) - An in-memory data structure store, used for caching API responses to improve performance.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [SASS](https://sass-lang.com/) - For utility-first styling and structured stylesheets.
- **UI Components:** [@heroui/react](https://www.heroui.net/) - A pre-built component library.
- **Runtime & Package Manager:** [Bun](https://bun.sh/) - A fast, all-in-one JavaScript runtime and toolkit.
- **Authentication:** [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (JWT) for token-based auth and [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing.
- **Emailing:** [Nodemailer](https://nodemailer.com/) for sending transactional emails.

## Core Features & File Locations

The application logic is primarily organized within the `src/api/` directory, which is split between customer-facing APIs and admin-only APIs.

### Database

- **Database Schema Definition:** `prisma/schema.prisma`
- **Database Seeding Logic:** `prisma/seed.ts`
- **Database Visualization:** `prisma/shop.dbml`

### Customer-Facing Features

- **User Authentication (Login/Register/Logout):** `src/api/auth.ts`
- **Profile Management:** `src/api/profile.ts`
- **Address Management:** `src/api/address.ts`
- **Product Browsing & Details:** `src/api/product.ts`
- **Category/Tag Listing:** `src/api/category.ts`
- **Shopping Cart Management:** `src/api/cart.ts`
- **Wishlist Management:** `src/api/wishlist.ts`
- **Order Placement & History:** `src/api/order.ts`
- **Voucher & Promotion System:** `src/api/voucher.ts`, `src/api/promotion.ts`
- **Product Reviews:** `src/api/review.ts`
- **Loyalty Program Info:** `src/api/loyalty.ts`
- **Content (Blog) Viewing:** `src/api/content.ts`
- **Customer Support Ticketing:** `src/api/support.ts`

### Admin-Facing Features (in `src/api/admin/`)

- **Admin Authentication:** `src/api/admin/auth.ts`
- **Role-Based Access Control (RBAC):** `src/api/admin/permission.ts`
- **User Management:** `src/api/admin/user.ts`
- **Employee Management:** `src/api/admin/employee.ts`
- **Product & Variant Management:** `src/api/admin/product.ts`
- **Attribute Management:** `src/api/admin/attribute.ts`
- **Category (Tag) Management:** `src/api/admin/category.ts`
- **Order Management:** `src/api/admin/order.ts`
- **Inventory & Goods Receipt Management:** `src/api/admin/inventory.ts`
- **Store & Supplier Management:** `src/api/admin/store.ts`
- **Customer Group Management:** `src/api/admin/customer.ts`
- **Loyalty Program Management:** `src/api/admin/loyalty.ts`
- **Content (Vouchers, Promotions, Posts) Management:** `src/api/admin/content.ts`
- **Return Request Management:** `src/api/admin/return.ts`
- **Support Ticket Management:** `src/api/admin/support.ts`
- **Sales Reporting:** `src/api/admin/report.ts`

### Caching Strategy

- The project implements a sophisticated caching strategy using Redis, as defined in `src/constants/redis.constant.ts` and implemented in `src/utils/redis.ts`. It distinguishes between static data (long-term cache), dynamic data (medium/short-term cache), and transactional data (no cache).
