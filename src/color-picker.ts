/*!
 * color-picker - a hue ring with a rotating HSV triangle inside it.
 * No runtime dependencies. MIT licensed.
 */

/** Red, green, blue -- each 0..255. */
export type RGB = [number, number, number];
/** Hue 0..360, saturation 0..100, value/brightness 0..100. */
export type HSV = [number, number, number];
/** A point in the picker's own coordinate space, in CSS pixels. */
export interface Point {
  x: number;
  y: number;
}

type Vertex = [number, number];
type HandleKind = 'hue' | 'sv';

export interface ColorPickerOptions {
  /** Element to append the picker to. Omit it and mount `picker.root` yourself. */
  appendTo?: HTMLElement | null;
  /** Initial color. `rgb` wins over `hsv`, which wins over `hex`. */
  hex?: string;
  rgb?: RGB;
  hsv?: HSV;
  /** Outer diameter of the ring, in px. Default 200. */
  wheelDiameter?: number;
  /** Ring thickness, in px. Default 20. */
  wheelThickness?: number;
  /** Handle size, in px. Default 16. */
  handleDiameter?: number;
  /** Called with the picker whenever the color changes. */
  onChange?: ((picker: ColorPicker) => void) | null;
}

const TAU = Math.PI * 2;

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/* ------------------------------------------------------------------ color */

