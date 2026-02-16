import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import handler from "serve-handler";
import pkg from "../package.json" assert { type: "json" };

const helpText = `cabinet - simple static file server

Usage:
  cabinet [dir] [--listen|-l <port|host:port>] [--config <path>] [--help] [--version]

Options:
  --listen, -l    Port or host:port (default 0.0.0.0:3000)
  --config        Path to serve-handler JSON config
  --help          Show help
  --version       Show version
`;

const fileExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJsonFile = async (filePath: string) => {
  const raw = await readFile(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Config must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${filePath}: ${message}`);
  }
};

const parseListen = (value: string) => {
  if (!value) {
    throw new Error("--listen requires a value");
  }

  const parts = value.includes(":") ? value.split(":") : ["", value];
  if (parts.length !== 2) {
    throw new Error(`Invalid listen value: ${value}`);
  }

  const [hostPart, portPart] = parts;
  const host = hostPart || "0.0.0.0";
  const port = Number.parseInt(portPart, 10);

  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port: ${portPart}`);
  }

  return { host, port };
};

const parseArgs = (argv: string[]) => {
  const result: {
    dir?: string;
    listen?: { host: string; port: number };
    configPath?: string;
    help: boolean;
    version: boolean;
  } = { help: false, version: false };

  const takeValue = (index: number) => {
    if (index + 1 >= argv.length) {
      throw new Error(`Missing value for ${argv[index]}`);
    }
    return { value: argv[index + 1], nextIndex: index + 1 };
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      const rest = argv.slice(i + 1);
      if (rest.length) {
        if (result.dir) {
          throw new Error("Only one directory can be provided");
        }
        result.dir = rest.join(" ");
      }
      break;
    }

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      result.version = true;
      continue;
    }

    if (arg === "--listen" || arg === "-l") {
      const { value, nextIndex } = takeValue(i);
      result.listen = parseListen(value);
      i = nextIndex;
      continue;
    }

    if (arg.startsWith("--listen=")) {
      result.listen = parseListen(arg.slice("--listen=".length));
      continue;
    }

    if (arg.startsWith("-l") && arg !== "-l") {
      result.listen = parseListen(arg.slice(2));
      continue;
    }

    if (arg === "--config") {
      const { value, nextIndex } = takeValue(i);
      result.configPath = value;
      i = nextIndex;
      continue;
    }

    if (arg.startsWith("--config=")) {
      result.configPath = arg.slice("--config=".length);
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (result.dir) {
      throw new Error("Only one directory can be provided");
    }

    result.dir = arg;
  }

  return result;
};

const resolveConfigPath = (rootDir: string, configPath?: string) => {
  if (configPath) {
    return isAbsolute(configPath) ? configPath : resolve(process.cwd(), configPath);
  }

  return join(rootDir, "serve.json");
};

const loadConfig = async (rootDir: string, configPath?: string) => {
  const resolvedPath = resolveConfigPath(rootDir, configPath);
  const isOptional = !configPath;

  if (!(await fileExists(resolvedPath))) {
    if (isOptional) {
      return {} as Record<string, unknown>;
    }
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  return readJsonFile(resolvedPath);
};

const resolvePublicDir = (rootDir: string, config: Record<string, unknown>) => {
  if (!Object.prototype.hasOwnProperty.call(config, "public")) {
    return rootDir;
  }

  const publicValue = config.public;
  if (typeof publicValue !== "string") {
    throw new Error('"public" must be a string path');
  }

  return isAbsolute(publicValue) ? publicValue : resolve(rootDir, publicValue);
};

const start = async () => {
  const { dir, listen, configPath, help, version } = parseArgs(process.argv.slice(2));

  if (help) {
    console.log(helpText);
    return;
  }

  if (version) {
    console.log(pkg.version ?? "0.0.0");
    return;
  }

  const rootDir = resolve(process.cwd(), dir ?? ".");
  const config = await loadConfig(rootDir, configPath);
  const publicDir = resolvePublicDir(rootDir, config);
  const options = { ...config, public: publicDir };
  const { host, port } = listen ?? { host: "0.0.0.0", port: 3000 };

  const server = createServer((req, res) => {
    handler(req, res, options).catch((error) => {
      res.statusCode = 500;
      res.end("Internal Server Error");
      console.error(error);
    });
  });

  server.listen(port, host, () => {
    console.log(`Serving ${publicDir}`);
    if (publicDir !== rootDir) {
      console.log(`Root directory ${rootDir}`);
    }
    console.log(`Listening on http://${host}:${port}`);
  });
};

start().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
