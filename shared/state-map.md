# 状态映射表（两路线共用）

> 桌宠的状态分类 + 跟桌宠运行时（Electron / Tauri / 网页挂件等）的对接接口模板。
> 不区分产物形态——SVG 路线和 APNG 路线的状态语义完全相同，区别只在文件类型。

---

## 状态分类（带 loop + 首尾帧关系标注）

每个状态都有一个**首尾帧关系**属性，3 类：

- **A** = 循环（loop:true，首=尾）
- **B** = 一次性·回归型（loop:false，首=尾，做完回原姿）
- **C** = 一次性·过渡型（loop:false，首≠尾，状态间桥梁）

**这是跨路线的硬规则**：
- APNG 路线影响 `gen-video.js --last-frame` 用什么参考图
- SVG 路线影响 CSS keyframes 0% 和 100% 是否一致 + animation-fill-mode

详细决策树见：
- APNG: `routes/apng/conventions/loop-and-anchoring.md`
- SVG: `routes/svg/conventions/loop-states.md`

### 完整状态库（25 个交付状态）

> 模板里包含 24 个直接生成 prompt 条目 + 1 个可由剪辑或独立生成得到的 `mini-peek` 交付状态。

```
[core states]                                  类型
   │
   ├─ idle-dozing      待机呼吸                  A (循环)
   ├─ idle-living      空闲小动作                A
   ├─ thinking         思考                      A
   ├─ working-typing   工作-打字                 A
   ├─ working-building 工作-建造                 A
   ├─ working-juggling 工作-玩耍                 A
   ├─ working-conducting 工作-指挥               A
   ├─ working-sweeping 工作-擦扫                 A
   ├─ working-carrying 工作-搬运                 A
   ├─ sleeping         睡觉                      A
   ├─ error            XX眼晕倒                  A
   │
   ├─ happy            任务完成                  B (回归型)
   └─ notification     通知/警觉                 B

[idle 装饰]                                    类型
   │
   ├─ idle-yawn        打哈欠                    B (回归型, 长闲触发)
   └─ idle-look        四处张望                  B

[transition 过渡]                              类型
   │
   ├─ collapse-sleep   坐倒入睡 (idle→sleep)     C (过渡型) ⚠️
   ├─ wake             醒来 (sleep→idle)         C ⚠️
   └─ mini-enter       mini 入场 (场外→mini)     C ⚠️

[reaction 用户交互]                            类型
   │
   ├─ react-drag       被拖动                    A (悬浮循环)
   └─ react-poke       被戳反应                  B (回归型)

[mini mode 6 状态：mini-enter 在 transition 组] 类型
   │
   ├─ mini-idle        mini 待机                 A
   ├─ mini-peek        mini 探头                 B (剪辑或独立)
   ├─ mini-alert       mini 通知                 A
   ├─ mini-happy       mini 完成                 A
   └─ mini-sleep       mini 休眠                 A
```

⚠️ **C 类只有 3 个但极其关键**——它们是状态机的"桥梁"，少了就会"咔嚓"姿态突变。

### 衔接链示例

```
正常睡眠链:
  idle (A) → idle-yawn (B) → idle-dozing (A) → collapse-sleep (C) ← 过渡桥梁
   → sleeping (A) → wake (C) ← 过渡桥梁 → idle (A)

mini 入场链:
  idle (A) → mini-enter (C) ← 过渡桥梁 → mini-idle (A)
```

---

## 标准接口（接桌宠运行时）

桌宠运行时通常会监听各类 agent/editor/runtime event，并按下表映射到状态：

| Agent Event | 对应状态 | 说明 |
|---|---|---|
| Idle (no activity) | `idle` | 默认状态 |
| Idle (random) | `idle-reading` 等 | 长时间 idle 触发的彩蛋 |
| UserPromptSubmit | `thinking` | 用户发了消息 |
| PreToolUse / PostToolUse | `typing` | 单次工具使用 |
| PreToolUse (3+ sessions) | `building` | 频繁工具使用 |
| SubagentStart (1) | `juggling` | 起 1 个 subagent |
| SubagentStart (2+) | `conducting` | 起多个 subagent |
| PostToolUseFailure | `error` | 工具失败 |
| Stop / PostCompact | `attention` / `happy` | 任务完成 |
| PermissionRequest | `notification` | 等待用户授权 |
| PreCompact | `sweeping` | 上下文压缩中 |
| WorktreeCreate | `carrying` | 创建 worktree |
| 60s no events | `sleeping` | 长期空闲 |

不同运行时可以扩展更多事件；本表只定义 pet-forge 的通用状态语义。

---

## 接运行时的最简方式

一个 theme 至少要提供这些状态文件：

