FROM oven/bun:1.3.2-alpine AS builder

WORKDIR /app

COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile

COPY src /app/src
COPY tsconfig.json /app/tsconfig.json

RUN bun build /app/src/index.ts --outfile /app/dist/cabinet --compile

FROM alpine:3.20

WORKDIR /data

RUN apk add --no-cache libstdc++ libgcc

COPY --from=builder /app/dist/cabinet /usr/local/bin/cabinet

EXPOSE 3000

CMD ["cabinet", "--listen", "0.0.0.0:3000"]
