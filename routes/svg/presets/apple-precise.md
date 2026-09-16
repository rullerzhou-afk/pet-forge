# Preset: apple-precise（苹果精致风）

> **适用案例**：圆润、克制、低对比的 SVG 桌宠
> **关键词**：克制、缓慢、圆润、微妙、精致

---

## 这个 preset 适合什么角色

- **主体形状**：圆润、有机、凸起几何（云朵 / 球状生物 / 圆角方块）
- **审美定位**：苹果系产品 UI、Memphis 软糖风、奶油吐司、毛茸茸物体
- **气质**：内敛、温和、小活泼但不蹦跳

**不适合**：
- 锐利硬朗（机甲、武器）→ 用 pixel-art preset 或自定义
- 蹦迪夸张（多巴胺、Y2K 闪烁）→ 自己定 preset，本 preset 太克制
- 写实质感（毛发、油画）→ SVG 路线本身不擅长，建议 APNG 路线

---

## 几何元素映射表

| 维度 | 取值 | 备注 |
|---|---|---|
| **眼睛形状** | 圆形 / 圆角矩形（豆豆眼） | r 6-10px @ 200 viewBox |
| **眼睛颜色** | 深色低饱和（模板默认紫蓝 #5B6BCB / 深灰 #3A4055，也可用柔和渐变） | 不要纯黑，纯黑太硬 |
| **轮廓边角** | 圆角凸起，禁直角 | 圆角半径 ≥ 6px |
| **描边** | 三层叠加（外光晕 + 中描边 + 内高光） | 详见"三层 stroke 系统"段 |
| **填充** | 软橡胶质感（柔和单色或渐变） | 避免高对比、避免荧光 |
| **morph 允许度** | 70-90% sweet spot | **不到 100%**，准形态比满变形更精致 |
| **嘴巴** | 默认无嘴 | 表情靠眼睛，要表达再加 |
| **附加几何** | 凸起 / 毛茸茸（不是 spike） | 凸起是 DNA，向外刺尖锐感不对 |

---

## 节奏档位

| 维度 | 取值 | 适用场景 |
|---|---|---|
| **呼吸周期** | 4-8s 缓周期 | 所有 idle / sleeping / dozing |
| **呼吸幅度** | 5-10% 微妙 | scale 0.95-1.05 之间 |
| **眨眼间隔** | 3-7s 随机 | 偶尔 10% 双连眨更生动 |
| **眨眼时长** | 120-180ms | 太快不真实，太慢像困 |
| **状态切换缓动** | ease-in-out 0.4-0.8s | 不要 linear，linear 像机器 |
| **彩蛋激进段落** | 0.5-1.2s 短促 | 反差克制感，太长会喧宾夺主 |
| **morph 段落** | 0.6-1.5s | 多于 1.5s 会拖沓 |

---

## 三层 stroke 系统（精致风的灵魂）

apple-precise 风格静帧好看的关键不是颜色，是**三层 stroke 叠加**形成的"软光"：

```svg
<!-- 外层：极淡光晕（impression of glow） -->
<circle cx="100" cy="100" r="65"
        fill="none" stroke="#E8ECF5" stroke-width="6" opacity="0.5"/>

<!-- 中层：主描边 -->
<circle cx="100" cy="100" r="65"
        fill="#F5F6FA" stroke="#B8C0CC" stroke-width="2.5"/>

<!-- 内层：高光线（顶部 1/3 弧段，stroke-dasharray 控制） -->
<path d="M 60 80 Q 100 65 140 80"
      fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.7"/>
```

**没有这三层，浅色模式下角色会"飘"，没有立体感**。

---

## 激进度预算（主线保守 + 少数彩蛋槽）

apple-precise 主线必须**保守**，激进度通过**少数彩蛋槽**释放：

- **主线状态（占 80-90%）**：所有 idle / typing / thinking / sleeping / 基础 reactions 走克制路线
- **彩蛋槽（占 10-20%）**：1-3 个状态可以激进破局，但时间要短、触发要少。

新角色不强制照抄比例，但**激进度不能超过 25%**，否则就不是 apple-precise 了。

---

## 关键元教训（套这个 preset 必读）

1. **morph 70-90% > 100%**：球化变形 t=70% 比满变形（t=100%）更精致。所有 morph 类动作先试 70-90%，不默认 100%。
2. **静帧好看 ≠ 循环好看**：sleeping 帽子位置静帧 OK，循环时呼吸把帽子推得“游来游去”才发现位置错。锁定前要在浏览器连续看多个完整周期，并覆盖最长的次级动作。
3. **仓促感来自结构不是时长**：庆祝动画先拆段落，再调总时长。**别先调时长，先看结构**。
4. **视觉直觉 > 几何正确**：漂浮符号常常需要视觉匀速，而不是几何透视。
5. **pivot 决定动作"性格"**：drag reaction pivot 设头顶 = 钟摆（被动），设中心 = 自旋扭身（主动）。pivot 不是技术细节，是性格选择。
6. **简单 ≠ 去掉活物感**：drag reaction 静态贴图被否决，最简单的 reaction 也要保留眨眼 / 呼吸的"活物"感。

---

## 用在 hello-idle 模板上

直接对应 `routes/svg/templates/hello-idle.svg.html` 顶部的 CSS 变量：

```css
:root {
  --breath-period: 4.8s;       /* ← 4-8s 缓周期 */
  --breath-min: 0.97;          /* ← */
  --breath-max: 1.02;          /* ← 5-10% 微妙幅度 */
  --blink-min-gap: 3000;       /* ← 3-7s 随机眨眼 */
  --blink-max-gap: 7000;
  --blink-duration: 150;       /* ← 120-180ms */
}
```

用户接 apple-precise preset 时，这几个变量是默认值。改造型 = 改 `<g id="pet">` 内部，不动节奏档位。

---

## Public Use

This preset describes a visual method, not a character. Use it to design a new character with its own silhouette, palette, and expression system.
