# Stage 1: Dependency Installation & Compilation
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src
COPY public/ ./public
RUN npm run build

# Stage 2: Production Execution
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
