# 🗄️ cabinet

A simple static file server built with Bun and `serve-handler`.

## Usage

```sh
cabinet [dir] [--listen|-l <port|host:port>] [--config <path>] [--help] [--version]
```

## Examples

```sh
# Serve the current directory on 0.0.0.0:3000
cabinet

# Serve ./public on port 8080
cabinet ./public --listen 8080

# Serve ./site on 127.0.0.1:4000
cabinet ./site --listen 127.0.0.1:4000

# Use an explicit config file
cabinet ./site --config ./serve.json
```

## Configuration

- If `--config` is provided, that JSON file is used.
- Otherwise, `serve.json` is auto-loaded from the served directory when present.
- The `public` option is resolved relative to the served directory unless it is absolute.

Supported `serve-handler` options include:

- `public`
- `cleanUrls`
- `rewrites`
- `redirects`
- `headers`
- `directoryListing`
- `unlisted`
- `trailingSlash`
- `renderSingle`
- `symlinks`
- `etag`

## Development

```sh
bun run dev
```

## Build

```sh
bun run build:darwin-x64
bun run build:linux-x64
bun run build:all
```
