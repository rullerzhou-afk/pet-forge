/**
 * pet-forge APNG 路线 —— 通用 Prompt 模板（25 个交付状态）
 * ─────────────────────────────────────────────────────────────
 * 这是模板，不是成品。用户必须改 CHARACTER_PREFIX 适配自己的角色。
 *
 * 状态库包含 25 个 prompt 条目；mini-peek 既可独立生成，也可从其他动画剪辑。
 * 抽掉了角色专属描述，留下通用骨架 + 实战验证过的 loop / 首尾帧关系。
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 首尾帧关系（影响 gen-video.js 命令选项），3 类：
 *
 *   A. 循环 (loop: true)
 *      首 = 尾 (同一张参考图, 通常是主参考)
 *      → <动画名> --image X --last-frame X
 *
 *   B. 一次性·回归型 (loop: false, anchor: 'same')
 *      做完动作回到中性姿势, 首尾帧相同
 *      → <动画名> --image X --last-frame X
 *
 *   C. 一次性·过渡型 (loop: false, anchor: 'different')
 *      状态间过渡, 首尾帧是不同姿态
 *      → <动画名> --image X --last-frame Y  (X != Y)
 *
 * 详细决策树见 routes/apng/conventions/loop-and-anchoring.md
 * ─────────────────────────────────────────────────────────────
 */

// ── 1. 角色外观描述（用户必须改这里） ────────────────────────
//
// 重要：这段描述是所有状态共享的，决定了角色一致性。
// 写得越具体，AI 生成的多状态越像同一只角色。
//
// 应该包含 6 个维度：
// - 物种 / 类别（cat / robot / cloud creature ...）
// - 风格定位（chibi / kawaii / pixel-art / realistic ...）
// - 颜色 / 花纹（cream body with orange patches / metallic gray ...）
// - 主要识别特征（big round eyes with white highlights / small triangle ears ...）
// - 描边 / 渲染风格（thick dark outlines / cell-shaded / NO 3D rendering ...）
// - 背景要求（与角色颜色分离的纯色色键；默认 #00B140）
//
export const CHARACTER_PREFIX = `[在这里写你的角色外观描述。例如：
A cute chibi/kawaii style {物种} character with {描边特征}, {体型特征},
flat color fills, on a plain solid green (#00B140) background. The {物种}
has {主体颜色}, {主要特征 1}, {主要特征 2}, {表情特征}. The art style
is clean vector cartoon — NO pixel art, NO realistic rendering, NO 3D.
Consistent character design throughout, no color changes between frames.]`;

// ── 2. 色键背景强调（一般不用改） ────────────────────────────
export const DEFAULT_KEY_COLOR = '#00B140';
export const BG_SUFFIX = `The background must remain a uniform solid green (${DEFAULT_KEY_COLOR}) throughout the entire video. No shadows, no objects, no gradients on the background.`;

export function normalizeKeyColor(value = DEFAULT_KEY_COLOR) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error('key color must use #RRGGBB format');
  }
  return value.toUpperCase();
}

export function buildBackgroundSuffix(keyColor = DEFAULT_KEY_COLOR) {
  const normalized = normalizeKeyColor(keyColor);
  if (normalized === DEFAULT_KEY_COLOR) return BG_SUFFIX;
  return `The background must remain a uniform solid color (${normalized}) throughout the entire video. No shadows, no objects, no gradients on the background.`;
}

