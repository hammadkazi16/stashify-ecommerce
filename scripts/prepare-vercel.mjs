import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('dist');
const destination = path.resolve('public');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  throw new Error('Frontend build not found. Run npm run build first.');
}

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });

console.log('Frontend copied to public successfully.');
