import { spawn } from "node:child_process";
import process from "node:process";

const allowedCommands = new Set(["dev", "build", "start"]);
const command = process.argv[2];

if (!allowedCommands.has(command)) {
  console.error("Usage: node build/run-vinext.mjs <dev|build|start>");
  process.exit(2);
}

const executable =
  process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : "./node_modules/.bin/vinext";

const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "node_modules\\.bin\\vinext.cmd", command]
    : [command];

const child = spawn(executable, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
  },
  stdio: "inherit",
  windowsHide: false,
});

child.on("error", (error) => {
  console.error(`Unable to start vinext: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`vinext stopped after receiving ${signal}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
