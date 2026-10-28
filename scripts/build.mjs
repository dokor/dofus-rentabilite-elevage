import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const file = (name) => readFile(new URL(`../dist/${name}`, import.meta.url), 'utf8');
const [html, css, xp, crushing, calculator, app, icon] = await Promise.all(['index.html', 'styles.css', 'xp-data.js', 'crushing-data.js', 'calculator.js', 'app.js', 'icon.svg'].map(file));
const script = [xp, crushing, calculator.replace(/^import .*;\r?\n/gm, ''), app.replace(/^import .*;\r?\n/gm, '')].join('\n');
const standalone = html
  // Callback replacements preserve JavaScript identifiers such as $$ literally.
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script type="module">\n${script}\n</script>`)
  .replace('href="icon.svg"', () => `href="data:image/svg+xml,${encodeURIComponent(icon)}"`);
// Check what will actually run after insertion into the final HTML.
const embeddedScript = standalone.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('Standalone module missing');
const check = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: embeddedScript, encoding: 'utf8' });
if (check.status !== 0) throw new Error(check.stderr || 'Invalid standalone script');
const output = new URL('../standalone/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('volkorne.html', output), standalone);
console.log(`Calculateur autonome : ${new URL('volkorne.html', output).pathname}`);
