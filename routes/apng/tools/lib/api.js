/**
 * pet-forge APNG tools - API client
 *
 * Provides a Doubao / Volcengine example API for image and video generation.
 * All async video tasks are polled until completion.
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

// ── API config ───────────────────────────────────────────

const DOUBAO_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_BASE = process.env.DOUBAO_BASE_URL;
const DOUBAO_IMAGE_MODEL = process.env.DOUBAO_IMAGE_MODEL || 'doubao-seedream-5-0-260128';
const DOUBAO_VIDEO_MODEL = process.env.DOUBAO_VIDEO_MODEL || 'doubao-seedance-1-5-pro-251215';

// ── Utility helpers ──────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function checkKey(name, key) {
  if (!key) throw new Error(`${name} 未设置，请检查 .env 文件`);
}

/**
 * Download URL content as a Buffer.
 */
async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Save a base64 string or image URL to a local file.
 */
async function saveImage(data, outputPath) {
  if (data.startsWith('http')) {
    const buf = await downloadBuffer(data);
    fs.writeFileSync(outputPath, buf);
  } else {
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(outputPath, buf);
  }
  console.log(`  ✓ 保存: ${outputPath}`);
}

// ── Doubao / Volcengine API ──────────────────────────────

/**
 * Generate an image.
 *
 * @param {string} prompt - Image prompt.
 * @param {object} [opts]
 * @param {string} [opts.model] - Model name.
 * @param {number} [opts.n] - Number of images.
 * @param {string} [opts.size] - Output size.
 * @returns {Promise<object>} OpenAI-style response { data: [{ url, b64_json }] }
 */
export async function doubaoGenerateImage(prompt, opts = {}) {
  checkKey('DOUBAO_API_KEY', DOUBAO_KEY);

  const body = {
    model: opts.model || DOUBAO_IMAGE_MODEL,
    prompt,
    n: opts.n || 1,
    size: opts.size || '1920x1920',
  };

  const res = await fetch(`${DOUBAO_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`豆包生图失败: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Generate a video.
 *
 * @param {string} prompt - Video prompt.
 * @param {string} [refImageUrl] - First-frame image URL or base64 data URI.
 * @param {object} [opts]
 * @param {string} [opts.model] - Model name.
 * @param {string} [opts.lastFrameUrl] - Last-frame image URL or base64 data URI.
 * @param {boolean} [opts.asReference] - Use image as a reference instead of first-frame anchor.
 * @param {string} [opts.resolution] - Output tier such as 720p or 1080p.
 * @param {string} [opts.ratio] - Output ratio such as 1:1, 3:4, or adaptive.
 * @param {boolean} [opts.cameraFixed] - Whether to keep the camera fixed.
 * @returns {Promise<object>} Completed task result.
 */
export function buildDoubaoVideoRequest(prompt, refImageUrl, opts = {}) {
  const content = [{ type: 'text', text: prompt }];

  if (refImageUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: refImageUrl },
      role: opts.asReference ? 'reference_image' : 'first_frame',
    });
  }

  if (opts.lastFrameUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: opts.lastFrameUrl },
      role: 'last_frame',
    });
  }

  const body = {
    model: opts.model || DOUBAO_VIDEO_MODEL,
    content,
    // 火山方舟 Seedance 官方去水印参数(body 独立字段,非 prompt --watermark)。
    // 默认带水印 → 这里默认 false,生成即无水印;传 { watermark: true } 可恢复。
    watermark: opts.watermark === true,
  };

  if (opts.resolution) body.resolution = opts.resolution;
  if (opts.ratio) body.ratio = opts.ratio;
  if (typeof opts.cameraFixed === 'boolean') body.camera_fixed = opts.cameraFixed;

  return body;
}

export async function doubaoGenerateVideo(prompt, refImageUrl, opts = {}) {
  checkKey('DOUBAO_API_KEY', DOUBAO_KEY);

  const body = buildDoubaoVideoRequest(prompt, refImageUrl, opts);

  const res = await fetch(`${DOUBAO_BASE}/contents/generations/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`豆包视频生成失败: ${res.status} — ${text}`);
  }

  const task = await res.json();
  const taskId = task.id || task.task_id;
  console.log(`  豆包视频任务已创建: id=${taskId}, 轮询中...`);
  return pollDoubaoTask(taskId);
}

/**
 * Poll an async video generation task.
 */
async function pollDoubaoTask(taskId, maxAttempts = 120, interval = 5000) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);

    const res = await fetch(`${DOUBAO_BASE}/contents/generations/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${DOUBAO_KEY}` },
    });

    if (!res.ok) {
      console.log(`  轮询 #${i + 1}: HTTP ${res.status}, 继续等待...`);
      continue;
    }

    const result = await res.json();
    const status = result.status || '';

    if (status === 'succeeded' || status === 'completed') {
      console.log('  ✓ 任务完成!');
      return result;
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`任务失败: ${JSON.stringify(result)}`);
    }

    console.log(`  轮询 #${i + 1}: ${status}`);
  }
  throw new Error(`任务超时（等了 ${maxAttempts * interval / 1000}s）`);
}

export { downloadBuffer, saveImage, sleep };
