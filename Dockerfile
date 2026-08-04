# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

# ---------- Base ----------
FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
# openssl cần cho Prisma; python3/make/g++ cần để build native deps (bcrypt, sharp nếu có)
RUN apk add --no-cache openssl python3 make g++
WORKDIR /app

# ---------- Dependencies (đầy đủ, kể cả dev) ----------
FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ---------- Runner ----------
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Dùng node_modules đầy đủ (kể cả devDependencies) từ stage deps thay vì prod-deps,
# vì lúc khởi động cần chạy prisma CLI + tsx (migrate deploy / create-permissions).
# pnpm dùng symlink (.pnpm/) nên không thể copy chọn lọc từng package lẻ như node_modules phẳng.
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=nestjs:nodejs /app/initialScript ./initialScript
COPY --from=build --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
# create-permissions.ts chạy qua tsx và import trực tiếp src/app.module (toàn bộ app NestJS)
# nên cần giữ nguyên source TS ở runtime, không chỉ dist/ đã compile
COPY --from=build --chown=nestjs:nodejs /app/src ./src
# MediaModule tự mkdir upload lúc khởi động; I18nModule tự ghi i18n.generated.ts mỗi lần start
# → cả hai cần tồn tại sẵn với quyền ghi cho user non-root
RUN mkdir -p /app/upload /app/src/generated && chown -R nestjs:nodejs /app/upload /app/src/generated

USER nestjs

EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/tsx initialScript/create-permissions.ts && node dist/src/main"]
