// `pnpm dev` for the API: one compiler in watch mode, and both entry points (the REST API and the
// live gateway) restarted by Node whenever their compiled files change. Two `nest start --watch`
// would fight over dist/.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { clearInterval, setInterval, setTimeout } from 'node:timers';

const children = [];
const run = (cmd, args) => {
  const child = spawn(cmd, args, { stdio: 'inherit' });
  children.push(child);
  return child;
};
const stop = () => {
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

run('nest', ['build', '--watch', '--preserveWatchOutput']);

// Start the servers once the first build has written them
const started = setInterval(() => {
  if (!existsSync('dist/main.js') || !existsSync('dist/gateway.js')) return;
  clearInterval(started);
  setTimeout(() => {
    for (const entry of ['dist/main.js', 'dist/gateway.js']) run('node', ['--watch', '--enable-source-maps', entry]);
  }, 1500);
}, 500);
