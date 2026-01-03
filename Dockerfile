# ================================
# Backend Build Stage
# ================================
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build NestJS
RUN npm run build

# ================================
# Frontend Build Stage
# ================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build Nuxt (outputs to .output/)
RUN npm run build

# ================================
# Backend Production Image
# ================================
FROM node:20-alpine AS backend

WORKDIR /app

# Copy built backend
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./

# Data directory will be mounted as volume
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/main.js"]

# ================================
# Frontend Production Image
# ================================
FROM node:20-alpine AS frontend

WORKDIR /app

# Copy built frontend
COPY --from=frontend-build /app/frontend/.output ./.output

ENV NODE_ENV=production
ENV PORT=3000
ENV NUXT_HOST=0.0.0.0

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
