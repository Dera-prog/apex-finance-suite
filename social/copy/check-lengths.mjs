import fs from 'node:fs';
import path from 'node:path';

const file = path.join(import.meta.dirname, 'x.md');
const src = fs.readFileSync(file, 'utf8');
const blocks = [...src.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1].trimEnd());

const LIMIT = 280;
let bad = 0;

blocks.forEach((body, i) => {
  const len = [...body].length;
  const ok = len <= LIMIT;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'OVER'} ${String(len).padStart(3)} / ${LIMIT}  post ${i + 1}`);
  if (!ok) console.log(body);
});

console.log(bad ? `\n${bad} post(s) over the limit` : `\nAll ${blocks.length} posts fit in ${LIMIT} characters`);
process.exit(bad ? 1 : 0);
