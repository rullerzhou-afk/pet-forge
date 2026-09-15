# SVG 路线 · 循环 / 一次性 / 过渡 三类状态实现

> APNG 路线和 SVG 路线在"首尾帧关系"概念上完全相同（详见 `shared/state-map.md`），
> 但**实现机制不同**：APNG 用参考图锚定，SVG 用 CSS keyframes + animation-fill-mode。
> 本文档讲 SVG 路线的具体实现。

---

## 3 类状态在 SVG 路线的对应

| 类 | APNG 路线 | SVG 路线 | CSS animation |
|---|---|---|---|
| **A. 循环** | `--image X --last-frame X` | keyframes 0% = 100% | `infinite` |
| **B. 一次性·回归型** | 同上 + prompt "returns to" | keyframes 0% = 100% | 播 1 次，不加 `forwards` |
| **C. 一次性·过渡型** | `--image X --last-frame Y` (Y≠X) | keyframes 0% ≠ 100% | `1 forwards` (必须 forwards) |

---

## A 类 · 循环动画（infinite loop）

### 核心要求

CSS `@keyframes` 的 **`0%` 和 `100%` 必须完全相同**——否则下一轮循环开始时跳到 0%，会出现"咔嚓"突变。

### 模板

```css
@keyframes breathe {
  0%   { transform: scale(0.97); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(0.97); }   /* ← 必须等于 0% */
}

.pet {
  animation: breathe 4.8s ease-in-out infinite;
}
```

### 常见错误

```css
/* ❌ 0% 和 100% 不一致, 循环必跳帧 */
@keyframes wrong {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(10deg); }   /* ← 下一轮跳回 0deg */
}

/* ✅ 修正 */
@keyframes right {
  0%, 100% { transform: rotate(0deg); }
  50%      { transform: rotate(10deg); }
}
```

### 多个动画异步循环（避免机器感）

桌宠的"活物感"靠**多个动画异步**：

```css
.body  { animation: breathe 4.8s ease-in-out infinite; }
.hat   { animation: hat-sway 6.0s ease-in-out infinite; }
.zzz   { animation: zzz-float 1.8s linear infinite; }
```

三个周期**故意不一样**（4.8 / 6.0 / 1.8），混合后产生不规律节奏，看起来才像活物。

> 详见 `../lessons/pitfalls.md` "异步循环"通则。睡眠状态常用呼吸、配件摆动、Z 字漂浮三层异步循环。

### prompt 关键词（如果用 AI 生 PNG 后做 SVG）

写 PNG 生成 prompt 时**不需要**强调 "seamless loop"——因为循环是 CSS 的事，不是 PNG 的事。

---

## B 类 · 一次性·回归型（做完回原姿）

### 核心要求

**`0%` 和 `100%` 仍然必须相同**（最终回到原姿），但只播一次。

### 模板

```css
@keyframes happy-burst {
  0%   { transform: scale(1) rotate(0); }     /* 起始姿态 */
  20%  { transform: scale(1.15) rotate(-3deg); } /* 蓄力 */
  60%  { transform: scale(1.1) rotate(3deg); }   /* 释放 */
  100% { transform: scale(1) rotate(0); }     /* ← 回到 0% */
}

.pet.happy {
  animation: happy-burst 2s ease-out;
  animation-iteration-count: 1;
  /* 不加 fill-mode forwards, 因为最终就是回到原始 transform */
}
```

### JS 触发模式

```javascript
function triggerHappy() {
  pet.classList.add('happy');
  // 动画结束后移除 class, 准备下次触发
  setTimeout(() => pet.classList.remove('happy'), 2000);
}
```

或用 `animationend` 事件：

```javascript
pet.addEventListener('animationend', e => {
  if (e.animationName === 'happy-burst') pet.classList.remove('happy');
});
```

### 常见错误

```css
/* ❌ 用了 forwards 导致动画结束后停在 100% */
.pet.happy {
  animation: happy-burst 2s ease-out forwards;  /* ← 错 */
}
/* 后果: 100% 跟 0% 一样, forwards 没影响, 但加了 forwards 暗示"结束停留",
   下次触发可能逻辑混乱. B 类不要 forwards. */
```

---

## C 类 · 一次性·过渡型（去新姿态）

### 核心要求

**`0%` 和 `100%` 不同**（首≠尾），且必须用 **`animation-fill-mode: forwards`** 让动画结束后停留在 100%。

### 模板

```css
@keyframes collapse-sleep {
  0%   {
    /* idle 姿态: 直立 */
    transform: rotate(0) translateY(0);
  }
  100% {
    /* sleeping 姿态: 倒下 */
    transform: rotate(90deg) translateY(20px);
  }
}

.pet.collapsing {
  animation: collapse-sleep 0.8s ease-in;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;   /* ← 关键: 停在 100% */
}
```

