/* Geometry, in relation. Shared lifecycle; every page owns its scene factory. */
(() => {
  "use strict";
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };
  function rng(seed) {
    let s = seed >>> 0;
    return (a = 0, b = 1) => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return a + (s / 4294967296) * (b - a);
    };
  }
  function hash(seed, path) {
    let h = seed >>> 0;
    for (const ch of String(path)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function inPoly(x, y, points) {
    let hit = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i],
        b = points[j];
      if (
        a.y > y !== b.y > y &&
        x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
      )
        hit = !hit;
    }
    return hit;
  }
  function mount(meta, factory) {
    const frame = document.querySelector(".canvas-frame"),
      notice = document.querySelector("#notice"),
      controls = document.querySelector(".scene-controls");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      params = new URLSearchParams(location.search);
    const raw = params.get("seed");
    const seed =
      raw !== null && /^\d{1,20}$/.test(raw)
        ? Number(BigInt(raw) % 4294967296n)
        : meta.seed;
    let scene,
      p5instance,
      ctx,
      paused = params.get("still") === "1",
      time = Number(params.get("t") ?? meta.time ?? 0),
      last = 0,
      inView = true,
      disposed = false,
      observer,
      resizeObserver,
      resizeRequest,
      buffer,
      resources = [];
    if (!Number.isFinite(time) || time < 0 || time > 86400)
      time = meta.time || 0;
    const startedTime = time;
    let visits = 0,
      frameTimes = [],
      listeners = [];
    const listen = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      listeners.push(() => target.removeEventListener(type, fn, options));
    };
    function fail(message) {
      notice.textContent =
        message ||
        "目前顯示這件作品的策展停格。互動畫布無法啟動，您仍可閱讀與瀏覽其他作品。";
      frame.dataset.ready = "false";
      document
        .querySelectorAll(".work-tools button")
        .forEach((b) => (b.disabled = true));
    }
    if (typeof p5 !== "function") {
      fail();
      return;
    }
    try {
      if (!document.createElement("canvas").getContext("2d")) {
        fail("目前顯示策展停格；此瀏覽器無法建立作品畫布。");
        return;
      }
    } catch (_) {
      fail("目前顯示策展停格；此瀏覽器無法建立作品畫布。");
      return;
    }
    function wake() {
      if (disposed || document.hidden || !inView) return;
      if (!p5instance.isLooping()) last = performance.now();
      if (!paused && !reduced.matches && scene?.active?.()) p5instance.loop();
      else p5instance.redraw();
    }
    function instant() {
      return paused || reduced.matches;
    }
    function syncControls() {
      for (const c of scene?.controls || []) {
        const el = document.getElementById("control-" + c.id);
        if (c.kind === "readout") {
          document.getElementById("readout-" + c.id).textContent = c.readout();
          continue;
        }
        if (!el) continue;
        const value = typeof c.value === "function" ? c.value() : c.value;
        if (value !== undefined && document.activeElement !== el)
          el.value = String(value);
        if (c.readout)
          document.getElementById("readout-" + c.id).textContent = c.readout();
      }
    }
    function bindControls() {
      controls.replaceChildren();
      for (const c of scene.controls || []) {
        const id = "control-" + c.id;
        if (c.kind === "readout") {
          const r = document.createElement("p");
          r.className = "readout";
          r.id = "readout-" + c.id;
          r.textContent = c.readout();
          controls.append(r);
          continue;
        }
        if (c.kind === "button") {
          const b = document.createElement("button");
          b.id = id;
          b.type = "button";
          b.textContent = c.label;
          b.onclick = () => {
            c.change();
            syncControls();
            stateUrl();
            wake();
          };
          controls.append(b);
          continue;
        }
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = c.label;
        controls.append(label);
        let el;
        if (c.kind === "range") {
          el = document.createElement("input");
          el.type = "range";
          el.min = c.min ?? 0;
          el.max = c.max ?? 1;
          el.step = c.step ?? 0.01;
        } else {
          el = document.createElement("select");
          for (const item of c.options) {
            const o = document.createElement("option");
            o.value = item[0];
            o.textContent = item[1];
            el.append(o);
          }
        }
        el.id = id;
        el.value = typeof c.value === "function" ? c.value() : c.value;
        el.addEventListener("input", () => {
          c.change(el.type === "range" ? Number(el.value) : el.value);
          syncControls();
          stateUrl();
          wake();
        });
        controls.append(el);
        if (c.readout) {
          const r = document.createElement("div");
          r.className = "readout";
          r.id = "readout-" + c.id;
          r.textContent = c.readout();
          controls.append(r);
        }
      }
    }
    function stateUrl() {
      try {
        const url = new URL(location.href);
        url.searchParams.set("seed", seed);
        for (const [key, value] of Object.entries(scene?.url?.() || {})) {
          if (value === null) url.searchParams.delete(key);
          else url.searchParams.set(key, String(value));
        }
        history.replaceState(null, "", url);
      } catch (_) {}
    }
    function build(p, saved) {
      p.noLoop();
      const width = Math.max(1, Math.round(frame.clientWidth)),
        height = Math.max(1, Math.round(frame.clientHeight));
      p.resizeCanvas(width, height, true);
      scene?.dispose?.();
      for (const layer of resources) layer.remove();
      resources = [];
      buffer?.remove();
      const mobile = matchMedia("(max-width:760px)").matches,
        designW = 1000,
        designH = mobile ? 1100 : 700;
      buffer = p.createGraphics(designW, designH);
      buffer.pixelDensity(1);
      p.randomSeed(seed);
      p.noiseSeed(seed);
      ctx = {
        p,
        seed,
        meta,
        W: designW,
        H: designH,
        mobile,
        frame: { x: 70, y: 65, w: 860, h: designH - 130 },
        rng: rng(seed),
        clamp,
        lerp,
        ease,
        hash,
        inPoly,
        instant,
        wake,
        params,
        get time() {
          return time;
        },
        get reduced() {
          return reduced.matches;
        },
        layer() {
          const layer = p.createGraphics(designW, designH);
          layer.pixelDensity(1);
          resources.push(layer);
          return layer;
        },
      };
      scene = factory(ctx, saved);
      bindControls();
      last = performance.now();
      frameTimes = [];
      frame.dataset.seed = String(seed);
      frame.dataset.ready = "false";
      document.getElementById("seed").textContent = String(seed);
      if (!document.hidden && inView) {
        p.loop();
      }
    }
    p5instance = new p5((p) => {
      p.setup = () => {
        try {
          p.pixelDensity(Math.min(devicePixelRatio || 1, 2));
          const canvas = p.createCanvas(1, 1);
          canvas.parent(frame);
          canvas.elt.tabIndex = 0;
          canvas.elt.setAttribute("role", "img");
          canvas.elt.setAttribute("aria-label", meta.alt + " " + meta.keys);
          p.frameRate(60);
          build(p);
        } catch (error) {
          fail("目前顯示策展停格，因為此瀏覽器無法建立作品畫布。");
          p.noLoop();
        }
      };
      p.draw = () => {
        if (disposed || document.hidden || !inView || !scene) return;
        const now = performance.now(),
          dt = clamp((now - last) / 1000, 0, 0.05);
        last = now;
        if (!instant()) {
          time += dt;
          scene.update?.(dt, time);
        }
        scene.paint(buffer);
        p.image(buffer, 0, 0, p.width, p.height);
        frame.dataset.ready = "true";
        frame.dataset.time = time.toFixed(4);
        frame.dataset.state = JSON.stringify(scene.snapshot?.() || {});
        frame.dataset.frames = String(++visits);
        frameTimes.push(now);
        if (frameTimes.length > 120) frameTimes.shift();
        if (frameTimes.length > 30)
          frame.dataset.fps = (
            ((frameTimes.length - 1) * 1000) /
            (now - frameTimes[0])
          ).toFixed(1);
        syncControls();
        if (instant() || !scene.active?.()) p.noLoop();
      };
    }, frame);
    const getPoint = (e) => {
      const b = frame.getBoundingClientRect();
      return {
        x: ((e.clientX - b.left) / b.width) * ctx.W,
        y: ((e.clientY - b.top) / b.height) * ctx.H,
        pointer: e.pointerType || "mouse",
      };
    };
    let down = null,
      dragging = false;
    listen(frame, "pointerdown", (e) => {
      if (!scene || e.button > 0 || !e.target.classList.contains("p5Canvas"))
        return;
      down = { ...getPoint(e), clientX: e.clientX, clientY: e.clientY };
      dragging = false;
      if (e.pointerType === "mouse" && scene.drag) {
        frame.setPointerCapture(e.pointerId);
        scene.pointer?.("down", down);
        wake();
      }
    });
    listen(frame, "pointermove", (e) => {
      if (!scene) return;
      const point = getPoint(e);
      if (down && e.pointerType === "mouse" && scene.drag) {
        dragging =
          dragging ||
          Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > 5;
        if (dragging) {
          scene.pointer?.("drag", point);
          wake();
        }
      } else if (e.pointerType === "mouse" && !down) {
        if (scene.pointer?.("hover", point) !== false) wake();
      }
    });
    listen(frame, "pointerup", (e) => {
      if (!down || !scene) return;
      if (
        !dragging &&
        Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < 10
      )
        scene.pointer?.("click", getPoint(e));
      else scene.pointer?.("up", getPoint(e));
      down = null;
      dragging = false;
      stateUrl();
      syncControls();
      wake();
    });
    listen(frame, "pointercancel", () => {
      down = null;
      dragging = false;
      if (scene?.pointer?.("leave", {}) !== false) wake();
    });
    listen(frame, "pointerleave", () => {
      if (!down) {
        if (scene?.pointer?.("leave", {}) !== false) wake();
      }
    });
    listen(frame, "keydown", (e) => {
      if (e.target.tagName !== "CANVAS") return;
      if (e.key === " ") {
        e.preventDefault();
        document.getElementById("pause").click();
        return;
      }
      if (scene?.key?.(e.key)) {
        e.preventDefault();
        stateUrl();
        syncControls();
        wake();
      }
    });
    const pause = document.querySelector("#pause");
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "繼續觀看" : "暫停動態";
    listen(pause, "click", () => {
      paused = !paused;
      pause.setAttribute("aria-pressed", String(paused));
      pause.textContent = paused ? "繼續觀看" : "暫停動態";
      if (!paused) scene?.resume?.();
      wake();
    });
    listen(document.querySelector("#reset"), "click", () => {
      time = startedTime;
      paused = params.get("still") === "1";
      pause.setAttribute("aria-pressed", String(paused));
      pause.textContent = paused ? "繼續觀看" : "暫停動態";
      build(p5instance);
      stateUrl();
    });
    listen(document.querySelector("#download"), "click", () => {
      p5instance.saveCanvas(
        p5instance.canvas,
        `${meta.slug}-${seed}-${Math.round(time * 1000)}`,
        "png",
      );
    });
    listen(document, "visibilitychange", () => {
      if (document.hidden) p5instance.noLoop();
      else wake();
    });
    listen(reduced, "change", () => {
      const saved = scene?.snapshot?.();
      build(p5instance, saved);
      notice.textContent = reduced.matches
        ? "目前以減少動態模式觀看；操作會直接切換完整構圖。"
        : "";
      wake();
    });
    resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRequest);
      resizeRequest = requestAnimationFrame(() => {
        if (disposed || !ctx) return;
        const expected = Math.round(frame.clientWidth);
        if (
          expected !== p5instance.width ||
          Math.round(frame.clientHeight) !== p5instance.height
        ) {
          const saved = scene?.snapshot?.();
          build(p5instance, saved);
        }
      });
    });
    resizeObserver.observe(frame);
    observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        if (inView) wake();
        else p5instance.noLoop();
      },
      { threshold: 0.02 },
    );
    observer.observe(frame);
    function dispose() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      cancelAnimationFrame(resizeRequest);
      for (const remove of listeners) remove();
      scene?.dispose?.();
      for (const layer of resources) layer.remove();
      buffer?.remove();
      p5instance.remove();
    }
    listen(window, "pagehide", (e) => {
      if (e.persisted) p5instance.noLoop();
      else dispose();
    });
    listen(window, "pageshow", (e) => {
      if (e.persisted) wake();
    });
    notice.textContent = reduced.matches
      ? "目前以減少動態模式觀看；操作會直接切換完整構圖。"
      : "";
    return { dispose };
  }
  window.GeometryExhibit = Object.freeze({ mount });
})();
