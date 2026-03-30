const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const outputDirectory = path.join(workspaceRoot, 'dist', 'docker');

const images = [
  {
    tag: 'gx-go-web:local',
    filename: 'gx-go-web.tar',
  },
  {
    tag: 'gx-go-server:local',
    filename: 'gx-go-server.tar',
  },
];

fs.mkdirSync(outputDirectory, { recursive: true });

for (const image of images) {
  runDockerCommand(['image', 'inspect', image.tag]);

  const destination = path.join(outputDirectory, image.filename);

  if (fs.existsSync(destination)) {
    fs.rmSync(destination);
  }

  runDockerCommand(['save', '-o', destination, image.tag]);
  console.log(`Exported ${image.tag} -> ${destination}`);
}

function runDockerCommand(args) {
  const result = spawnSync('docker', args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