/** h: 0..360, s/v: 0..100 -> [r, g, b] each 0..255. */
export function hsv2rgb(h: number, s: number, v: number): RGB {
  h = (((h % 360) + 360) % 360) / 60;
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;
  const rgb: number[] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

export function rgb2hsv(r: number, g: number, b: number): HSV {
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
  return [h, max ? (d / max) * 100 : 0, max * 100];
}

export function rgb2hex(rgb: RGB): string {
  return (
    '#' +
    rgb
      .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Accepts #rgb, #rgba, #rrggbb, #rrggbbaa (alpha is ignored). null if invalid. */
export function hex2rgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(String(hex).trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3 || s.length === 4) {
    s = s
      .slice(0, 3)
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (s.length === 6 || s.length === 8) {
    s = s.slice(0, 6);
  } else {
    return null;
  }
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/* ---------------------------------------------------------------- drawing */

function sizeCanvas(
  canvas: HTMLCanvasElement,
  cssSize: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.height = Math.round(cssSize * dpr);
  canvas.style.width = canvas.style.height = cssSize + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('color-picker: 2d canvas context unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// Hue 0 sits at 3 o'clock and increases clockwise.
function drawWheel(
  canvas: HTMLCanvasElement,
  diameter: number,
  thickness: number,
): void {
  const ctx = sizeCanvas(canvas, diameter);
  const c = diameter / 2;
  const radius = (diameter - thickness) / 2;
  const step = TAU / 360;
  // Overdraw each wedge slightly so no seams show between segments.
  const overlap = step * 0.6;
  ctx.lineWidth = thickness;
  for (let i = 0; i < 360; i++) {
    const a = i * step;
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(' + i + ', 100%, 50%)';
    ctx.arc(c, c, radius, a - overlap, a + step + overlap);
    ctx.stroke();
  }
}

// Barycentric weights of p against triangle A/B/C. Each is 1 at its own
// vertex and 0 along the opposite edge; all three sum to 1.
function barycentric(
  p: Vertex,
  A: Vertex,
  B: Vertex,
  C: Vertex,
): [number, number, number] {
  const det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
  const a = ((B[1] - C[1]) * (p[0] - C[0]) + (C[0] - B[0]) * (p[1] - C[1])) / det;
  const b = ((C[1] - A[1]) * (p[0] - C[0]) + (A[0] - C[0]) * (p[1] - C[1])) / det;
  return [a, b, 1 - a - b];
}

// The triangle's corners are the pure hue, white and black, and an HSV
// color is exactly the linear RGB blend of those three -- hsv(h, s, v) is
// (s*v) * hue + (v - s*v) * white + (1 - v) * black -- so a plain
// barycentric interpolation renders it, no per-pixel conversion needed.
function drawTriangle(
  canvas: HTMLCanvasElement,
  size: number,
  hue: number,
  verts: Vertex[],
): void {
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
      const wa =
        ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / det;
      const wb =
        ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / det;
      const i = (y * w + x) << 2;
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

  // Re-cut the shape with a filled path so the edges come out antialiased
  // rather than as the hard stair-step the per-pixel test produces.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.moveTo(A[0], A[1]);
  ctx.lineTo(B[0], B[1]);
  ctx.lineTo(C[0], C[1]);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/* ----------------------------------------------------------------- picker */

export default class ColorPicker {
  static readonly hsv2rgb = hsv2rgb;
  static readonly rgb2hsv = rgb2hsv;
  static readonly rgb2hex = rgb2hex;
  static readonly hex2rgb = hex2rgb;

  readonly wheelDiameter: number;
  readonly wheelThickness: number;
  readonly handleDiameter: number;
  onChange: ((picker: ColorPicker) => void) | null;

  /** The picker's DOM element. */
  readonly root: HTMLDivElement;

  private _hsv: HSV = [0, 100, 100];
  private _dragging: HandleKind | null = null;
  private _drawnHue: number | undefined;
  private readonly _triSize: number;
  private readonly _triRadius: number;
  private readonly _triangleCanvas: HTMLCanvasElement;
  private readonly _hueHandle: HTMLDivElement;
  private readonly _svHandle: HTMLDivElement;

  constructor(options: ColorPickerOptions = {}) {
    this.wheelDiameter = options.wheelDiameter || 200;
    this.wheelThickness = options.wheelThickness || 20;
    this.handleDiameter = options.handleDiameter || 16;
    this.onChange = options.onChange || null;

    const d = this.wheelDiameter;
    // The triangle is inscribed in the ring's inner circle, so its canvas is
    // that circle's bounding box.
    const size = (this._triSize = d - this.wheelThickness * 2);
    // Inset the corners by half a handle so the one sitting on the pure-hue
    // corner doesn't collide with the hue handle on the ring beside it.
    this._triRadius = size / 2 - this.handleDiameter / 2;

    const root = (this.root = document.createElement('div'));
    root.className = 'color-picker';
    root.style.width = root.style.height = d + 'px';

    const wheel = document.createElement('canvas');
    wheel.className = 'color-picker__wheel';
    drawWheel(wheel, d, this.wheelThickness);

    const triangle = (this._triangleCanvas = document.createElement('canvas'));
    triangle.className = 'color-picker__triangle';
    triangle.style.left = triangle.style.top = this.wheelThickness + 'px';

    this._hueHandle = this._makeHandle('hue', 'Hue', 0, 360);
    this._svHandle = this._makeHandle('sv', 'Saturation and brightness', 0, 100);

    root.appendChild(wheel);
    root.appendChild(triangle);
    root.appendChild(this._hueHandle);
    root.appendChild(this._svHandle);

    root.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    root.addEventListener('pointermove', (e) => this._onPointerMove(e));
    root.addEventListener('pointerup', (e) => this._onPointerUp(e));
    root.addEventListener('pointercancel', (e) => this._onPointerUp(e));

    if (options.rgb) this.rgb = options.rgb;
    else if (options.hsv) this.hsv = options.hsv;
    else this.hex = options.hex ?? '#ff0000';

    if (options.appendTo) options.appendTo.appendChild(this.root);
  }

  private _makeHandle(
    kind: HandleKind,
    label: string,
    min: number,
    max: number,
  ): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'color-picker__handle color-picker__handle--' + kind;
    el.style.width = el.style.height = this.handleDiameter + 'px';
    el.style.marginLeft = el.style.marginTop = -this.handleDiameter / 2 + 'px';
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', label);
    el.setAttribute('aria-valuemin', String(min));
    el.setAttribute('aria-valuemax', String(max));
    el.addEventListener('keydown', (e) => this._onKeyDown(kind, e));
    return el;
  }

  /* --------------------------------------------------------------- pointer */

  private _local(e: PointerEvent): Point {
    const rect = this.root.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Corners of the triangle: pure hue, white, black. The hue corner points at
  // the hue handle, so the whole triangle rotates as the hue changes. Pass the
  // canvas offset to get coordinates local to the triangle canvas.
  private _vertices(offset = 0): Vertex[] {
    const radius = this._triRadius;
    const c = this.wheelDiameter / 2 - offset;
    const a0 = (this._hsv[0] * TAU) / 360;
    const out: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i * TAU) / 3;
      out.push([c + radius * Math.cos(a), c + radius * Math.sin(a)]);
    }
    return out;
  }

  // Anywhere inside the ring counts as the triangle, including the gaps at its
  // corners -- dragging there clamps onto the triangle instead of grabbing the
  // hue ring out from under the pointer.
  private _inCore(p: Point): boolean {
    const c = this.wheelDiameter / 2;
    const dx = p.x - c;
    const dy = p.y - c;
    return dx * dx + dy * dy <= (this._triSize / 2) * (this._triSize / 2);
  }

  private _onPointerDown(e: PointerEvent): void {
    const p = this._local(e);
    this._dragging = this._inCore(p) ? 'sv' : 'hue';
    this.root.setPointerCapture(e.pointerId);
    (this._dragging === 'sv' ? this._svHandle : this._hueHandle).focus();
    this._applyPointer(p);
    e.preventDefault();
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this._dragging) return;
    this._applyPointer(this._local(e));
    e.preventDefault();
  }

  private _onPointerUp(e: PointerEvent): void {
    if (!this._dragging) return;
    this._dragging = null;
    if (this.root.hasPointerCapture(e.pointerId)) {
      this.root.releasePointerCapture(e.pointerId);
    }
  }

  private _applyPointer(p: Point): void {
    const c = this.wheelDiameter / 2;
    if (this._dragging === 'hue') {
      const angle = Math.atan2(p.y - c, p.x - c);
      const hue = (angle * 360) / TAU;
      this.hsv = [((hue % 360) + 360) % 360, this._hsv[1], this._hsv[2]];
    } else {
      const t = this._vertices();
      const w = barycentric([p.x, p.y], t[0], t[1], t[2]);
      // Clamping the negative weights and renormalizing slides a point outside
      // the triangle onto the nearest edge instead of letting it run away.
      let wHue = Math.max(w[0], 0);
      let wWhite = Math.max(w[1], 0);
      const sum = wHue + wWhite + Math.max(w[2], 0);
      wHue /= sum;
      wWhite /= sum;
      const v = wHue + wWhite;
      // At the black corner saturation is undefined; keep what the user had.
      const s = v > 0 ? wHue / v : this._hsv[1] / 100;
      this.hsv = [this._hsv[0], s * 100, v * 100];
    }
  }

  /* -------------------------------------------------------------- keyboard */

  private _onKeyDown(kind: HandleKind, e: KeyboardEvent): void {
    const step = e.shiftKey ? 10 : 1;
    let [h, s, v] = this._hsv;
    switch (e.key) {
      case 'ArrowLeft':
        kind === 'hue' ? (h -= step) : (s -= step);
        break;
      case 'ArrowRight':
        kind === 'hue' ? (h += step) : (s += step);
        break;
      case 'ArrowUp':
        kind === 'hue' ? (h += step) : (v += step);
        break;
      case 'ArrowDown':
        kind === 'hue' ? (h -= step) : (v -= step);
        break;
      case 'Home':
        kind === 'hue' ? (h = 0) : ((s = 0), (v = 100));
        break;
      case 'End':
        kind === 'hue' ? (h = 359) : ((s = 100), (v = 100));
        break;
      default:
        return;
    }
    this.hsv = [h, s, v];
    e.preventDefault();
  }

  /* ----------------------------------------------------------------- state */

  get hsv(): HSV {
    return [this._hsv[0], this._hsv[1], this._hsv[2]];
  }

  set hsv(hsv: HSV) {
    const h = ((hsv[0] % 360) + 360) % 360;
    const next: HSV = [h, clamp(hsv[1], 0, 100), clamp(hsv[2], 0, 100)];
    const hueChanged = next[0] !== this._hsv[0];
    const changed =
      hueChanged || next[1] !== this._hsv[1] || next[2] !== this._hsv[2];
    this._hsv = next;
    this._render(hueChanged);
    if (changed && this.onChange) this.onChange(this);
  }

  get rgb(): RGB {
    return hsv2rgb(this._hsv[0], this._hsv[1], this._hsv[2]);
  }

  set rgb(rgb: RGB) {
    const hsv = rgb2hsv(rgb[0], rgb[1], rgb[2]);
    // A gray or black input carries no hue/saturation of its own; keep the
    // handle where the user left it instead of snapping it back to red.
    if (hsv[1] === 0) hsv[0] = this._hsv[0];
    if (hsv[2] === 0) hsv[1] = this._hsv[1];
    this.hsv = hsv;
  }

  get hex(): string {
    return rgb2hex(this.rgb);
  }

  /** Invalid strings are ignored, so this is safe to wire to an `<input>`. */
  set hex(hex: string) {
    const rgb = hex2rgb(hex);
    if (rgb) this.rgb = rgb;
  }

  private _render(hueChanged: boolean): void {
    const [h, s, v] = this._hsv;
    const d = this.wheelDiameter;
    const c = d / 2;

    if (hueChanged || this._drawnHue === undefined) {
      drawTriangle(
        this._triangleCanvas,
        this._triSize,
        h,
        this._vertices(this.wheelThickness),
      );
      this._drawnHue = h;
    }

    const radius = (d - this.wheelThickness) / 2;
    const a = (h * TAU) / 360;
    this._hueHandle.style.left = c + radius * Math.cos(a) + 'px';
    this._hueHandle.style.top = c + radius * Math.sin(a) + 'px';

    const t = this._vertices();
    const wHue = (s / 100) * (v / 100);
    const wWhite = v / 100 - wHue;
    const wBlack = 1 - v / 100;
    this._svHandle.style.left =
      wHue * t[0][0] + wWhite * t[1][0] + wBlack * t[2][0] + 'px';
    this._svHandle.style.top =
      wHue * t[0][1] + wWhite * t[1][1] + wBlack * t[2][1] + 'px';

    const hex = this.hex;
    this._svHandle.style.backgroundColor = hex;
    this._hueHandle.style.backgroundColor = 'hsl(' + h + ', 100%, 50%)';
    // Keep the handle outline readable against the color underneath it.
    this.root.classList.toggle('color-picker--dark-handle', v > 60 && s < 60);

    this._hueHandle.setAttribute('aria-valuenow', String(Math.round(h)));
    this._hueHandle.setAttribute('aria-valuetext', Math.round(h) + ' degrees');
    this._svHandle.setAttribute('aria-valuenow', String(Math.round(s)));
    this._svHandle.setAttribute(
      'aria-valuetext',
      Math.round(s) + '% saturation, ' + Math.round(v) + '% brightness, ' + hex,
    );
  }

  /** Remove the picker from the DOM. */
  destroy(): void {
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
