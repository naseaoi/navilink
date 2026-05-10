import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const shellCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
const children = [];
let exiting = false;

const terminateChildren = () => {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
};

const run = (label, command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    ...options
  });

  child.on('exit', (code, signal) => {
    if (exiting) return;
    terminateChildren();
    if (signal) {
      console.log(`[dev] ${label} 已停止: ${signal}`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 0;
  });

  child.on('error', (error) => {
    console.error(`[dev] ${label} 启动失败`, error);
    terminateChildren();
    process.exitCode = 1;
  });

  children.push(child);
};

// 本地开发同时拉起 vite 与 API 服务，这样 server.js 才会读取 .env 中的 WebDAV 配置。
run('API', process.execPath, ['server.js']);
run(
  'Vite',
  shellCommand,
  process.platform === 'win32'
    ? ['/d', '/s', '/c', `${npmCommand} run dev:client`]
    : ['-lc', `${npmCommand} run dev:client`]
);

process.on('SIGINT', terminateChildren);
process.on('SIGTERM', terminateChildren);
