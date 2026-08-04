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

# ---------- Production dependencies (chỉ prod) ----------
FROM base AS prod-deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ---------- Runner ----------
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
# một số service đọc file bằng path.resolve('src/...') (không phải dist/src) nên cần giữ nguyên cấu trúc thư mục src ở runtime
COPY --from=build --chown=nestjs:nodejs /app/src/shared/email-templates ./src/shared/email-templates
COPY --from=build --chown=nestjs:nodejs /app/src/i18n ./src/i18n
# MediaModule tự mkdir upload lúc khởi động; I18nModule tự ghi i18n.generated.ts mỗi lần start
# → cả hai cần tồn tại sẵn với quyền ghi cho user non-root
RUN mkdir -p /app/upload /app/src/generated && chown -R nestjs:nodejs /app/upload /app/src/generated

USER nestjs

EXPOSE 3001

CMD ["node", "dist/src/main"]
