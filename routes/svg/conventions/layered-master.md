# 分层母版约定

> 当一个角色会扩展到多个状态时，先维护一份 layered master。不要把某个状态导出页反向当母版。

## 母版职责

母版只负责三件事：

1. 稳定角色识别锚点：头、身体、眼睛、嘴、手脚、道具、主色板。
2. 提供可复制到状态文件的干净部件。
3. 给动画留下明确锚点和命名，不承载某个状态的临时节奏。

状态文件可以复制母版部件并做姿态调整；母版不要被某个状态的 debug keyframe、tuner 参数或临时 helper 污染。

## 命名和分组

给可动画部件稳定命名：

```svg
<g id="head" data-layer="body" data-part="head">
<g id="eye-left" data-layer="face" data-part="eye">
<g id="eye-right" data-layer="face" data-part="eye">
<g id="hand-left" data-layer="limb" data-part="hand">
```

建议：

- 用 `id` 表示唯一部件；
- 用 `data-part` 表示部件类型；
- 用 `data-layer` 表示层级语义；
- 用 `data-origin` 或注释记录关键 pivot / 接触点；
- 左右对称部件使用 `*-left` / `*-right`，不要混用 `l-*`、`right*` 等多套命名。

## 可动画拆层

优先拆出未来会独立动的东西：

- 眼睛拆 `eye-fill`、`eye-highlight`，复杂表情再加 eye-shape library；
- 嘴、眉、腮红用独立 group，便于表情替换；
- 手、脚、尾巴、耳朵、触角等肢体不要并进身体 path；
- 道具和角色本体分层，道具不要绑死在身体轮廓里；
- 阴影、遮挡片、接触暗边单独命名，避免后续不知道它服务哪个动作。

如果一个形状只在单个状态里出现，把它放到状态文件；如果多个状态都会用，再沉淀回母版或 library。

## 变换默认值

母版里给可动画部件显式写清楚 transform 语义：

```css
#hand-left,
#hand-right,
#ear-left,
#ear-right {
  transform-box: view-box;
  transform-origin: 0 0;
}
```

具体 pivot 可以在状态文件里覆盖，但不要依赖浏览器默认 origin。默认 origin 不稳定，是很多“部件飞走”的源头。

## 开发期和导出期

开发期可以为了效率引用母版或 library：

- tuner 可以读取母版片段；
- 草稿页可以用 helper script 注入部件；
- library 可以作为复制源。

交付期必须回到自包含：

- canonical state 内联所需 SVG、CSS、JS；
- 不跨文件 `<use href>` 引部件；
- 不依赖本地 fetch 才能显示角色；
- showcase/runtime 加载的文件就是能独立验收的文件。

详见 `single-file.md` 和 `tuner-to-canonical.md`。

## 母版变更纪律

改母版前先问三个问题：

1. 这是角色结构改动，还是某个状态的姿态改动？
2. 这个改动会影响哪些已锁定状态？
3. 改完后是否需要重新同步 canonical 状态？

如果只是某个状态需要临时姿态，优先改状态文件。只有会被多个状态复用的结构变化，才进母版。
