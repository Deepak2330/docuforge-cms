FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage
FROM base AS development
COPY package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npm install && npm run dev"]

# Builder stage
FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