```json
{
  "name": "your-pet-name",
  "states": {
    "idle": "states/idle.svg.html",         // SVG 路线 = .svg.html, APNG 路线 = .apng
    "typing": "states/typing.svg.html",
    "thinking": "states/thinking.svg.html",
    "sleeping": "states/sleeping.svg.html",
    "happy": "states/happy.svg.html",
    "error": "states/error.svg.html",
    "notification": "states/notification.svg.html",
    "carrying": "states/carrying.svg.html",
    "working-building": "states/building.svg.html",
    "working-juggling": "states/juggling.svg.html",
    "working-conducting": "states/conducting.svg.html",
    "working-sweeping": "states/sweeping.svg.html"
  },
  "mini": {
    "idle": "states/mini-idle.svg.html",
    "enter": "states/mini-enter.svg.html",
    "peek": "states/mini-peek.svg.html",
    "alert": "states/mini-alert.svg.html",
    "happy": "states/mini-happy.svg.html",
    "sleep": "states/mini-sleep.svg.html"
  },
  "reactions": {
    "drag": "states/react-drag.svg.html",
    "poke": "states/react-poke.svg.html"
  }
}
```

**SVG 路线**：每个值是 `.svg.html` 路径
**APNG 路线**：每个值是 `.apng` 路径
**混合**：理论可行（部分 SVG 部分 APNG），但具体支持情况取决于你的运行时实现。

### Scripted SVG 嵌入

如果 SVG 状态内部带脚本（例如 pointer-look、host event、transition sequencing），不要默认用普通 `<img>` 嵌入。

优先选：

- `<object data="states/idle.svg" type="image/svg+xml">`
- webview / iframe 风格的独立文档加载
- 运行时直接加载 `.svg.html`

普通 `<img>` 适合纯静态或纯 CSS/SMIL 资源；脚本状态通常需要独立文档上下文。

### Mini mode 的 host 分工

Mini 模式不是 main idle 的缩小版。运行时和状态文件要分工：

- host / window 负责贴边、推出、收回、吸附、窗口位移；
- mini SVG/APNG 负责角色在当前位置的表演；
- 不要为了模拟 host 推出而让角色本体在 SVG 内整体乱跳；
- hover peek 这类动作可以做成补充状态，但不要强行塞进核心 schema。

这条能避免 mini 状态在不同运行时里位置漂移或重复位移。

### 公开目标验证

接入运行时或展示站后，验证对象必须是用户实际看到的目标：

- 本地源文件只证明编辑结果；
- runtime path 证明主题映射正确；
- public demo 证明部署和引用正确；
- preview URL 和 production URL 可能是不同快照。

状态问题先分清是动画文件问题、映射问题、部署问题，还是缓存/旧预览问题。

---

## 最小可上线集合

不是所有状态都必须做。第一版能跑的最小集合：

### 必做（5 个）

```
idle, typing, thinking, sleeping, happy
```

少了任意一个，桌宠都会"穿模"——比如没 idle 就一直 typing 看着累，没 happy 任务完成就没反馈。

### 强烈建议（再 3 个）

```
notification, error, carrying
```

没这 3 个会缺反馈，但不会"穿模"。

### 高级（再 5 个）

```
working-building, working-juggling, working-conducting, working-sweeping, react-drag
```

让桌宠"会反应"，但不是必须。

### Mini 模式（6 个）

```
mini-idle, mini-enter, mini-peek, mini-alert, mini-happy, mini-sleep
```

如果你的桌宠不上 dock / tray，可以不做。

---

## 对接其他运行时

### Electron

写一个 Electron 主进程，根据状态切换 BrowserWindow 加载的文件：

```js
// 简化伪代码
const win = new BrowserWindow({ transparent: true, frame: false });
function setState(state) {
  const file = `states/${state}.svg.html`;
  win.loadFile(file);
}
```

### Tauri

类似 Electron，配置 `tauri.conf.json` 的 windows 透明 + 无边框，根据 state 切换 webview 加载的文件。

### 纯 Web 挂件

最简单：一个 HTML 页面，根据 URL 参数加载对应状态：

```html
<iframe src="states/idle.svg.html"></iframe>
```

JS 监听外部信号（WebSocket / polling）切换 iframe src。

---

## 元教训

1. **状态命名保持通用**：用 `idle / typing / thinking` 不要发明 `wait / coding / pondering`
2. **每个状态文件大小控制**：SVG < 100KB、APNG < 1MB，否则切换卡
3. **过渡帧不在本表**：状态切换的过渡（如 idle → sleeping 的 falling-asleep）按需做，但不在 minimum 集合
4. **状态间衔接看姿态**：所有结尾回到中性姿态的状态，互相切换才不突兀
5. **不要为每个事件都做独立动画**：合理复用，比如 PreToolUse 和 PostToolUse 都用 typing 即可
6. **先核真实目标再下结论**：状态是否交付、线上是否更新、运行时是否引用正确，都要看实际加载结果
