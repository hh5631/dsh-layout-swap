window.__ModuleLoader__.load({
  id: "dsh-layout-swap",
  factory: (require) => {
    const React = require("react");
    const { createPortal } = require("react-dom");
    const KEY = "dsh-layout-swap:v1";
    const MIN_CHAT = 360;
    const MIN_WORK = 400;
    const DEFAULT_CHAT = 420;
    const RIGHTBAR = "[data-rightbar-col]";
    const PANEL = "[data-sidebar-right-open], [data-sidebar-right-session], [data-dockkit-float]";
    const BOT_PANEL = "[data-bt-panel]";
    const BOT_SIDEBAR = ".bt-leftcol:not([data-leaving])";
    const BROWSER_CONTROLS = "[data-bt-browser-layout-controls]:not(.bt-panel-ghost *)";

    const css = `
      .dsh-layout-swap-toggle {
        display:inline-flex;align-items:center;justify-content:center;flex:none;
        width:28px;height:28px;padding:4px;border:0;border-radius:6px;
        background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;pointer-events:auto;
      }
      .dsh-layout-swap-toggle:hover {
        background:var(--dsw-alias-interactive-bg-hover);
        color:var(--dsw-alias-label-primary);
      }
      .dsh-layout-swap-toggle[aria-pressed="true"] {
        background:var(--dsw-alias-interactive-bg-hover);
        color:var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary));
      }
      .dsh-layout-swap-toggle:disabled {opacity:.4;cursor:default;background:transparent}
      .dsh-layout-swap-toggle:focus-visible,
      .dsh-layout-swap-divider:focus-visible {outline:2px solid var(--dsw-alias-brand-primary,#6b8afd);outline-offset:-2px}
      [data-dsh-layout-swap="active"] {
        grid-template-columns:var(--dsh-swap-left) minmax(400px,1fr) var(--dsh-swap-chat)!important;
        transition:none!important;
        /* 分隔线是绝对定位的子元素，必须由这一层当定位基准，否则会挂到更外层。 */
        position:relative;
      }
      [data-dsh-layout-swap="active"] > [data-dsh-swap-center] {
        grid-area:1 / 3!important;border-left:1px solid var(--dsw-alias-border-l3);
      }
      [data-dsh-layout-swap="active"][data-dsh-layout-swap-target="bot-browser"] > [data-dsh-swap-center] {
        margin-inline:0!important;
      }
      [data-dsh-layout-swap-browser-open] > [data-dsh-swap-center] {
        transition:none!important;
      }
      [data-dsh-layout-swap-browser] {
        left:var(--dsh-swap-browser-left)!important;
        right:var(--dsh-swap-browser-right)!important;
        bottom:var(--dsh-swap-browser-bottom)!important;
        width:auto!important;
        transition:none!important;
      }
      [data-dsh-layout-swap-browser] > .bt-panel-grip {display:none}
      [data-dsh-layout-swap-browser][data-settling] > :is(.bt-ptabs,.bt-panel-view) {width:100%}
      [data-dsh-layout-swap="active"] > [data-rightbar-col] {grid-area:1 / 2!important}
      [data-dsh-layout-swap="active"] > [data-rightbar-col] [data-sidebar-right-panel="push"] {
        width:100%!important;--dsh-sidebar-width:100%!important;
      }
      [data-dsh-layout-swap="active"] > [data-side="rightbar"] {display:none!important}
      .dsh-layout-swap-divider {
        /* 以聊天轨道的左缘为定位基准，12px 命中区的中线随轨道移动。 */
        display:none;position:absolute;grid-column:3;top:0;bottom:0;width:12px;left:-6px;
        z-index:19;
        cursor:col-resize;touch-action:none;background:transparent;
        transition:background-color 120ms ease-out;
      }
      [data-dsh-layout-swap="active"] > .dsh-layout-swap-divider {display:block}
      [data-dsh-layout-swap-target="bot-browser"] > .dsh-layout-swap-divider {z-index:41}
      @media (pointer:coarse) {
        .dsh-layout-swap-divider {width:24px;left:-12px}
      }
      /* 中线只在 hover / 拖动 / 键盘聚焦时出现，静置时不占视觉。 */
      .dsh-layout-swap-divider::after {
        content:"";position:absolute;top:0;bottom:0;left:50%;width:2px;
        transform:translateX(-50%) scaleY(0);transform-origin:center;
        border-radius:1px;background:var(--dsw-alias-brand-primary,#6b8afd);
        opacity:0;transition:opacity 120ms ease-out,transform 140ms cubic-bezier(.16,1,.3,1);
      }
      .dsh-layout-swap-divider:hover {background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6b8afd) 12%,transparent)}
      .dsh-layout-swap-divider:hover::after,
      .dsh-layout-swap-divider:focus-visible::after {opacity:.55;transform:translateX(-50%) scaleY(1)}
      [data-dsh-layout-swap-dragging] .dsh-layout-swap-divider {background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6b8afd) 16%,transparent)}
      [data-dsh-layout-swap-dragging] .dsh-layout-swap-divider::after {opacity:1;transform:translateX(-50%) scaleY(1)}
      /* 拖动期间两条过渡都禁用：反馈必须是「立刻在」，不能追着指针做淡入。 */
      [data-dsh-layout-swap-dragging] .dsh-layout-swap-divider,
      [data-dsh-layout-swap-dragging] .dsh-layout-swap-divider::after {transition:none}
      [data-dsh-layout-swap-dragging] {cursor:col-resize;user-select:none}
      [data-dsh-layout-swap-dragging] iframe {pointer-events:none!important}
      /* 双击重置 / 键盘微调后的落定提示：中线短暂亮一档再退回，告诉用户"宽度已归位"。
         只在一次性动作里挂 220ms，与不拖动的静置态无关。 */
      [data-dsh-layout-swap-settling] .dsh-layout-swap-divider::after {
        opacity:.85;transform:translateX(-50%) scaleY(1);
      }
      @media (prefers-reduced-motion:reduce) {
        .dsh-layout-swap-divider,
        .dsh-layout-swap-divider::after {transition:none}
      }
      /* 减少动态效果下同样保留落定提示，只是不做渐变。 */
      [data-dsh-layout-swap-settling] .dsh-layout-swap-divider::after {transition:none}
    `;

    function readPreference() {
      try {
        const value = JSON.parse(localStorage.getItem(KEY));
        return {
          enabled: typeof value?.enabled === "boolean" ? value.enabled : true,
          chatWidth: Number.isFinite(value?.chatWidth)
            ? Math.max(MIN_CHAT, Math.min(720, value.chatWidth)) : DEFAULT_CHAT,
        };
      } catch { return { enabled: true, chatWidth: DEFAULT_CHAT }; }
    }

    function createController(ctx) {
      let preference = readPreference();
      let frame;
      let center;
      let rightbar;
      let divider;
      let resizeObserver;
      // 对话列的尺寸观察器：只看它的 margin 间隙变了没有。
      let gapObserver;
      let layoutObserver;
      let animation;
      let disposed = false;
      let drag;
      let settleTimer = 0;
      let available = 0;
      // 上一次看到的对话列 margin-right 间隙，用来判断面板是否真的开了 / 关。
      let observedGap = 0;
      let browser = { target: null, available: false };
      let dock;
      let botSidebar;
      const listeners = new Set();
      const notify = () => { for (const listener of listeners) listener(); };
      const save = () => {
        try { localStorage.setItem(KEY, JSON.stringify(preference)); }
        catch { /* 存储被禁用时仍允许本次页面使用。 */ }
      };
      const variables = new Map();
      const setVariable = (name, value) => {
        // 逐值记缓存：拖动时同一像素宽度会重复到来，省掉一次 style 写入与合成。
        if (variables.get(name) === value) return;
        variables.set(name, value);
        frame.style.setProperty(name, value);
      };
      const browserProperties = ["--dsh-swap-browser-left", "--dsh-swap-browser-right", "--dsh-swap-browser-bottom"];
      function placeBrowser(panel, left, right, bottom) {
        if (dock && dock !== panel) {
          dock.removeAttribute("data-dsh-layout-swap-browser");
          for (const name of browserProperties) dock.style.removeProperty(name);
        }
        dock = panel;
        if (!dock) return;
        const positions = [left, right, bottom];
        browserProperties.forEach((name, index) => {
          const value = `${positions[index]}px`;
          if (dock.style.getPropertyValue(name) !== value) dock.style.setProperty(name, value);
        });
        if (!dock.hasAttribute("data-dsh-layout-swap-browser")) dock.setAttribute("data-dsh-layout-swap-browser", "");
      }
      function publishBrowser(target, available) {
        if (browser.target === target && browser.available === available) return;
        browser = { target, available };
        notify();
      }
      function applyChatWidth(width, panelGap) {
        setVariable("--dsh-swap-chat", `${width + panelGap}px`);
        if (dock) dock.style.setProperty("--dsh-swap-browser-right", `${browserRight + width}px`);
        divider.setAttribute("aria-valuenow", String(width));
      }
      const endDrag = () => {
        if (!drag) return;
        const old = drag;
        drag = undefined;
        // 宽度只在松手时并回 preference 并落盘：拖动中一次 IO 都不做。
        preference = { ...preference, chatWidth: old.chatWidth };
        frame?.removeAttribute("data-dsh-layout-swap-dragging");
        if (divider?.hasPointerCapture(old.pointerId)) divider.releasePointerCapture(old.pointerId);
        save();
        // 松手后跑一次完整 update，补齐拖动快路径跳过的那几项派生状态。
        schedule();
      };
      // 夹取只算一次，拖动路径与落盘路径共用，避免两处上下界不一致。
      // 对话列被另写的 margin-right（DS Bot 的右侧面板用它的宽度把内容挤开）。读不到
      // 就是 0：没有面板时这条半径不该改变任何布局。
      const readPanelGap = (column) => {
        if (!column) return 0;
        const raw = getComputedStyle(column).marginRight;
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
      };
      let browserRight = 0;
      const maxChat = (panelGap) => Math.max(MIN_CHAT, Math.min(720, available - MIN_WORK - panelGap));
      const clampChat = (value, panelGap = observedGap) => Math.round(Math.max(MIN_CHAT, Math.min(maxChat(panelGap), value)));
      // 拖动热路径：只改 drag 上的局部值 + 请求一帧，不 new 对象、不碰 preference / localStorage。
      const dragTo = (value) => {
        if (!drag) return;
        const next = clampChat(value, drag.panelGap);
        if (drag.chatWidth === next) return;
        drag.chatWidth = next;
        schedule(false);
      };
      const setChatWidth = (value) => {
        preference = { ...preference, chatWidth: clampChat(value) };
        schedule();
      };
      function detachFrame() {
        endDrag();
        placeBrowser(null);
        publishBrowser(null, false);
        if (settleTimer) { clearTimeout(settleTimer); settleTimer = 0; }
        frame?.removeAttribute("data-dsh-layout-swap-settling");
        resizeObserver?.disconnect();
        gapObserver?.disconnect();
        layoutObserver?.disconnect();
        gapObserver = undefined;
        divider?.remove();
        center?.removeAttribute("data-dsh-swap-center");
        frame?.removeAttribute("data-dsh-layout-swap");
        frame?.removeAttribute("data-dsh-layout-swap-target");
        frame?.removeAttribute("data-dsh-layout-swap-browser-open");
        for (const name of ["--dsh-swap-left", "--dsh-swap-chat"]) frame?.style.removeProperty(name);
        botSidebar = undefined;
        variables.clear();
        observedGap = 0;
        frame = center = rightbar = divider = undefined;
      }
      function attachFrame(nextRightbar) {
        detachFrame();
        rightbar = nextRightbar;
        frame = rightbar.parentElement;
        // 当前 DSH 没有交换列的公共 API，只标记已知结构，不移动 React 的节点。
        center = Array.from(frame.children).find((el) =>
          Array.from(el.classList).some((name) => name.endsWith("_centerCol")));
        if (!center || !frame.style.gridTemplateColumns) { detachFrame(); return; }
        center.setAttribute("data-dsh-swap-center", "");
        divider = document.createElement("div");
        divider.className = "dsh-layout-swap-divider";
        divider.tabIndex = 0;
        divider.setAttribute("role", "separator");
        divider.setAttribute("aria-orientation", "vertical");
        divider.setAttribute("aria-label", "调整聊天侧栏宽度");
        divider.title = "拖动调整聊天宽度；双击恢复默认；方向键微调";
        divider.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || drag) return;
          event.preventDefault();
          const width = center.getBoundingClientRect().width;
          const panelGap = observedGap;
          drag = {
            pointerId: event.pointerId, x: event.clientX,
            width, chatWidth: clampChat(width, panelGap), panelGap,
          };
          divider.setPointerCapture(event.pointerId);
          frame.setAttribute("data-dsh-layout-swap-dragging", "");
        });
        divider.addEventListener("pointermove", (event) => {
          // 合流到下一帧：一次拖动里高频 pointermove 只更新 drag 的局部值并排一帧，
          // 不改 preference、不落盘、不 new 对象；样式写入集中在 update() 里一次完成。
          if (drag?.pointerId === event.pointerId) dragTo(drag.width + drag.x - event.clientX);
        });
        divider.addEventListener("pointerup", (event) => {
          if (drag?.pointerId !== event.pointerId) return;
          dragTo(drag.width + drag.x - event.clientX);
          endDrag();
        });
        const stopPointer = (event) => { if (drag?.pointerId === event.pointerId) endDrag(); };
        divider.addEventListener("pointercancel", stopPointer);
        divider.addEventListener("lostpointercapture", stopPointer);
        // 双击重置 / 键盘微调的落定提示：中线亮一档再退回，告诉用户「宽度已归位」。
        // 之前这两个一次性动作完全没有反馈 —— 拖到 600px 后双击，唯一的变化是列宽数字，
        // 视线在分隔线上时读不出「刚刚发生了什么」。
        const flashSettle = () => {
          frame.setAttribute("data-dsh-layout-swap-settling", "");
          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            settleTimer = 0;
            frame?.removeAttribute("data-dsh-layout-swap-settling");
          }, 220);
        };
        divider.addEventListener("dblclick", () => { setChatWidth(DEFAULT_CHAT); save(); flashSettle(); });
        divider.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 48 : 16;
          const width = center.getBoundingClientRect().width;
          setChatWidth(event.key === "Home" ? MIN_CHAT : event.key === "End" ? 720
            : width + (event.key === "ArrowLeft" ? step : -step));
          save(); flashSettle();
        });
        frame.appendChild(divider);
        resizeObserver = new ResizeObserver(() => schedule());
        resizeObserver.observe(frame);
        // DS Bot 的面板把 margin-right 写进一条样式表规则，不改元素的 style 属性，
        // 所以 MutationObserver 看不到它；能观测到的是对话列自己的尺寸随之改变。
        // 观察它的内容盒，面板一开一关就会重新计算一次轨道宽度。
        //
        // update() 自己也会改这条轨道，尺寸因此还会再报一次。这里只在间隙真的变了
        // 时才算「布局变了」，否则那次回调直接丢弃 —— 否则两边互相触发会空转。
        gapObserver = new ResizeObserver(() => {
          if (readPanelGap(center) !== observedGap) schedule();
        });
        gapObserver.observe(center);
        layoutObserver = new MutationObserver((records) => {
          if (records.some(({ target, type, attributeName, addedNodes, removedNodes }) => {
            if (type === "attributes") {
              if (target === frame) return target.style.gridTemplateColumns !== hostTracks
                || target.hasAttribute("data-rightbar-fullscreen") !== fullscreen;
              return attributeName !== "hidden" || target === rightbar || target.matches?.(PANEL);
            }
            return target === frame || [...addedNodes, ...removedNodes].some((node) =>
              node.nodeType === 1 && (node.matches(PANEL) || node.querySelector(PANEL)));
          })) schedule();
        });
        layoutObserver.observe(frame, { childList: true, attributes: true, attributeFilter: ["style", "data-rightbar-fullscreen"] });
        layoutObserver.observe(rightbar, {
          subtree: true, childList: true, attributes: true,
          attributeFilter: ["hidden", "data-sidebar-right-open", "data-dockkit-float"],
        });
      }
      let hostTracks = "";
      let fullscreen = false;
      let needsLayout = false;
      function update() {
        animation = undefined;
        if (disposed) return;
        const full = needsLayout;
        needsLayout = false;
        // 拖动快路径：指针只改聊天列宽，这两根轨道之外的东西都没变，跳过
        // querySelectorAll / getBoundingClientRect / panelInfo 快照，避免每次
        // pointermove 都强制一次布局。
        if (!full && drag && frame?.isConnected) {
          applyChatWidth(drag.chatWidth, drag.panelGap);
          return;
        }
        if (!frame?.isConnected || !rightbar?.isConnected || !center?.isConnected) {
          const element = document.querySelector(RIGHTBAR);
          if (!element) { detachFrame(); return; }
          attachFrame(element);
        }
        if (!frame) return;
        // 读取宿主写入的原始列偏好；原生侧栏拖动、收起仍归宿主管理。
        hostTracks = frame.style.gridTemplateColumns;
        fullscreen = frame.hasAttribute("data-rightbar-fullscreen");
        const firstTrack = hostTracks.match(/^([\d.]+)px\s/);
        const hostLeft = firstTrack ? Number(firstTrack[1]) : NaN;
        const frameBox = frame.getBoundingClientRect();
        const visible = (element) => !element.closest("[hidden]");
        const panel = Array.from(rightbar.querySelectorAll("[data-sidebar-right-open]")).find(visible);
        const botPanel = document.querySelector(`${BOT_PANEL}:not([data-leaving])`);
        const controls = botPanel?.querySelector(BROWSER_CONTROLS) ?? null;
        const nextSidebar = controls && document.querySelector(BOT_SIDEBAR);
        if (nextSidebar !== botSidebar) {
          if (botSidebar) resizeObserver.unobserve(botSidebar);
          botSidebar = nextSidebar;
          if (botSidebar) resizeObserver.observe(botSidebar);
        }
        const browserLeft = Math.max(hostLeft, botSidebar?.offsetWidth ?? 0);
        const browserSpace = frameBox.width - browserLeft;
        const canSwap = Number.isFinite(hostLeft) && !fullscreen
          && ctx.layout.panelInfo.getSnapshot().activePanelId === null
          && !Array.from(rightbar.querySelectorAll("[data-dockkit-float]")).some(visible);
        const browserAvailable = controls !== null && canSwap && !panel && !botPanel.hasAttribute("data-overlay")
          && browserSpace >= MIN_CHAT + MIN_WORK;
        const useBrowser = preference.enabled && browserAvailable;
        const leftWidth = useBrowser ? browserLeft : hostLeft;
        available = frameBox.width - leftWidth;
        const panelGap = useBrowser ? 0 : readPanelGap(center);
        observedGap = panelGap;
        const active = useBrowser || (preference.enabled && canSwap && !!panel && available >= MIN_CHAT + MIN_WORK + panelGap);
        if (!active) endDrag();
        const width = clampChat(drag?.chatWidth ?? preference.chatWidth);
        if (drag) {
          drag.chatWidth = width;
          drag.panelGap = panelGap;
        }
        browserRight = Math.max(0, window.innerWidth - frameBox.right);
        const bottom = useBrowser ? Math.max(0, window.innerHeight - center.getBoundingClientRect().bottom) : 0;
        placeBrowser(useBrowser ? botPanel : null, frameBox.left + leftWidth, browserRight + width, bottom);
        setVariable("--dsh-swap-left", `${leftWidth || 0}px`);
        applyChatWidth(width, panelGap);
        frame.toggleAttribute("data-dsh-layout-swap-browser-open", controls !== null);
        if (useBrowser) frame.setAttribute("data-dsh-layout-swap-target", "bot-browser");
        else frame.removeAttribute("data-dsh-layout-swap-target");
        const state = active ? "active" : "idle";
        if (frame.getAttribute("data-dsh-layout-swap") !== state) frame.setAttribute("data-dsh-layout-swap", state);
        divider.setAttribute("aria-valuemin", String(MIN_CHAT));
        divider.setAttribute("aria-valuemax", String(maxChat(panelGap)));
        publishBrowser(controls, browserAvailable);
      }
      function schedule(full = true) {
        if (full) needsLayout = true;
        if (!disposed && animation === undefined) animation = requestAnimationFrame(update);
      }
      // Bot 面板通过 portal 挂在 body。只为面板、导航栏或控件挂载位的变化更新布局。
      const mutations = new MutationObserver((records) => {
        if (!frame?.isConnected) { schedule(); return; }
        if (records.some(({ target, type, addedNodes, removedNodes }) => {
          if (type === "attributes") return target.matches(BOT_PANEL) || target === botSidebar;
          if (target === document.body) return [...addedNodes, ...removedNodes].some(node =>
            node.nodeType === 1 && node.matches(`${BOT_PANEL},.bt-leftcol`));
          return target.closest?.(BOT_PANEL) && [...addedNodes, ...removedNodes].some(node =>
            node.nodeType === 1 && (node.matches(BROWSER_CONTROLS) || node.querySelector(BROWSER_CONTROLS)));
        })) schedule();
      });
      mutations.observe(document.body, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["data-overlay", "data-leaving", "data-left"],
      });
      const unsubscribe = ctx.layout.panelInfo.subscribe(() => schedule());
      const onStorage = (event) => {
        if (event.key !== KEY && event.key !== null) return;
        preference = readPreference(); notify(); schedule();
      };
      window.addEventListener("storage", onStorage);
      schedule();
      return {
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        getSnapshot: () => preference.enabled,
        getBrowserSnapshot: () => browser,
        toggle(fromBrowser = false) {
          preference = { ...preference, enabled: !preference.enabled };
          if (!fromBrowser && preference.enabled && ctx.sidebarRight.mounted.getSnapshot() !== undefined
            && !ctx.sidebarRight.isExpanded()) ctx.sidebarRight.toggleExpanded();
          save(); notify(); schedule();
        },
        dispose() {
          disposed = true;
          if (animation !== undefined) cancelAnimationFrame(animation);
          mutations.disconnect(); unsubscribe();
          window.removeEventListener("storage", onStorage);
          detachFrame(); listeners.clear();
        },
      };
    }

    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement("style");
        style.dataset.pluginCss = "dsh-layout-swap";
        style.textContent = css;
        document.head.appendChild(style);
        const controller = createController(ctx);
        function Toggle({ inBrowser = false, available = true } = {}) {
          const enabled = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
          const english = document.documentElement.lang.toLowerCase().startsWith("en");
          const label = inBrowser
            ? english ? "Swap browser and chat" : "交换浏览器与聊天"
            : english ? "Swap workspace and chat" : "交换工作区与聊天";
          const hint = !available
            ? english ? "Widen the window to swap panels" : "扩大窗口后可交换布局"
            : enabled
              ? english ? "Restore the original layout" : "恢复原始布局"
              : label;
          return React.createElement("button", {
            type: "button", className: "dsh-layout-swap-toggle",
            "aria-label": label, "aria-pressed": enabled && available,
            title: hint, disabled: !available,
            onClick: () => controller.toggle(inBrowser),
          }, React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
            React.createElement("path", { d: "M5 8h14m-3.5-3.5L19 8l-3.5 3.5M19 16H5m3.5-3.5L5 16l3.5 3.5", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" })));
        }
        function HeaderToggle() {
          const { target } = React.useSyncExternalStore(controller.subscribe, controller.getBrowserSnapshot);
          return target ? null : React.createElement(Toggle);
        }
        function BrowserToggle() {
          const { target, available } = React.useSyncExternalStore(controller.subscribe, controller.getBrowserSnapshot);
          return target ? createPortal(React.createElement(Toggle, { inBrowser: true, available }), target) : null;
        }
        // utilities 是 list 槽位；不占用原生展开按钮的 single corner 槽位。
        const headerSlots = ["conversation.session.header.utilities", "dsh-bot.header.utilities"];
        const unregisterHeaders = headerSlots.map(name => ctx.slots.inject(name, () => ctx.slots.register({
          name, id: "dsh-layout-swap", order: 90,
        }, HeaderToggle)));
        const unregisterBrowser = ctx.slots.inject("shell.overlay", () => ctx.slots.register({
          name: "shell.overlay", id: "dsh-layout-swap-browser", order: 51,
        }, BrowserToggle));
        return () => { unregisterBrowser(); unregisterHeaders.forEach(off => off()); controller.dispose(); style.remove(); };
      }, "dsh-layout-swap: presentation and controls");
    }
    return { apply, inject: ["slots", "layout", "sidebarRight"] };
  },
});
