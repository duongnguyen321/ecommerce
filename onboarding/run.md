# How to Run This Project

This guide provides the necessary commands to run the application after it has been successfully set up.

## Running the Development Server

To start the application in development mode with hot-reloading, execute the following command in your terminal:

```bash
bun run dev
```

The application will typically be available at `http://localhost:3000` or the `PORT` specified in your `.env` file.

## Other Useful Scripts

- **Build for Production:** To create an optimized production build.
  ```bash
  bun run build
  ```
- **Start Production Server:** To run the application from the production build.
  ```bash
  bun run start
  ```
- **Lint the Code:** To check for code quality and style issues.
  ```bash
  bun run lint
  ```
- **Clear All Database Data:** To completely wipe the database using the custom script. **Use with caution.**
  ```bash
  bun run flushall
  ```
