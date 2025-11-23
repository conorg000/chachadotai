# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY ../../package*.json ./
COPY ../../tsconfig.json ./

# Copy workspace packages
COPY ../../packages ./packages

# Copy backend app
COPY package*.json ./apps/backend/
COPY tsconfig.json ./apps/backend/
COPY src ./apps/backend/src

# Install dependencies
RUN npm install

# Build contracts package
WORKDIR /app/packages/contracts
RUN npm run build

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/packages/contracts ./packages/contracts

# Install production dependencies only
RUN npm install --production

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]
