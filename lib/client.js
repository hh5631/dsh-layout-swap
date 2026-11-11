window.__ModuleLoader__.load({
  id: "dsh-layout-swap",
  factory: (require) => {
    const React = require("react");
    const KEY = "dsh-layout-swap:v1";
    const MIN_CHAT = 360;
    const MIN_WORK = 400;
    const DEFAULT_CHAT = 420;

    const css = `
      .dsh-layout-swap-settings {max-width:640px;padding:24px;line-height:1.6}
      .dsh-layout-swap-settings h2 {margin:0 0 12px;font-size:1.25em}
      .dsh-layout-swap-update-row {display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}
      .dsh-layout-swap-update-row [role="status"] {flex:1 1 220px;color:var(--dsw-alias-label-secondary)}
      .dsh-layout-swap-update-row button {border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm,4px);padding:5px 10px;background:transparent;color:inherit;font:inherit;cursor:pointer}
      .dsh-layout-swap-update-row button:hover:not(:disabled) {background:var(--dsw-alias-interactive-bg-hover)}
      .dsh-layout-swap-update-row button:disabled {opacity:.55;cursor:default}
      .dsh-layout-swap-update-links {display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
      .dsh-layout-swap-toggle {
        display:inline-flex;align-items:center;justify-content:center;flex:none;
        width:28px;height:28px;padding:4px;border:0;border-radius:6px;
        background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;
      }
      .dsh-layout-swap-toggle:hover,
      .dsh-layout-swap-toggle[aria-pressed="true"] {
        background:var(--dsw-alias-interactive-bg-hover);
        color:var(--dsw-alias-label-primary);
      }
      .dsh-layout-swap-toggle:focus-visible,
      .dsh-layout-swap-divider:focus-visible {outline:2px solid #6b8afd;outline-offset:-2px}
      [data-dsh-layout-swap="active"] {
        grid-template-columns:var(--dsh-swap-left) minmax(400px,1fr) var(--dsh-swap-chat)!important;
        transition:none!important;
      }
      [data-dsh-layout-swap="active"] > [data-dsh-swap-center] {
        grid-area:1 / 3!important;border-left:1px solid var(--dsw-alias-border-l3);
      }
      [data-dsh-layout-swap="active"] > [data-rightbar-col] {grid-area:1 / 2!important}
      [data-dsh-layout-swap="active"] > [data-rightbar-col] [data-sidebar-right-panel="push"] {
        width:100%!important;--dsh-sidebar-width:100%!important;
      }
      [data-dsh-layout-swap="active"] > [data-side="rightbar"] {display:none!important}
      .dsh-layout-swap-divider {
        display:none;position:absolute;top:0;bottom:0;width:8px;
        right:calc(var(--dsh-swap-chat) - 4px);z-index:19;
        cursor:col-resize;touch-action:none;background:transparent;
      }
      [data-dsh-layout-swap="active"] > .dsh-layout-swap-divider {display:block}
      .dsh-layout-swap-divider:hover {background:color-mix(in srgb,#6b8afd 20%,transparent)}
      [data-dsh-layout-swap-dragging] {cursor:col-resize;user-select:none}
      [data-dsh-layout-swap-dragging] iframe {pointer-events:none!important}
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
      let animation;
      let disposed = false;
      let drag;
      let available = 0;
      const listeners = new Set();
      const notify = () => { for (const listener of listeners) listener(); };
      const save = () => {
        try { localStorage.setItem(KEY, JSON.stringify(preference)); }
        catch { /* 存储被禁用时仍允许本次页面使用。 */ }
      };
      const setVariable = (name, value) => {
        if (frame.style.getPropertyValue(name) !== value) frame.style.setProperty(name, value);
      };
      const endDrag = () => {
        if (!drag) return;
        const old = drag;
        drag = undefined;
        frame?.removeAttribute("data-dsh-layout-swap-dragging");
        if (divider?.hasPointerCapture(old.pointerId)) divider.releasePointerCapture(old.pointerId);
        save();
      };
      const setChatWidth = (value) => {
        preference = { ...preference, chatWidth: Math.max(MIN_CHAT, Math.min(720, available - MIN_WORK, value)) };
        schedule();
      };
      function detachFrame() {
        endDrag();
        resizeObserver?.disconnect();
        divider?.remove();
        center?.removeAttribute("data-dsh-swap-center");
        frame?.removeAttribute("data-dsh-layout-swap");
        for (const name of ["--dsh-swap-left", "--dsh-swap-chat"]) frame?.style.removeProperty(name);
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
          if (event.button !== 0) return;
          event.preventDefault();
          drag = { pointerId: event.pointerId, x: event.clientX, width: center.getBoundingClientRect().width };
          divider.setPointerCapture(event.pointerId);
          frame.setAttribute("data-dsh-layout-swap-dragging", "");
        });
        divider.addEventListener("pointermove", (event) => {
          if (drag?.pointerId === event.pointerId) setChatWidth(drag.width + drag.x - event.clientX);
        });
        divider.addEventListener("pointerup", (event) => {
          if (drag?.pointerId !== event.pointerId) return;
          setChatWidth(drag.width + drag.x - event.clientX);
          endDrag();
        });
        divider.addEventListener("pointercancel", endDrag);
        divider.addEventListener("lostpointercapture", endDrag);
        divider.addEventListener("dblclick", () => { setChatWidth(DEFAULT_CHAT); save(); });
        divider.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 48 : 16;
          const width = center.getBoundingClientRect().width;
          setChatWidth(event.key === "Home" ? MIN_CHAT : event.key === "End" ? 720
            : width + (event.key === "ArrowLeft" ? step : -step));
          save();
        });
        frame.appendChild(divider);
        resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(frame);
      }
      function update() {
        animation = undefined;
        if (disposed) return;
        if (!frame?.isConnected) {
          const element = document.querySelector("[data-rightbar-col]");
          if (!element) { detachFrame(); return; }
          attachFrame(element);
        }
        if (!frame) return;
        // 读取宿主写入的原始列偏好；原生侧栏拖动、收起仍归宿主管理。
        const firstTrack = frame.style.gridTemplateColumns.match(/^([\d.]+)px\s/);
        const leftWidth = firstTrack ? Number(firstTrack[1]) : NaN;
        available = Number.isFinite(leftWidth) ? frame.getBoundingClientRect().width - leftWidth : 0;
        const visible = (element) => !element.closest("[hidden]");
        const panel = Array.from(rightbar.querySelectorAll("[data-sidebar-right-open]")).find(visible);
        const active = preference.enabled && Number.isFinite(leftWidth)
          && available >= MIN_CHAT + MIN_WORK
          && !frame.hasAttribute("data-rightbar-collapsed")
          && !frame.hasAttribute("data-rightbar-fullscreen")
          && ctx.layout.panelInfo.getSnapshot().activePanelId === null
          && !!panel
          && !Array.from(rightbar.querySelectorAll("[data-dockkit-float]")).some(visible);
        if (!active) endDrag();
        const width = Math.round(Math.max(MIN_CHAT, Math.min(preference.chatWidth, available - MIN_WORK)));
        setVariable("--dsh-swap-left", `${leftWidth || 0}px`);
        setVariable("--dsh-swap-chat", `${width}px`);
        const state = active ? "active" : "idle";
        if (frame.getAttribute("data-dsh-layout-swap") !== state) frame.setAttribute("data-dsh-layout-swap", state);
        divider.setAttribute("aria-valuemin", String(MIN_CHAT));
        divider.setAttribute("aria-valuemax", String(Math.max(MIN_CHAT, Math.min(720, available - MIN_WORK))));
        divider.setAttribute("aria-valuenow", String(width));
      }
      function schedule() {
        if (!disposed && animation === undefined) animation = requestAnimationFrame(update);
      }
      const mutations = new MutationObserver((records) => {
        // 忽略流式聊天、光标和编辑器内容更新，避免每个 token 都重算布局。
        if (!frame?.isConnected || records.some(({ target, type }) =>
          target === frame || (rightbar?.contains(target)
            && (type === "childList" || target.hasAttribute?.("data-sidebar-right-panel")
              || target.hasAttribute?.("data-sidebar-right-session"))))) schedule();
      });
      mutations.observe(document.body, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["style", "hidden", "data-rightbar-collapsed", "data-rightbar-fullscreen", "data-sidebar-right-open"],
      });
      const unsubscribe = ctx.layout.panelInfo.subscribe(schedule);
      const onStorage = (event) => {
        if (event.key !== KEY && event.key !== null) return;
        preference = readPreference(); notify(); schedule();
      };
      window.addEventListener("storage", onStorage);
      schedule();
      return {
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        getSnapshot: () => preference.enabled,
        toggle() {
          preference = { ...preference, enabled: !preference.enabled };
          if (preference.enabled && ctx.sidebarRight.mounted.getSnapshot() !== undefined
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

    function UpdateSettings() {
      const [checking, setChecking] = React.useState(false);
      const [result, setResult] = React.useState(null);
      const request = React.useRef(null);
      React.useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

      async function check() {
        if (request.current) return;
        const controller = new AbortController();
        request.current = controller;
        const timer = setTimeout(() => controller.abort(), 12000);
        setChecking(true);
        setResult(null);
        try {
          const response = await fetch(new URL('api/dsh-layout-swap/update-check', document.baseURI), {
            credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          });
          if (!response.ok) throw new Error('Update endpoint unavailable');
          const data = await response.json();
          if (typeof data?.ok !== 'boolean') throw new Error('Invalid update response');
          if (request.current === controller) setResult(data);
        } catch {
          if (request.current === controller) setResult({ ok: false, error: '检查失败，请稍后重试，或打开 GitHub 发行页。' });
        } finally {
          clearTimeout(timer);
          if (request.current === controller) { request.current = null; setChecking(false); }
        }
      }

      const status = result?.status === 'available' ? '发现新版' : result?.status === 'ahead' ? '当前版本较新' : '已是最新版本';
      const message = checking ? '正在检查…' : result?.ok ? `当前 v${result.current} · 最新 v${result.latest} · ${status}`
        : result ? (result.current ? `当前 v${result.current} · ` : '') + result.error : '检查 GitHub 上的正式版本';
      return React.createElement('section', { className: 'dsh-layout-swap-settings' },
        React.createElement('h2', null, '插件更新'),
        React.createElement('div', { className: 'dsh-layout-swap-update-row' },
          React.createElement('span', { role: 'status' }, message),
          React.createElement('button', { type: 'button', disabled: checking, onClick: () => void check() }, '检查更新')),
        result && React.createElement('div', { className: 'dsh-layout-swap-update-links' },
          result.downloadUrl && React.createElement('a', { href: result.downloadUrl, target: '_blank', rel: 'noreferrer' }, '下载安装包'),
          React.createElement('a', { href: result.releaseUrl || 'https://github.com/hh5631/dsh-layout-swap/releases', target: '_blank', rel: 'noreferrer' }, '查看发行页')));
    }

    function apply(ctx) {
      ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: 'dsh-layout-swap', order: 31, label: () => '布局交换',
      }, UpdateSettings)), 'dsh-layout-swap: update settings');
      ctx.effect(() => {
        const style = document.createElement("style");
        style.dataset.pluginCss = "dsh-layout-swap";
        style.textContent = css;
        document.head.appendChild(style);
        const controller = createController(ctx);
        function Toggle() {
          const enabled = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
          const label = enabled ? "恢复原始布局" : "工作区居中，聊天放到右侧";
          return React.createElement("button", {
            type: "button", className: "dsh-layout-swap-toggle",
            "aria-label": label, "aria-pressed": enabled,
            title: `${label}（文件 / 浏览器与聊天交换位置）`,
            onClick: () => controller.toggle(),
          }, React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
            React.createElement("path", { d: "M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" })));
        }
        // utilities 是 list 槽位；不占用原生展开按钮的 single corner 槽位。
        const unregister = ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
          name: "conversation.session.header.utilities", id: "dsh-layout-swap", order: 90,
        }, Toggle));
        return () => { unregister(); controller.dispose(); style.remove(); };
      }, "dsh-layout-swap: presentation and controls");
    }
    return { apply, inject: ["slots", "layout", "sidebarRight"] };
  },
});
