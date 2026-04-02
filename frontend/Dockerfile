FROM oven/bun:1.1-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
