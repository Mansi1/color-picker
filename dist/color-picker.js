/*! color-picker v1.0.0 | MIT | https://mansi1.github.io/color-picker/ */
"use strict";
var ColorPicker = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/color-picker.ts
  var color_picker_exports = {};
  __export(color_picker_exports, {
    default: () => ColorPicker,
    hex2rgb: () => hex2rgb,
    hsv2rgb: () => hsv2rgb,
    rgb2hex: () => rgb2hex,
    rgb2hsv: () => rgb2hsv
  });
  var TAU = Math.PI * 2;
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }
  function hsv2rgb(h, s, v) {
    h = (h % 360 + 360) % 360 / 60;
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(h % 2 - 1));
    const m = v - c;
    const rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    return [
      Math.round((rgb[0] + m) * 255),
      Math.round((rgb[1] + m) * 255),
      Math.round((rgb[2] + m) * 255)
    ];
  }
  function rgb2hsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, max ? d / max * 100 : 0, max * 100];
  }
  function rgb2hex(rgb) {
    return "#" + rgb.map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0")).join("");
  }
  function hex2rgb(hex) {
    const m = /^#?([0-9a-f]{3,8})$/i.exec(String(hex).trim());
    if (!m) return null;
    let s = m[1];
    if (s.length === 3 || s.length === 4) {
      s = s.slice(0, 3).split("").map((c) => c + c).join("");
    } else if (s.length === 6 || s.length === 8) {
      s = s.slice(0, 6);
    } else {
      return null;
    }
    return [
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16)
    ];
  }
  function sizeCanvas(canvas, cssSize) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = canvas.style.height = cssSize + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("color-picker: 2d canvas context unavailable");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function drawWheel(canvas, diameter, thickness) {
    const ctx = sizeCanvas(canvas, diameter);
    const c = diameter / 2;
    const radius = (diameter - thickness) / 2;
    const step = TAU / 360;
    const overlap = step * 0.6;
    ctx.lineWidth = thickness;
    for (let i = 0; i < 360; i++) {
      const a = i * step;
      ctx.beginPath();
      ctx.strokeStyle = "hsl(" + i + ", 100%, 50%)";
      ctx.arc(c, c, radius, a - overlap, a + step + overlap);
      ctx.stroke();
    }
  }
  function barycentric(p, A, B, C) {
    const det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    const a = ((B[1] - C[1]) * (p[0] - C[0]) + (C[0] - B[0]) * (p[1] - C[1])) / det;
    const b = ((C[1] - A[1]) * (p[0] - C[0]) + (A[0] - C[0]) * (p[1] - C[1])) / det;
    return [a, b, 1 - a - b];
  }
  function drawTriangle(canvas, size, hue, verts) {
    const ctx = sizeCanvas(canvas, size);
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const [A, B, C] = verts;
    const [r, g, b] = hsv2rgb(hue, 100, 100);
    const det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    for (let y = 0; y < h; y++) {
      const py = (y + 0.5) / dpr;
      for (let x = 0; x < w; x++) {
        const px = (x + 0.5) / dpr;
        const wa = ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / det;
        const wb = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / det;
        const i = y * w + x << 2;
        if (wa < 0 || wb < 0 || wa + wb > 1) {
          data[i + 3] = 0;
          continue;
        }
        const white = wb * 255;
        data[i] = wa * r + white;
        data[i + 1] = wa * g + white;
        data[i + 2] = wa * b + white;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(C[0], C[1]);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  var ColorPicker = class {
    constructor(options = {}) {
      this._hsv = [0, 100, 100];
      this._dragging = null;
      var _a;
      this.wheelDiameter = options.wheelDiameter || 200;
      this.wheelThickness = options.wheelThickness || 20;
      this.handleDiameter = options.handleDiameter || 16;
      this.onChange = options.onChange || null;
      const d = this.wheelDiameter;
      const size = this._triSize = d - this.wheelThickness * 2;
      this._triRadius = size / 2 - this.handleDiameter / 2;
      const root = this.root = document.createElement("div");
      root.className = "color-picker";
      root.style.width = root.style.height = d + "px";
      const wheel = document.createElement("canvas");
      wheel.className = "color-picker__wheel";
      drawWheel(wheel, d, this.wheelThickness);
      const triangle = this._triangleCanvas = document.createElement("canvas");
      triangle.className = "color-picker__triangle";
      triangle.style.left = triangle.style.top = this.wheelThickness + "px";
      this._hueHandle = this._makeHandle("hue", "Hue", 0, 360);
      this._svHandle = this._makeHandle("sv", "Saturation and brightness", 0, 100);
      root.appendChild(wheel);
      root.appendChild(triangle);
      root.appendChild(this._hueHandle);
      root.appendChild(this._svHandle);
      root.addEventListener("pointerdown", (e) => this._onPointerDown(e));
      root.addEventListener("pointermove", (e) => this._onPointerMove(e));
      root.addEventListener("pointerup", (e) => this._onPointerUp(e));
      root.addEventListener("pointercancel", (e) => this._onPointerUp(e));
      if (options.rgb) this.rgb = options.rgb;
      else if (options.hsv) this.hsv = options.hsv;
      else this.hex = (_a = options.hex) != null ? _a : "#ff0000";
      if (options.appendTo) options.appendTo.appendChild(this.root);
    }
    _makeHandle(kind, label, min, max) {
      const el = document.createElement("div");
      el.className = "color-picker__handle color-picker__handle--" + kind;
      el.style.width = el.style.height = this.handleDiameter + "px";
      el.style.marginLeft = el.style.marginTop = -this.handleDiameter / 2 + "px";
      el.tabIndex = 0;
      el.setAttribute("role", "slider");
      el.setAttribute("aria-label", label);
      el.setAttribute("aria-valuemin", String(min));
      el.setAttribute("aria-valuemax", String(max));
      el.addEventListener("keydown", (e) => this._onKeyDown(kind, e));
      return el;
    }
    /* --------------------------------------------------------------- pointer */
    _local(e) {
      const rect = this.root.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    // Corners of the triangle: pure hue, white, black. The hue corner points at
    // the hue handle, so the whole triangle rotates as the hue changes. Pass the
    // canvas offset to get coordinates local to the triangle canvas.
    _vertices(offset = 0) {
      const radius = this._triRadius;
      const c = this.wheelDiameter / 2 - offset;
      const a0 = this._hsv[0] * TAU / 360;
      const out = [];
      for (let i = 0; i < 3; i++) {
        const a = a0 + i * TAU / 3;
        out.push([c + radius * Math.cos(a), c + radius * Math.sin(a)]);
      }
      return out;
    }
    // Anywhere inside the ring counts as the triangle, including the gaps at its
    // corners -- dragging there clamps onto the triangle instead of grabbing the
    // hue ring out from under the pointer.
    _inCore(p) {
      const c = this.wheelDiameter / 2;
      const dx = p.x - c;
      const dy = p.y - c;
      return dx * dx + dy * dy <= this._triSize / 2 * (this._triSize / 2);
    }
    _onPointerDown(e) {
      const p = this._local(e);
      this._dragging = this._inCore(p) ? "sv" : "hue";
      this.root.setPointerCapture(e.pointerId);
      (this._dragging === "sv" ? this._svHandle : this._hueHandle).focus();
      this._applyPointer(p);
      e.preventDefault();
    }
    _onPointerMove(e) {
      if (!this._dragging) return;
      this._applyPointer(this._local(e));
      e.preventDefault();
    }
    _onPointerUp(e) {
      if (!this._dragging) return;
      this._dragging = null;
      if (this.root.hasPointerCapture(e.pointerId)) {
        this.root.releasePointerCapture(e.pointerId);
      }
    }
    _applyPointer(p) {
      const c = this.wheelDiameter / 2;
      if (this._dragging === "hue") {
        const angle = Math.atan2(p.y - c, p.x - c);
        const hue = angle * 360 / TAU;
        this.hsv = [(hue % 360 + 360) % 360, this._hsv[1], this._hsv[2]];
      } else {
        const t = this._vertices();
        const w = barycentric([p.x, p.y], t[0], t[1], t[2]);
        let wHue = Math.max(w[0], 0);
        let wWhite = Math.max(w[1], 0);
        const sum = wHue + wWhite + Math.max(w[2], 0);
        wHue /= sum;
        wWhite /= sum;
        const v = wHue + wWhite;
        const s = v > 0 ? wHue / v : this._hsv[1] / 100;
        this.hsv = [this._hsv[0], s * 100, v * 100];
      }
    }
    /* -------------------------------------------------------------- keyboard */
    _onKeyDown(kind, e) {
      const step = e.shiftKey ? 10 : 1;
      let [h, s, v] = this._hsv;
      switch (e.key) {
        case "ArrowLeft":
          kind === "hue" ? h -= step : s -= step;
          break;
        case "ArrowRight":
          kind === "hue" ? h += step : s += step;
          break;
        case "ArrowUp":
          kind === "hue" ? h += step : v += step;
          break;
        case "ArrowDown":
          kind === "hue" ? h -= step : v -= step;
          break;
        case "Home":
          kind === "hue" ? h = 0 : (s = 0, v = 100);
          break;
        case "End":
          kind === "hue" ? h = 359 : (s = 100, v = 100);
          break;
        default:
          return;
      }
      this.hsv = [h, s, v];
      e.preventDefault();
    }
    /* ----------------------------------------------------------------- state */
    get hsv() {
      return [this._hsv[0], this._hsv[1], this._hsv[2]];
    }
    set hsv(hsv) {
      const h = (hsv[0] % 360 + 360) % 360;
      const next = [h, clamp(hsv[1], 0, 100), clamp(hsv[2], 0, 100)];
      const hueChanged = next[0] !== this._hsv[0];
      const changed = hueChanged || next[1] !== this._hsv[1] || next[2] !== this._hsv[2];
      this._hsv = next;
      this._render(hueChanged);
      if (changed && this.onChange) this.onChange(this);
    }
    get rgb() {
      return hsv2rgb(this._hsv[0], this._hsv[1], this._hsv[2]);
    }
    set rgb(rgb) {
      const hsv = rgb2hsv(rgb[0], rgb[1], rgb[2]);
      if (hsv[1] === 0) hsv[0] = this._hsv[0];
      if (hsv[2] === 0) hsv[1] = this._hsv[1];
      this.hsv = hsv;
    }
    get hex() {
      return rgb2hex(this.rgb);
    }
    /** Invalid strings are ignored, so this is safe to wire to an `<input>`. */
    set hex(hex) {
      const rgb = hex2rgb(hex);
      if (rgb) this.rgb = rgb;
    }
    _render(hueChanged) {
      const [h, s, v] = this._hsv;
      const d = this.wheelDiameter;
      const c = d / 2;
      if (hueChanged || this._drawnHue === void 0) {
        drawTriangle(
          this._triangleCanvas,
          this._triSize,
          h,
          this._vertices(this.wheelThickness)
        );
        this._drawnHue = h;
      }
      const radius = (d - this.wheelThickness) / 2;
      const a = h * TAU / 360;
      this._hueHandle.style.left = c + radius * Math.cos(a) + "px";
      this._hueHandle.style.top = c + radius * Math.sin(a) + "px";
      const t = this._vertices();
      const wHue = s / 100 * (v / 100);
      const wWhite = v / 100 - wHue;
      const wBlack = 1 - v / 100;
      this._svHandle.style.left = wHue * t[0][0] + wWhite * t[1][0] + wBlack * t[2][0] + "px";
      this._svHandle.style.top = wHue * t[0][1] + wWhite * t[1][1] + wBlack * t[2][1] + "px";
      const hex = this.hex;
      this._svHandle.style.backgroundColor = hex;
      this._hueHandle.style.backgroundColor = "hsl(" + h + ", 100%, 50%)";
      this.root.classList.toggle("color-picker--dark-handle", v > 60 && s < 60);
      this._hueHandle.setAttribute("aria-valuenow", String(Math.round(h)));
      this._hueHandle.setAttribute("aria-valuetext", Math.round(h) + " degrees");
      this._svHandle.setAttribute("aria-valuenow", String(Math.round(s)));
      this._svHandle.setAttribute(
        "aria-valuetext",
        Math.round(s) + "% saturation, " + Math.round(v) + "% brightness, " + hex
      );
    }
    /** Remove the picker from the DOM. */
    destroy() {
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    }
  };
  ColorPicker.hsv2rgb = hsv2rgb;
  ColorPicker.rgb2hsv = rgb2hsv;
  ColorPicker.rgb2hex = rgb2hex;
  ColorPicker.hex2rgb = hex2rgb;
  return __toCommonJS(color_picker_exports);
})();
/*!
 * color-picker - a hue ring with a rotating HSV triangle inside it.
 * No runtime dependencies. MIT licensed.
 */
ColorPicker=ColorPicker.default;if(typeof module==="object"&&module.exports)module.exports=ColorPicker;
