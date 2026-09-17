# ----------------------------------------
# Stage 1: Build (The "Compiler" Layer)
# ----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDeps like typescript)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Compile TS -> JS (Outputs to /app/dist)
RUN npm run build

# ----------------------------------------
# Stage 2: Run (The "Production" Layer)
# ----------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set strict production environment
ENV NODE_ENV=production

# Install ONLY production dependencies (No Typescript, ESLint, etc.)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Copy migrations (Need these to run DB updates in prod)
COPY --from=builder /app/migrations ./migrations

# Security: Run as non-root user
USER node

# Expose API port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