### JS 状态切换模式

```javascript
async function transitionToSleep() {
  pet.classList.add('collapsing');
  await new Promise(r => setTimeout(r, 800));  // 等动画跑完
  pet.classList.remove('collapsing');           // 移除过渡 class
  pet.classList.add('sleeping');                // 加最终状态 class
}
```

### 常见错误

```css
/* ❌ 没加 forwards, 动画结束跳回 0% (idle 姿态) */
.pet.collapsing {
  animation: collapse-sleep 0.8s ease-in;
  /* 缺 animation-fill-mode: forwards */
}
/* 后果: 角色坐倒下去...又站起来回 idle. 根本看不出"入睡". */

/* ❌ 0% 和 100% 一样, 然后用 forwards (语义错乱) */
@keyframes wrong-collapse {
  0%, 100% { transform: rotate(0); }   /* ← 没去新姿态 */
}
```

### 衔接到下一个状态

C 类是过渡，结束后**必须接到下一个状态**：

```
idle (A 类循环)
  ↓ JS 触发 transitionToSleep()
collapse-sleep (C 类, animation-fill-mode: forwards)
  ↓ animationend 后移除 .collapsing, 加 .sleeping
sleeping (A 类循环)
```

如果 C 类结束后没接下一个状态，桌宠会**冻在过渡的 100% 帧**——这是状态机 bug。

---

## 完整状态机骨架

```javascript
const PET = {
  // A 类: 循环, 进入即播放, 离开即停止
  idle:     { type: 'A', class: 'idle' },
  typing:   { type: 'A', class: 'typing' },
  sleeping: { type: 'A', class: 'sleeping' },

  // B 类: 一次性, 播完不切换状态 (回到上一个 idle)
  happy:        { type: 'B', class: 'happy', duration: 2000, returnTo: 'idle' },
  notification: { type: 'B', class: 'notification', duration: 2500, returnTo: 'idle' },

  // C 类: 一次性·过渡, 播完切换到目标状态
  'collapse-sleep': { type: 'C', class: 'collapsing', duration: 800, transitionTo: 'sleeping' },
  'wake':           { type: 'C', class: 'waking', duration: 1500, transitionTo: 'idle' },
};

let currentState = 'idle';

async function setState(name) {
  const state = PET[name];
  pet.classList.remove(PET[currentState].class);

  if (state.type === 'A') {
    pet.classList.add(state.class);
    currentState = name;
  } else if (state.type === 'B') {
    pet.classList.add(state.class);
    setTimeout(() => {
      pet.classList.remove(state.class);
      pet.classList.add(PET[state.returnTo].class);
      currentState = state.returnTo;
    }, state.duration);
  } else if (state.type === 'C') {
    pet.classList.add(state.class);
    setTimeout(() => {
      pet.classList.remove(state.class);
      pet.classList.add(PET[state.transitionTo].class);
      currentState = state.transitionTo;
    }, state.duration);
  }
}
```

这是 SVG 路线状态机的最小骨架。用户可以扩展（加事件队列 / 优先级 / 复合状态）。

---

## 跟 APNG 路线的差异

| 维度 | SVG 路线 | APNG 路线 |
|---|---|---|
| **循环实现** | CSS `infinite` | APNG 内嵌 PLAYS=0 |
| **首尾对齐** | keyframes 0% = 100% | 视频 --last-frame 锚定 |
| **过渡停留** | `animation-fill-mode: forwards` | 静态 PNG 兜底 |
| **状态切换** | JS 切 class | runtime 切换 APNG 文件 |
| **微调成本** | 低（改 keyframes 数值） | 高（重生视频） |
| **首尾不齐成本** | 低（改 100% 即可） | 高（重生 + 重抠图） |

**SVG 路线最大优势**：首尾不齐这种问题**永远不会成为生产瓶颈**，因为 keyframes 数值你完全可控。

---

## 用 hello-idle.svg.html 验证

`templates/hello-idle.svg.html` 的 breathe 动画就是 A 类标准实现：

```css
@keyframes breathe {
  0%   { transform: scale(0.97); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(0.97); }   /* = 0% ✅ */
}
```

打开浏览器连续看多个完整周期，循环应该完全无缝（没有“咔嚓”突变）。如果有，你改了 0% 或 100% 让它们不一致——回头检查。

---

## 给 Claude 的提示

如果用户做 SVG 桌宠时问"循环不无缝怎么办"：

1. 先问是 A / B / C 哪类（指本文档）
2. 检查 keyframes 的 0% 和 100% 是否相同（A / B 必须相同）
3. C 类检查是否加了 `animation-fill-mode: forwards`
4. 检查多个动画的周期是不是故意不一样（异步循环要求）
