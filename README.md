# DSH 布局交换

文件编辑、工作区文件和内嵌浏览器放在中间，聊天放到右侧。独立本地插件，针对当前 DSH 0.2.2-rc.1 的三列 Web 界面；沿用已有面板，不移动或重新挂载聊天、编辑器节点。

## 使用

- 默认启用。打开原生右侧面板时自动交换为「会话列表 | 文件 / 浏览器 | 聊天」。
- 聊天标题栏的双向箭头可切换「工作区居中」和「恢复原始布局」。原生右侧面板展开按钮保留。
- 拖动工作区与聊天之间的分隔线调整宽度；双击恢复 420px。聚焦分隔线后可用方向键微调，Shift 加速，Home / End 调到边界。
- 布局开关与聊天宽度保存在当前浏览器 localStorage 中，刷新后保留。
- 关闭右侧面板、进入全局页面、全屏或浮动面板、可用宽度不足 760px 时使用原生布局，满足条件后自动恢复交换。
- 在「设置 → 布局交换」点击「检查更新」，可对比本机和 GitHub 正式版本，并下载新版安装包。

## 安装

无新增运行依赖、无构建步骤。使用 DSH 自带的 React 和插件服务：

```sh
# 方式一：预构建 tarball（推荐，无需构建授权）
dsh plugin --profile web add https://github.com/hh5631/dsh-layout-swap/releases/latest/download/dsh-layout-swap.tgz

# 方式二：直接从 GitHub 源码安装
dsh plugin --profile web add github:hh5631/dsh-layout-swap

# 方式三：本地克隆后安装
git clone https://github.com/hh5631/dsh-layout-swap.git
dsh plugin --profile web add link:$PWD/dsh-layout-swap
```

插件通过 `dsh.bundle.patch` 自挂载。若当前服务没有自动发现新 bundle，在方便时重启原来的 DSH Web 服务。无需更改官方安装文件或现有编辑器。

## 限制

DSH 当前没有交换列的公共 API，所以插件局部覆盖布局 CSS，并通过 `data-rightbar-col` 和中心列的 class 后缀识别当前三列结构。识别失败时保持原布局。后续升级 DSH 时应重新确认结构兼容性。拖动及面板宽度依赖实际浏览器排版，静态检查不能代替运行验证。