// ── 3. 完整状态库（25 个交付状态，按通用 state-mapping 分类） ────
//
// 字段说明：
//   loop      —— 是否循环 (true / false)
//   anchor    —— 'same' (首=尾) / 'different' (首≠尾, 仅一次性过渡型)
//   duration  —— 参考时长 (秒)
//   refKey    —— 推荐使用哪张参考图（main = 主参考图 / 自定义 key）
//   lastKey   —— 一次性过渡型的尾帧参考图 key
//   prompt    —— 动作描述（不含 CHARACTER_PREFIX 和 BG_SUFFIX，拼接时自动加）
//   notes     —— 质检要点
//
// ▼ 25 个交付状态，按用途分组 ▼
//
export const ANIMATIONS = {

  // ─── core states (核心循环, 桌宠主体感来自这一组) ─────────
  // 这一组都是 A 类: loop=true, 首=尾

  'idle-dozing': {
    name: '待机呼吸',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'main',
    prompt: `The character is in its standard pose, completely still. The ONLY movement is very gentle breathing — body slowly and subtly rises and falls. Does NOT move head, change angle, shift position, or close eyes. Eyes stay open. Extremely minimal movement. Seamless loop animation, very calm. DO NOT inflate or balloon any extending parts. DO NOT rotate or shift the camera angle.`,
    notes: '极简微动循环, 只有呼吸, 不闭眼不转头',
  },

  'idle-living': {
    name: '空闲小动作',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'main',
    prompt: `The character is in standard pose, casually doing a small grooming/idle motion (适配你的角色: 舔爪 / 整理触角 / 擦镜头), then pauses with content expression, then repeats. Relaxed and cozy throughout. Seamless loop — the last frame connects perfectly back to the first frame. Body stays in place.`,
    notes: '小动作循环, 不要太复杂动作免得首尾对不齐',
  },

  'thinking': {
    name: '思考',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'main',
    prompt: `The character is in a thinking pose — head slightly tilted, one hand/paw raised toward chin (or your character's equivalent gesture). A small question mark (?) floats above its head. Tail/extension sways gently. Occasional blink. Seamless loop, contemplative mood.`,
    notes: '问号特效如果生成不好后期手加',
  },

  'working-typing': {
    name: '工作-打字',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'main',
    prompt: `The character is rapidly tapping its hands/paws up and down as if typing on an invisible keyboard. The hands alternate left-right in a fast rhythmic pattern. Focused, slightly intense expression. Tail sways gently. Seamless loop animation — the last frame connects perfectly back to the first frame. Body stays in place, only the typing parts move.`,
    notes: '左右手交替节奏感, 身体不晃太大, 首尾帧无缝',
  },

  'working-building': {
    name: '工作-建造/拧螺丝',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'building',
    prompt: `The character is operating a tool (screwdriver / hammer / your character's tool) on a workpiece. Performs the operation with focused, determined expression, then repositions, then repeats. Tail sways slightly. Seamless loop animation. Body stays in place. NO hands, NO fingers visible (use your character's natural manipulators).`,
    notes: '拿工具+认真表情+循环衔接',
  },

  'working-juggling': {
    name: '工作-玩耍/抛接',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'juggling',
    prompt: `The character holds a small object (yarn ball / orb / your character's prop) with its hands/paws. Plays with it (bats / juggles / spins), maybe falls back briefly, then returns to the EXACT starting pose holding the object. Seamless loop animation — the last frame connects perfectly back to the first frame.`,
    notes: '动作要回到起始抱物体姿态, 才能无缝循环',
  },

  'working-conducting': {
    name: '工作-指挥',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'main',
    prompt: `The character has a proud, smug expression. Its tail/baton/extending part raised high and sways rhythmically left-right-left like a conductor's baton, keeping a steady tempo. Small musical notes float nearby. Head bobs slightly in rhythm. Seamless loop — the last frame connects perfectly back to the first frame. Body stays in place, only the extending part sways.`,
    notes: '尾巴/触角左右摆作指挥棒, 傲娇表情',
  },

  'working-sweeping': {
    name: '工作-擦/扫',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'sweeping',
    prompt: `The character is using one hand/paw to wipe a surface (table / floor / cloth), moving left and right in a steady wiping motion. Cheerful, diligent expression. Tail sways gently. Seamless loop — the last frame connects perfectly back to the first frame. The character stays in place, only the wiping part moves.`,
    notes: '左右擦动+开心表情+循环',
  },

  'working-carrying': {
    name: '工作-搬运',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'carrying',
    prompt: `The character is carrying a small object (fish / box / your character's item) walking proudly. Walks left a few steps, turns around, walks right a few steps, returns to starting position. Happy, proud expression with squinted eyes throughout. Tail raised high, sways as it walks. Seamless loop — the last frame connects perfectly back to the first frame.`,
    notes: '叼/抱物左右走+得意表情+循环',
  },

  // ─── reaction states (用户交互触发) ──────────────────────

  'react-drag': {
    name: '被拖动',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'react-drag',
    prompt: `The character is floating in the air as if being dragged by an invisible force. NO hands visible. Looks thrilled and excited — eyes wide and sparkling, big happy grin, ears/extensions perked forward. Limbs spread out like airplane wings. Tail streams behind like a flag. Body sways and bounces slightly as if riding a rollercoaster. Seamless loop animation. Fun and energetic. DO NOT draw any hands or fingers.`,
    notes: '无手, 角色悬浮兴奋飞行姿态, 循环',
  },

  'react-poke': {
    name: '被戳反应 (一次性·回归型)',
    loop: false,
    anchor: 'same',
    duration: 2.5,
    refKey: 'main',
    prompt: `The character flinches and leans to one side with a surprised expression — eyes wide, ears perked. Raises one hand/paw as if startled. Then settles back to the EXACT original pose. 2.5 seconds, cute and slightly startled. NO hands, NO fingers visible — character reacts as if touched by an invisible force. The ending pose must match the starting pose EXACTLY.`,
    notes: '惊讶歪身+抬手→回原姿势, 首尾帧严格一致',
  },

  // ─── notification / completion (一次性·回归型) ────────────

  'happy': {
    name: '任务完成',
    loop: false,
    anchor: 'same',
    duration: 4,
    refKey: 'main',
    prompt: `The character suddenly perks up with joy — eyes squinting into happy crescents (^^), tail/extending part standing straight up wagging enthusiastically. Small sparkles or flower petals float around. Maybe a small celebratory wiggle or tiny hop in place. Pure contentment expression. Then settles back to the normal pose. 4 seconds, cheerful and lively.`,
    notes: '一次性, 结尾必须回到 idle 标准姿势',
  },

  'notification': {
    name: '通知/警觉',
    loop: false,
    anchor: 'same',
    duration: 2.5,
    refKey: 'main',
    prompt: `The character suddenly becomes alert — ears/extensions perk up and rotate forward, pupils dilate slightly, body tenses into slight crouch. A yellow exclamation mark (!) appears above its head. Holds the alert pose briefly, then relaxes back to normal sitting pose. 2.5 seconds total.`,
    notes: '耳朵竖直转向+瞳孔放大+身体微蹲, 结尾回中性',
  },

  'error': {
    name: 'XX眼晕倒',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'error',
    prompt: `The character is lying on its side, knocked out with X-shaped eyes and tongue sticking out slightly. Body has very gentle breathing motion — slow subtle rise and fall. Small puff clouds and sparkle stars float and drift above its head. Stays in same lying position the entire time. Seamless loop, calm and slow. DO NOT inflate or balloon any extending parts. DO NOT move the body position.`,
    notes: 'XX眼侧躺不动+微弱呼吸+头顶烟雾星星, 循环',
  },

  // ─── idle 装饰类 (一次性·回归型, 长时间空闲触发) ─────────

  'idle-yawn': {
    name: '打哈欠 (装饰)',
    loop: false,
    anchor: 'same',
    duration: 3,
    refKey: 'main',
    prompt: `The character is in standard pose. Slowly opens its mouth very wide in a big yawn — tongue curling, eyes squeezing shut. Then closes mouth, does a small head shake, returns to original pose with eyes open. Smooth animation, 3 seconds total. Stays in place, only head and mouth move significantly. Body breathes gently. Return to the EXACT starting pose at the end.`,
    notes: '装饰动画, 长时间空闲触发, 首尾严格一致',
  },

  'idle-look': {
    name: '四处张望 (装饰)',
    loop: false,
    anchor: 'same',
    duration: 6.5,
    refKey: 'main',
    prompt: `The character looks around curiously. Head turns slowly to the left, pauses, then turns to the right, pauses, then returns to center facing forward. Body stays in place, only head moves. Ears twitch occasionally. Curious and calm expression. 6.5 seconds total.`,
    notes: '头左转→停→右转→停→回正, 身体不动, 装饰动画',
  },

  // ─── sleeping 链 (混合 A/B/C 三类) ──────────────────────

  'sleeping': {
    name: '睡觉循环',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'sleep-final',
    prompt: `The character is in sleeping pose (curled / lying / your character's sleep posture). Tail/blanket wraps around. Eyes fully closed. The only movement is gentle breathing — body slowly rises and falls. A small "Zzz" sleep bubble floats up occasionally. Seamless loop, very calm and slow. Minimal movement, cozy atmosphere.`,
    notes: '蜷成球或仰躺+呼吸+Zzz气泡(后期可手加), 循环',
  },

  'collapse-sleep': {
    name: '快速倒下入睡 (一次性·过渡型)',
    loop: false,
    anchor: 'different',
    duration: 0.8,
    refKey: 'main',
    lastKey: 'sleep-final',
    prompt: `The character slowly topples over to one side — body tilting, eyes closing, then curling up into a sleeping ball. Very quick transition, 0.8 seconds. End pose is the curled-up sleeping position.`,
    notes: '坐姿→侧倒→蜷起来, 首≠尾, 过渡动画',
  },

  'wake': {
    name: '醒来伸懒腰 (一次性·过渡型)',
    loop: false,
    anchor: 'different',
    duration: 1.5,
    refKey: 'sleep-final',
    lastKey: 'main',
    prompt: `The character transitions from curled-up sleeping position to sitting upright. Uncurls, stretches forward in a long stretch, arches its back, then sits up straight with eyes open and alert. Quick but fluid motion, 1.5 seconds total. End pose matches the standard sitting/idle position EXACTLY.`,
    notes: '伸懒腰弓背+最终姿态对齐 idle, 过渡动画',
  },

  // ─── mini mode (dock/tray 缩放模式, 6 状态) ─────────────

  'mini-idle': {
    name: 'mini 待机',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'mini',
    prompt: `The character is in a relaxed lying / sideways / curled pose (DIFFERENT from main idle, this is the mini-mode pose). Calm and content expression. Gentle breathing — body slowly rises and falls. Slow blinks. Slightly turns head to look to one side, then slowly back to center. Very gentle movement. Seamless loop, very calm. DO NOT change pose. Body stays in same lying position throughout.`,
    notes: 'mini 模式 ≠ 缩小版 idle, 是不同姿态',
  },

  'mini-enter': {
    name: 'mini 入场 (一次性·过渡型)',
    loop: false,
    anchor: 'different',
    duration: 3,
    refKey: 'offscreen-left',
    lastKey: 'mini',
    prompt: `The character runs playfully from off-screen, then flops down and rolls into the mini-idle pose. Quick and energetic run, then a cute tumble onto the mini pose. Happy and playful expression throughout.`,
    notes: '从场外跑→躺倒到 mini-idle 位置, 首≠尾',
  },

  'mini-peek': {
    name: 'mini 探头 (剪辑或独立)',
    loop: false,
    anchor: 'same',
    duration: 2,
    refKey: 'mini',
    prompt: `The character (in mini pose) peeks out and waves briefly, then settles back to mini-idle pose. Cute brief reaction. End pose matches mini-idle EXACTLY.`,
    notes: '可以从其他动画剪辑出来, 也可以独立生成',
  },

  'mini-alert': {
    name: 'mini 通知',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'mini',
    prompt: `The character is in mini pose. A red exclamation mark (!) pops up beside, bouncing and flashing. Eyes widen with surprised expression, ears perk. Body stays in same mini pose, only eyes react and exclamation animates. Seamless loop animation.`,
    notes: 'mini 姿态+弹出感叹号+惊讶, 循环',
  },

  'mini-happy': {
    name: 'mini 完成庆祝',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'mini',
    prompt: `The character is in mini pose. Small sparkles, stars and flower petals float and pop around. Very happy expression — eyes squinted into happy crescents (^^), content and proud. Body stays in same mini pose, only sparkle effects animate and tail wags slightly. Seamless loop animation.`,
    notes: 'mini 姿态+花花星星飘+眯眼笑, 循环',
  },

  'mini-sleep': {
    name: 'mini 休眠',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'mini',
    prompt: `The character is in mini pose, eyes CLOSED, sleeping deeply. Eyes must stay CLOSED entire time. The only movement is very gentle breathing — body slowly rises and falls. Small "Zzz" text floats up and fades, repeating in loop. Very calm and cozy. Seamless loop. DO NOT open eyes. DO NOT change camera angle.`,
    notes: 'mini 闭眼睡+呼吸+Zzz, 极简循环',
  },
};

