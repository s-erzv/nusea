FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm admin:build

ENV NODE_ENV=production
ENV ADMIN_PORT=8080
EXPOSE 8080
CMD ["pnpm", "admin"]
