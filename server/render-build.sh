# Build script for Render deployment
#!/bin/bash

echo "Starting build process..."

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

echo "Build completed successfully!"