// ── 4. 拼接函数（生成最终 prompt 给 API） ────────────────────
export function buildFullPrompt(animationKey, { keyColor = DEFAULT_KEY_COLOR } = {}) {
  const anim = ANIMATIONS[animationKey];
  if (!anim) {
    const keys = Object.keys(ANIMATIONS).join(', ');
    throw new Error(`未知动画: "${animationKey}"。可选: ${keys}`);
  }
  const normalizedKeyColor = normalizeKeyColor(keyColor);
  const characterPrefix = normalizedKeyColor === DEFAULT_KEY_COLOR
    ? CHARACTER_PREFIX
    : CHARACTER_PREFIX
      .replaceAll(DEFAULT_KEY_COLOR, normalizedKeyColor)
      .replaceAll('plain solid green', 'plain solid color');
  return `${characterPrefix}\n\n${anim.prompt}\n\n${buildBackgroundSuffix(normalizedKeyColor)}`;
}

// ── 5. 列出所有动画（按首尾帧关系分组） ──────────────────────
export function listAnimations() {
  console.log('\n════════ 状态库 (共 ' + Object.keys(ANIMATIONS).length + ' 个交付状态) ════════\n');

  const groupA = []; // 循环
  const groupB = []; // 一次性·回归型
  const groupC = []; // 一次性·过渡型

  for (const [key, anim] of Object.entries(ANIMATIONS)) {
    const line = `  ${key.padEnd(20)} ${anim.name.padEnd(20)} ${anim.duration}s`;
    if (anim.loop) groupA.push(line);
    else if (anim.anchor === 'same') groupB.push(line);
    else groupC.push(line);
  }

  console.log('─── A. 循环动画 (loop:true, 首=尾) ───');
  groupA.forEach(l => console.log(l));
  console.log(`\n─── B. 一次性·回归型 (loop:false, 首=尾) ───`);
  groupB.forEach(l => console.log(l));
  console.log(`\n─── C. 一次性·过渡型 (loop:false, 首≠尾) ───`);
  groupC.forEach(l => console.log(l));
  console.log('');
}

