# Gunakan image Node 20 versi PENUH (bukan alpine, bukan slim)
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Gunakan image Node 20 versi PENUH untuk jalankan aplikasi
FROM node:20
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN npm install prisma --save-dev

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]