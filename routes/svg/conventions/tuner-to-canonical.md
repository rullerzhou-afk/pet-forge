# Tuner 到 canonical 工作流

> 当一个 SVG 状态先在本地调参页里磨，再准备交付给 runtime 或 showcase 时，用这一页。

## 文件角色

先把文件角色分清：

- **master asset**：角色和可复用部件的分层真相源；
- **tuner page**：用于 slider、debug overlay、probe、节奏候选的临时调参页；
- **canonical state**：runtime 应该加载的干净状态文件；
- **showcase copy**：公开展示或 demo 用来证明交付效果的副本。

不要让 tuner page 意外变成交付文件。tuner 可以乱，canonical 不可以乱。

## 推荐流程

1. 从当前 master asset 开始，不从旧导出状态反向改。
2. 只为当前要探索的参数空间开 tuner。
3. 已经基本能看的动画，大改前先备份。
4. 方向被用户或维护者认可后，把最终数值烘焙进 canonical state。
5. 从 canonical 里移除 tuner-only 控件、debug marker、console probe 和废弃分支。
6. 把 canonical state 复制或导出到 showcase/runtime 路径。
7. 验证真实加载目标，不只验证本地源文件。

## Scripted SVG 交付

Scripted SVG 可以用于桌宠，尤其是 pointer following、host event、runtime-driven state 和过渡编排。

状态文件含脚本时：

- 优先使用能保留脚本文档上下文的嵌入方式，例如 `<object>` 或 iframe/webview；
- 不要默认认为普通 `<img>` 会执行脚本；
- 只有 runtime 确实需要驱动状态时，才暴露小型 host bridge；
- bridge 名称保持通用，并在使用该 skill 的项目中记录；
- 只有 host 需要编排过渡时，才加 duration/readiness probe。

## 公开目标验证

状态复制到 demo 或部署目标后，验证目标本身：

- 打开用户实际会看到的 public/runtime URL 或路径；
- 确认页面引用的是目标文件；
- HTTP 服务时确认 content type 和缓存行为；
- 区分 preview URL 和 production URL，避免拿旧快照当线上；
- 记录当前 source of truth 是哪一份文件。

关键问题不是“deploy 命令有没有跑完”，而是“用户可见目标是否正在加载预期 canonical asset”。

## 不要烘焙进去的东西

canonical state 里不要保留：

- 本地 slider 或仅键盘可用的 debug 控件；
- 临时 marker、bounding box；
- runtime 合同不需要的项目私有 host 变量名；
- 已淘汰方向留下的旧 keyframe；
- 不属于通用资产的客户名或项目名。
