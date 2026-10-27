import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const file = (name) => readFile(new URL(`../dist/${name}`, import.meta.url), 'utf8');
const [html, css, xp, calculator, app, icon] = await Promise.all(['index.html', 'styles.css', 'xp-data.js', 'calculator.js', 'app.js', 'icon.svg'].map(file));
const script = [xp, calculator.replace(/^import .*;\r?\n/m, ''), app.replace(/^import .*;\r?\n/m, '')].join('\n');
const check = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: script, encoding: 'utf8' });
if (check.status !== 0) throw new Error(check.stderr || 'Invalid standalone script');
const standalone = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="app.js"></script>', `<script type="module">\n${script}\n</script>`)
  .replace('href="icon.svg"', `href="data:image/svg+xml,${encodeURIComponent(icon)}"`);
const output = new URL('../standalone/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('volkorne.html', output), standalone);
console.log(`Calculateur autonome : ${new URL('volkorne.html', output).pathname}`);
