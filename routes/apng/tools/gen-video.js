#!/usr/bin/env node
/**
 * pet-forge APNG tools - video generation script
 *
 * Usage:
 *   node gen-video.js <animation-key> --image reference/main-ref.png
 *   node gen-video.js <animation-key> --image selected.png --last-frame selected.png --api doubao
 *
 * Generated videos are saved to output/<animation-key>/.
 * Use chroma_key.py to convert downloaded videos into APNG files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doubaoGenerateVideo, downloadBuffer } from './lib/api.js';
import { buildChromaInvocation } from './lib/chroma-command.js';
import { ANIMATIONS, buildPrompt, DEFAULT_KEY_COLOR, normalizeKeyColor } from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('用法: node gen-video.js <动画名> --image <首帧图片路径> [选项]');
  console.log('\n选项:');
  console.log('  --image <路径>      首帧参考图片（必填，除非用 --no-first-frame）');
  console.log('  --last-frame <路径> 尾帧参考图片（循环/回归型通常同 --image）');
  console.log('  --api doubao        选择 API（当前公开版仅保留 doubao）');
  console.log('  --model <模型名>    覆盖默认视频模型');
  console.log(`  --key-color <#RRGGBB> 视频背景和抠图颜色（默认 ${DEFAULT_KEY_COLOR}）`);
  console.log('  --ref-mode          图片作为角色参考，不锚定首帧');
  console.log('  --no-first-frame    不设首帧，只设尾帧');
  console.log('  --no-chroma         跳过 chroma_key 后处理');
  process.exit(0);
}

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}

function requireOptionValue(flag) {
  const idx = args.indexOf(flag);
  if (idx >= 0 && (idx + 1 >= args.length || args[idx + 1].startsWith('--'))) {
    console.error(`❌ ${flag} 缺少参数值`);
    process.exit(1);
  }
}

function imageDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

const animKey = args[0];
const imagePath = getArg('--image', null);
const apiChoice = getArg('--api', 'doubao');
const modelOpt = getArg('--model', null);
const keyColorOpt = getArg('--key-color', null);
const lastFramePath = getArg('--last-frame', null);
const refMode = args.includes('--ref-mode');
const noFirstFrame = args.includes('--no-first-frame');
const skipChroma = args.includes('--no-chroma');

requireOptionValue('--key-color');

let keyColor;
try {
  keyColor = normalizeKeyColor(keyColorOpt || DEFAULT_KEY_COLOR);
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

if (apiChoice !== 'doubao') {
  throw new Error('当前公开版仅保留 --api doubao');
}

if (!ANIMATIONS[animKey]) {
  console.error(`❌ 未知动画: "${animKey}"`);
  process.exit(1);
}
const anim = ANIMATIONS[animKey];
if (!noFirstFrame && (!imagePath || !fs.existsSync(imagePath))) {
  console.error('❌ 请用 --image 指定首帧图片路径，或用 --no-first-frame 跳过');
  process.exit(1);
}
if (lastFramePath && !fs.existsSync(lastFramePath)) {
  console.error(`❌ 尾帧图片不存在: ${lastFramePath}`);
  process.exit(1);
}
if (noFirstFrame && !lastFramePath) {
  console.error('❌ --no-first-frame 必须同时提供 --last-frame');
  process.exit(1);
}
if (anim.anchor === 'different' && !lastFramePath) {
  console.error('❌ 过渡型动画必须用 --last-frame 指定不同的尾帧');
  process.exit(1);
}
if (
  anim.anchor === 'different' && !refMode && !noFirstFrame &&
  path.resolve(imagePath) === path.resolve(lastFramePath)
) {
  console.error('❌ 过渡型动画的 --image 与 --last-frame 必须使用不同文件');
  process.exit(1);
}
if (refMode && noFirstFrame) {
  console.error('❌ --ref-mode 与 --no-first-frame 不能同时使用');
  process.exit(1);
}

const prompt = buildPrompt(animKey, { keyColor });

// ── Output setup ─────────────────────────────────────────

const outDir = path.join(__dirname, 'output', animKey);

console.log(`\n🎬 生成视频: ${animKey} (${anim.name})`);
console.log(`   首帧图片: ${imagePath || '(none)'}`);
console.log('   API: doubao');
console.log(`   色键: ${keyColor}`);
console.log(`   输出目录: ${outDir}\n`);

// ── Generate video ───────────────────────────────────────

const results = [];

console.log('── Doubao / Volcengine video generation ──\n');
try {
  let dataUri = !noFirstFrame && imagePath ? imageDataUri(imagePath) : null;
  let videoPrompt = prompt;
  const lastSrc = lastFramePath || (!refMode && !noFirstFrame && anim.anchor === 'same' ? imagePath : null);
  const lastFrameUri = lastSrc ? imageDataUri(lastSrc) : null;

  if (noFirstFrame) {
    dataUri = null;
    if (lastSrc) {
      console.log(`  模式: 仅尾帧锚定 → ${lastSrc}`);
    }
  } else if (refMode) {
    videoPrompt = `[图1]是角色参考图。${prompt}`;
    console.log('  模式: 参考图（不锚定首帧）');
    if (lastSrc) console.log(`  尾帧锚定: ${lastSrc}`);
  } else {
    if (lastSrc) {
      console.log(`  首尾帧锚定: ${lastSrc === imagePath ? '首尾帧相同' : lastSrc}`);
    }
  }

  const result = await doubaoGenerateVideo(videoPrompt, dataUri, {
    model: modelOpt || undefined,
    lastFrameUrl: lastFrameUri,
    asReference: refMode,
  });

  let videoUrl = null;
  if (result.video_url) {
    videoUrl = result.video_url;
  } else if (result.content && result.content.video_url) {
    videoUrl = result.content.video_url;
  } else if (result.content && Array.isArray(result.content)) {
    const videoItem = result.content.find(c => c.type === 'video_url' || c.type === 'video');
    if (videoItem) videoUrl = videoItem.video_url?.url || videoItem.url;
  } else if (result.data && result.data.video_url) {
    videoUrl = result.data.video_url;
  }

  if (videoUrl) {
    const videoPath = path.join(outDir, 'doubao-video.mp4');
    const buf = await downloadBuffer(videoUrl);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(videoPath, buf);
    console.log(`  ✓ 视频已下载: ${videoPath}`);
    results.push(videoPath);
  } else {
    const jsonPath = path.join(outDir, 'doubao-video-raw.json');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`  ⚠ 未找到视频 URL，已保存原始响应: ${jsonPath}`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`  ❌ 视频生成失败: ${err.message}`);
  process.exitCode = 1;
}

// ── Chroma-key post-processing ───────────────────────────

if (!skipChroma && results.length > 0) {
  console.log('\n── chroma_key 后处理 ──\n');
  const chromaScript = path.join(__dirname, 'chroma_key.py');

  if (!fs.existsSync(chromaScript)) {
    console.log('  ❌ chroma_key.py 未找到，无法完成后处理');
    console.log('  手动运行: python chroma_key.py <视频路径> <输出.apng>');
    process.exitCode = 1;
  } else {
    const { spawnSync } = await import('child_process');
    for (const videoPath of results) {
      const apngPath = videoPath.replace('.mp4', '.apng');
      try {
        console.log(`  处理: ${videoPath}`);
        const invocation = buildChromaInvocation({
          scriptPath: chromaScript,
          videoPath,
          apngPath,
          loop: anim.loop,
          keyColor,
        });
        const processed = spawnSync(invocation.command, invocation.args, {
          stdio: 'inherit',
          cwd: __dirname,
        });
        if (processed.error || processed.status !== 0) {
          throw processed.error || new Error(`退出码 ${processed.status}`);
        }
        console.log(`  ✓ APNG: ${apngPath}`);
      } catch (err) {
        console.error(`  ❌ chroma_key 失败: ${err.message}`);
        console.log(`  手动运行: python "${chromaScript}" "${videoPath}" "${apngPath}"`);
        process.exitCode = 1;
      }
    }
  }
}

// ── Summary ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
if (results.length === 0) process.exitCode = 1;
console.log(`${process.exitCode ? '❌ 未完成' : '✅ 完成'}！共生成 ${results.length} 个视频`);
results.forEach(f => console.log(`   ${f}`));
console.log('');
