// Dev server launcher - directly spawns and waits
import { spawn } from "child_process";

const child = spawn("npx", ["next", "dev", "-p", "3000"], {
  cwd: "/home/z/my-project",
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env },
});

child.stdout.on("data", (data: Buffer) => {
  process.stdout.write(data);
});

child.stderr.on("data", (data: Buffer) => {
  process.stderr.write(data);
});

child.on("exit", (code) => {
  console.log(`Next.js exited with code ${code}`);
  process.exit(code || 0);
});

// Keep process alive
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
