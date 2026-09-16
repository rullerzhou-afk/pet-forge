# Preset: pixel-art（像素风）

> **适用案例**：低分辨率、硬边、整像素桌宠
> **关键词**：整像素、低分辨率、跳跃式动画、马赛克美学
> **澄清**：pixel-art ≠ pixiv 风。pixiv 是日本插画站手绘二次元，本 preset 跟它没关系。

---

## 这个 preset 适合什么角色

- **主体形状**：方块、像素方阵、低分辨率字符
- **审美定位**：FC / GBA / 早期任天堂 / Undertale / Stardew Valley
- **气质**：复古、跳跃、魔性、Q 萌

**不适合**：
- 圆润有机（云朵、毛茸茸）→ 用 apple-precise preset
- 写实人物 → 用 APNG 路线
- 高分辨率插画 → 不是 SVG 路线擅长的

---

## 几何元素映射表

| 维度 | 取值 | 备注 |
|---|---|---|
| **眼睛形状** | 1-2 像素方块 / 矩形 | 看起来像"长方形"是因为像素少 |
| **眼睛颜色** | 纯黑 / 高对比深色 | 像素风可以纯黑，硬边正合适 |
| **轮廓边角** | 整像素直角，禁圆角 | 圆角破坏像素质感 |
| **描边** | 1px 硬边或无描边 | 不要 anti-aliasing |
| **填充** | 纯色块，禁渐变 | 渐变出现 = 像素风破功 |
| **morph 允许度** | **不 morph** | 帧间整体替换，不平滑过渡 |
| **嘴巴** | 1-2 像素表达 | 一个像素就是嘴 |
| **调色板** | 硬性限制 8-32 色 | 颜色越少越像素 |

---

## 节奏档位

| 维度 | 取值 | 适用场景 |
|---|---|---|
| **帧率** | 8-12fps | 不要 60fps 流畅，像素风要顿挫 |
| **idle 循环周期** | 1-2s | 比 SVG 路线快一档 |
| **眨眼时长** | 1 帧（像素跳） | 不要 ease-in-out，瞬间切 |
| **眨眼间隔** | 2-5s 随机 | 比 apple-precise 快 |
| **状态切换** | 瞬切或 2-3 帧过渡 | 没有缓动，整体替换 |
| **彩蛋激进段落** | 0.3-0.8s 短促夸张 | 像素风彩蛋上限可以更高 |
| **走路循环** | 4 帧或 8 帧 | 像素风经典走路帧数 |

---

## 实现技术差异

像素风用 SVG 实现的关键技巧：

```svg
<!-- 关闭 SVG anti-aliasing：每个矩形是一个像素块 -->
<svg viewBox="0 0 16 16"
     shape-rendering="crispEdges"
     style="image-rendering: pixelated;">
  <!-- 每个像素 = 一个 1×1 矩形 -->
  <rect x="6" y="4" width="1" height="1" fill="#000"/>
  <rect x="9" y="4" width="1" height="1" fill="#000"/>
  <!-- ... -->
</svg>

<!-- 渲染时通过 CSS 放大，不重采样 -->
<style>
  svg { width: 256px; height: 256px; image-rendering: pixelated; }
</style>
```

**关键属性**：
- `shape-rendering="crispEdges"` —— SVG 元素不平滑
- `image-rendering: pixelated` —— CSS 放大不平滑（Chrome/Firefox 都支持）
- `viewBox` 用小整数（16/24/32），用户看到的是 CSS 放大版

---

## 动画实现：CSS sprite 跳帧不是 transform 缓动

apple-precise 用 CSS animation 加 transform 平滑过渡。**pixel-art 完全相反**：

```css
/* 错误（不像素）：平滑 */
@keyframes wrong {
  from { transform: translateY(0); }
  to   { transform: translateY(-2px); }
}

/* 正确（像素）：用 steps() 跳帧 */
@keyframes idle {
  0%, 50%   { transform: translateY(0); }
  50.01%, 100% { transform: translateY(-1px); }
}
.pet { animation: idle 1s steps(2) infinite; }
```

或者更地道的：**多帧 SVG 序列 + display 切换**（每帧一个 `<g>`，JS 切 visible）。

---

## 激进度预算（更宽松）

像素风的"激进度上限"比 apple-precise 高：

- **主线状态**：基础 idle / walk 可以更夸张（颠+顿挫）
- **彩蛋槽**：可以多到 5-8 个，整体动作幅度也可以大
- 像素风本身就有"复古魔性"buff，不会因为夸张丢失气质

新像素风角色按需调整，并保留有代表性的“克制 idle”作为其他夸张动作的节奏锚点。

---

## 关键元教训（套这个 preset 必读）

1. **不要试图平滑像素动画**：用 `steps()` 不用 `ease`，用整数像素位移不用小数。
2. **viewBox 越小越好**：16x16 / 24x24 / 32x32，CSS 放大显示。
3. **调色板硬限**：开局先定 8-16 个颜色，后续所有添加都从这里挑，不引入新色。
4. **眨眼是 1 帧**：不是过渡，是整体替换的"另一帧"。
5. **走路循环 4 帧最经典**：不要纠结流畅度，4 帧就够。
6. **配 retro 字体**：像素角色用 Press Start 2P / VT323 / 其他像素字体最对味。

---

## 用在 hello-idle 模板上

像素风版本的 hello-idle 跟 apple-precise 版差异巨大，**未来需要单独写一个 `hello-idle-pixel.svg.html`**（当前 v0.1 占位 TODO）。

关键参数差异：

```css
:root {
  /* pixel-art 节奏档位 */
  --frame-rate: 10;            /* 10fps */
  --idle-period: 1.2s;         /* 短周期 */
  --blink-frames: 1;           /* 单帧眨眼 */
}

svg {
  shape-rendering: crispEdges;
  image-rendering: pixelated;
}
```

---

## Public Use

This preset describes a visual method, not a character. Build your own palette, silhouette, and animation frames instead of copying an existing product asset.
