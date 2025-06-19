# Project Setup Guide

Follow these detailed steps to set up the project environment on your local machine.

## 1. Prerequisites

Before you begin, ensure you have the following software installed:

- **Bun:** This project uses Bun as the package manager and runtime. You can find installation instructions on the [official Bun website](https://bun.sh/).
- **PostgreSQL:** A running PostgreSQL database instance is required.
- **Redis:** A running Redis instance is required for caching.

## 2. Clone the Repository

First, clone the project repository to your local machine using Git.

## 3. Install Dependencies

Navigate to the project's root directory and install the required Node.js packages using Bun.

```bash
bun install
```

## 4. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example file:

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values for your local environment, including `POSTGRES_PRISMA_URL`, `REDIS_URL`, and the various secret keys.

## 5. Set Up the Database

Run the Prisma migration command to create the database schema based on `prisma/schema.prisma`. This will set up all the necessary tables and relations in your PostgreSQL database.

```bash
bunx prisma migrate dev
```

## 6. Seed the Database (Recommended)

To populate the application with realistic sample data for testing and development, run the seed script. This will create users, products, orders, and more.

```bash
bun run seed
```

After completing these steps, your project is fully set up and ready to run.
