import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  ANIMATIONS,
  buildFullPrompt,
  buildGenVideoCommand,
} from '../routes/apng/prompts/template.js';
import { buildChromaInvocation } from '../routes/apng/tools/lib/chroma-command.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tools = join(root, 'routes', 'apng', 'tools');

const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
assert.match(skill, /^---\r?\nname: pet-forge\r?\ndescription: .+\r?\n---\r?\n/);

assert.equal(Object.keys(ANIMATIONS).length, 25);
const refs = {};
for (const anim of Object.values(ANIMATIONS)) {
  assert.equal(typeof anim.loop, 'boolean');
  assert.ok(anim.anchor === 'same' || anim.anchor === 'different');
  if (anim.loop) assert.equal(anim.anchor, 'same');
  refs[anim.refKey] = `reference/${anim.refKey}.png`;
  if (anim.lastKey) refs[anim.lastKey] = `reference/${anim.lastKey}.png`;
}

for (const [key, anim] of Object.entries(ANIMATIONS)) {
  const command = buildGenVideoCommand(key, refs);
  const expectedLastFrame = anim.anchor === 'same' ? refs[anim.refKey] : refs[anim.lastKey];
  assert.ok(command.includes(`--last-frame ${expectedLastFrame}`), `${key} has the wrong last-frame anchor`);
  const chromaInvocation = buildChromaInvocation({
    platform: 'darwin',
    scriptPath: 'chroma_key.py',
    videoPath: `${key}.mp4`,
    apngPath: `${key}.apng`,
    loop: anim.loop,
  });
  assert.deepEqual(chromaInvocation, {
    command: 'python3',
    args: ['chroma_key.py', `${key}.mp4`, `${key}.apng`, '--plays', anim.loop ? '0' : '1'],
  });
}

assert.deepEqual(
  buildChromaInvocation({
    platform: 'win32',
    scriptPath: 'chroma_key.py',
    videoPath: 'input.mp4',
    apngPath: 'output.apng',
    loop: false,
  }),
  {
    command: 'py',
    args: ['-3', 'chroma_key.py', 'input.mp4', 'output.apng', '--plays', '1'],
  },
);

assert.deepEqual(
  buildChromaInvocation({
    platform: 'darwin',
    scriptPath: 'chroma_key.py',
    videoPath: 'input.mp4',
    apngPath: 'output.apng',
    loop: true,
    keyColor: '#FF00FF',
  }),
  {
    command: 'python3',
    args: [
      'chroma_key.py', 'input.mp4', 'output.apng', '--plays', '0',
      '--key-color', '#FF00FF',
    ],
  },
);

const magentaPrompt = buildFullPrompt('thinking', { keyColor: '#ff00ff' });
assert.ok(magentaPrompt.includes('#FF00FF'));
assert.ok(!magentaPrompt.includes('#00B140'));
assert.doesNotMatch(magentaPrompt, /solid green/i);
assert.match(
  buildGenVideoCommand('thinking', refs, { keyColor: '#ff00ff' }),
  /--key-color "#FF00FF"/,
);

const cleanEnv = { ...process.env, DOUBAO_API_KEY: '', DOUBAO_BASE_URL: '' };
function expectExit(args, expected, outputPattern) {
  const result = spawnSync(process.execPath, args, { cwd: tools, env: cleanEnv, encoding: 'utf8' });
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  if (outputPattern) assert.match(`${result.stdout}\n${result.stderr}`, outputPattern);
}

const sampleImage = join(root, 'examples', 'svg-gpt-pear', 'source.png');
expectExit(['gen-video.js'], 0);
expectExit(['gen-images.js', '--list'], 0);
expectExit(['test-api.js'], 1);
expectExit(['gen-video.js', 'idle-dozing', '--no-first-frame', '--no-chroma'], 1, /必须同时提供 --last-frame/);
expectExit(
  ['gen-video.js', 'idle-dozing', '--image', sampleImage, '--key-color', 'FF00FF', '--no-chroma'],
  1,
  /#RRGGBB/,
);
expectExit(
  ['gen-video.js', 'idle-dozing', '--image', sampleImage, '--key-color', '--no-chroma'],
  1,
  /缺少参数值/,
);
expectExit(['gen-video.js', 'idle-dozing', '--image', sampleImage, '--no-chroma'], 1, /DOUBAO_API_KEY 未设置/);
expectExit(
  ['gen-video.js', 'collapse-sleep', '--image', sampleImage, '--last-frame', sampleImage, '--no-chroma'],
  1,
  /必须使用不同文件/,
);
expectExit(['gen-images.js', 'idle-dozing', '--count', '1'], 1);

const temp = mkdtempSync(join(tmpdir(), 'pet-forge-'));
try {
  const config = join(temp, 'batch.json');
  writeFileSync(config, JSON.stringify({ delayMs: 0, jobs: [{ key: 'idle-dozing', image: sampleImage, noChroma: true }] }));
  expectExit(['batch-gen.js', '--config', config], 1);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('Repository validation passed.');
