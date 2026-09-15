# Build stage
FROM node:22-alpine AS builder

# Prisma needs OpenSSL available during client generation as well as at runtime.
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine

# Install OpenSSL for Prisma + mariadb-client for mysqldump + gzip
RUN apk add --no-cache openssl mariadb-client gzip

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema and generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create uploads and logs directories
RUN mkdir -p /app/uploads /app/logs

# Expose port
EXPOSE 5000

# Start application
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
