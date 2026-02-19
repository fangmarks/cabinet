FROM oven/bun:1.3.2-alpine AS builder

WORKDIR /app

COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile

COPY src /app/src
COPY tsconfig.json /app/tsconfig.json

ARG TARGETARCH
RUN case "$TARGETARCH" in \
      "amd64") BUN_TARGET="bun-linux-x64-musl" ;; \
      "arm64") BUN_TARGET="bun-linux-arm64-musl" ;; \
      *) echo "Unsupported TARGETARCH: $TARGETARCH" && exit 1 ;; \
    esac && \
    bun build --compile --target="$BUN_TARGET" /app/src/index.ts --outfile /app/dist/cabinet

FROM alpine:3.20

WORKDIR /data

RUN apk add --no-cache libstdc++ libgcc git

COPY --from=builder /app/dist/cabinet /usr/local/bin/cabinet

EXPOSE 3000

CMD ["cabinet", "--listen", "0.0.0.0:3000"]
