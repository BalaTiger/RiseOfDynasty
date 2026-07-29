import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(npmCommand, ["run", "build:h5:local"], {
  env: { ...process.env, DESKTOP_BUILD: "true", NEXT_PUBLIC_BASE_PATH: "" },
});
run(npxCommand, ["electron-builder", "--win", "nsis", "portable", ...process.argv.slice(2)]);
