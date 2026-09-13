const fs = require('fs');
const path = require('path');

require('./write-config');

const root = path.join(__dirname, '..');
const sourceDir = path.join(root, 'public');
const outputDir = path.join(root, '.vercel', 'output');
const staticDir = path.join(outputDir, 'static');

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      return;
    }
    fs.copyFileSync(sourcePath, targetPath);
  });
}

fs.rmSync(staticDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'config.json'), `${JSON.stringify({ version: 3 }, null, 2)}\n`);
copyDir(sourceDir, staticDir);

// Zero-config API functions in api/*.js -> Build Output v3 function bundles
const apiDir = path.join(root, 'api');
if (fs.existsSync(apiDir)) {
  fs.readdirSync(apiDir).filter((f) => f.endsWith('.js')).forEach((file) => {
    const name = file.replace(/\.js$/, '');
    const funcDir = path.join(outputDir, 'functions', `${name}.func`);
    fs.rmSync(funcDir, { recursive: true, force: true });
    fs.mkdirSync(funcDir, { recursive: true });
    fs.copyFileSync(path.join(apiDir, file), path.join(funcDir, 'index.mjs'));
    fs.writeFileSync(path.join(funcDir, 'package.json'), JSON.stringify({ type: 'module', main: 'index.mjs' }));
    fs.writeFileSync(path.join(funcDir, '.vc-config.json'), JSON.stringify({
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      exportName: 'default',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      supportsResponseStreaming: true,
    }));
  });
}

console.log('Vercel static output generated');
