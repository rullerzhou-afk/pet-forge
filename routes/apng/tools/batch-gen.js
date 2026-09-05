#!/usr/bin/env node
/**
 * Generic APNG video batch runner.
 *
 * Usage:
 *   node batch-gen.js --config batch.example.json
 *
 * Config shape:
 *   {
 *     "delayMs": 60000,
 *     "jobs": [
 *       {
 *         "key": "idle-yawn",
 *         "image": "reference/main-ref.png",
 *         "lastFrame": "reference/main-ref.png",
 *         "api": "doubao",
 *         "resolution": "1080p",
 *         "ratio": "1:1",
 *         "cameraFixed": true
 *       }
 *     ]
 *   }
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEN_VIDEO = path.join(__dirname, 'gen-video.js');

config({ path: path.join(__dirname, '.env') });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function usage(exitCode = 0) {
  console.log('Usage: node batch-gen.js --config <batch.json> [--only <animation-key>]');
  console.log('');
  console.log('Each job accepts: key, image, lastFrame, api, model, resolution, ratio, cameraFixed, keyColor, refMode, noFirstFrame, noChroma, extraArgs.');
  console.log('The public example API value is currently doubao.');
  process.exit(exitCode);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--config') result.config = argv[++i];
    else if (arg === '--only') result.only = argv[++i];
    else {
      console.error(`Unknown option: ${arg}`);
      usage(1);
    }
  }
  return result;
}

function resolveMaybe(filePath, baseDir) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
}

function loadConfig(configPath) {
  const fullPath = path.resolve(configPath);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const jobs = Array.isArray(raw) ? raw : raw.jobs;
  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('batch config must be an array or an object with a non-empty jobs array');
  }
  return {
    path: fullPath,
    dir: path.dirname(fullPath),
    delayMs: Array.isArray(raw) ? 60000 : Number(raw.delayMs ?? 60000),
    stopOnError: Array.isArray(raw) ? false : Boolean(raw.stopOnError),
    jobs,
  };
}

function buildCommand(job, index, baseDir) {
  const key = job.key || job.animation || job.name;
  if (!key) throw new Error(`job #${index + 1} is missing key`);

  const cmdArgs = [GEN_VIDEO, key];
  const image = resolveMaybe(job.image, baseDir);
  const lastFrame = resolveMaybe(job.lastFrame, baseDir);

  if (image) cmdArgs.push('--image', image);
  if (lastFrame) cmdArgs.push('--last-frame', lastFrame);
  if (job.api) cmdArgs.push('--api', job.api);
  if (job.model) cmdArgs.push('--model', job.model);
  if (job.resolution) cmdArgs.push('--resolution', String(job.resolution));
  if (job.ratio) cmdArgs.push('--ratio', String(job.ratio));
  if (job.cameraFixed) cmdArgs.push('--camera-fixed');
  if (job.keyColor) cmdArgs.push('--key-color', job.keyColor);
  if (job.refMode) cmdArgs.push('--ref-mode');
  if (job.noFirstFrame) cmdArgs.push('--no-first-frame');
  if (job.noChroma || job.chroma === false) cmdArgs.push('--no-chroma');
  if (Array.isArray(job.extraArgs)) cmdArgs.push(...job.extraArgs.map(String));

  return { key, cmdArgs };
}

const args = parseArgs(process.argv.slice(2));
if (!args.config) usage(1);

const batch = loadConfig(args.config);
const jobs = args.only
  ? batch.jobs.filter(job => (job.key || job.animation || job.name) === args.only)
  : batch.jobs;

if (jobs.length === 0) {
  console.error(`No job matched --only ${args.only}`);
  process.exit(1);
}

console.log(`Batch config: ${batch.path}`);
console.log(`Jobs: ${jobs.length}`);

const results = [];
for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  const { key, cmdArgs } = buildCommand(job, i, batch.dir);

  if (i > 0 && batch.delayMs > 0) {
    console.log(`\nWaiting ${Math.round(batch.delayMs / 1000)}s before next job...\n`);
    await sleep(batch.delayMs);
  }

  console.log(`\n[${i + 1}/${jobs.length}] ${key}`);
  const result = spawnSync(process.execPath, cmdArgs, {
    cwd: __dirname,
    stdio: 'inherit',
  });

  const ok = result.status === 0;
  results.push({ key, ok });
  if (!ok && batch.stopOnError) {
    break;
  }
}

const okCount = results.filter(result => result.ok).length;
console.log(`\nBatch done: ${okCount}/${results.length} succeeded`);
for (const result of results) {
  console.log(`  ${result.ok ? 'OK  ' : 'FAIL'} ${result.key}`);
}

process.exit(okCount === results.length ? 0 : 1);
