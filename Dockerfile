# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy configuration files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application source files
COPY . .

# Build both front-end SPA and back-end server bundle
RUN npm run build

# --- Production Environment Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Set container environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors for dependency installation
COPY package*.json ./

# Install only production dependencies (excluding devDependencies)
RUN npm ci --only=production

# Copy built application assets and code from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000 (standard ingress port for GulaSkin)
EXPOSE 3000

# Run the compiled backend server bundle
CMD ["npm", "start"]
