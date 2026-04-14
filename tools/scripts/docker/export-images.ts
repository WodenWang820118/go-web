import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '..', '..', '..');
const outputDirectory = join(workspaceRoot, 'dist', 'docker');

const images = [
  {
    tag: 'gx-go-web:latest',
    filename: 'gx-go-web.tar',
  },
  {
    tag: 'gx-go-server:latest',
    filename: 'gx-go-server.tar',
  },
];

fs.mkdirSync(outputDirectory, { recursive: true });

for (const image of images) {
  runDockerCommand(['image', 'inspect', image.tag]);

  const destination = join(outputDirectory, image.filename);

  if (fs.existsSync(destination)) {
    fs.rmSync(destination);
  }

  runDockerCommand(['save', '-o', destination, image.tag]);
  console.log(`Exported ${image.tag} -> ${destination}`);
}

function runDockerCommand(args: string[]): void {
  const result = spawnSync('docker', args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
