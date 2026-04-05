FROM node:20-alpine AS builder
WORKDIR /app

# Copy definisi dependencies
COPY package*.json ./

# GANTI KE NPM INSTALL: Abaikan package-lock.json dan langsung install
RUN npm install

# Copy sisa kode
COPY . .

# Generate Prisma Client sebelum build
RUN npx prisma generate

# Compile TypeScript ke JS
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Copy hasil build dari tahap sebelumnya
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Install Prisma CLI untuk keperluan migrasi saat startup
RUN npm install prisma --save-dev

EXPOSE 3001

# Jalankan migrasi database lalu start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]