// ── 6. 生成 gen-video.js 命令（按 anchor 类型自动选项） ─────
export function buildGenVideoCommand(animationKey, refImagePaths, { keyColor } = {}) {
  const anim = ANIMATIONS[animationKey];
  if (!anim) throw new Error(`未知动画: ${animationKey}`);

  const refPath = refImagePaths[anim.refKey];
  if (!refPath) throw new Error(`refKey "${anim.refKey}" 没有对应路径`);

  const parts = [
    'node gen-video.js',
    animationKey,
    `--image ${refPath}`,
    '--api doubao',
  ];

  // 关键：根据 anchor 决定 --last-frame 用什么
  if (anim.anchor === 'same') {
    // A 类(循环) + B 类(回归型) 都是首=尾
    parts.push(`--last-frame ${refPath}`);
  } else {
    // C 类(过渡型) 首≠尾, 用 lastKey 指定的尾帧
    const lastPath = refImagePaths[anim.lastKey];
    if (!lastPath) throw new Error(`lastKey "${anim.lastKey}" 没有对应路径`);
    parts.push(`--last-frame ${lastPath}`);
  }

  if (keyColor) {
    parts.push(`--key-color "${normalizeKeyColor(keyColor)}"`);
  }

  parts.push(`--no-chroma`);
  return parts.join(' \\\n  ');
}
