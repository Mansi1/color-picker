/*!
 * color-picker - a hue ring with a rotating HSV triangle inside it.
 * No dependencies, no build step. Works as a <script> tag or via require().
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ColorPicker = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  /* ---------------------------------------------------------------- color */

  // h: 0..360, s/v: 0..100  ->  [r, g, b] each 0..255
  function hsv2rgb(h, s, v) {
    h = (((h % 360) + 360) % 360) / 60;
    s /= 100;
    v /= 100;
    var c = v * s;
    var x = c * (1 - Math.abs((h % 2) - 1));
    var m = v - c;
    var rgb =
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
    return rgb.map(function (n) {
      return Math.round((n + m) * 255);
    });
  }

  function rgb2hsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min;
    var h = 0;
    if (d) {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, max ? (d / max) * 100 : 0, max * 100];
  }

  function rgb2hex(rgb) {
    return (
      '#' +
      rgb
        .map(function (n) {
          return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
        })
        .join('')
    );
  }

  // Accepts #rgb, #rgba, #rrggbb, #rrggbbaa (alpha is ignored). null if invalid.
  function hex2rgb(hex) {
    var m = /^#?([0-9a-f]{3,8})$/i.exec(String(hex).trim());
    if (!m) return null;
    var s = m[1];
    if (s.length === 3 || s.length === 4) {
      s = s
        .slice(0, 3)
        .split('')
        .map(function (c) {
          return c + c;
        })
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

  /* ------------------------------------------------------------- drawing */

  function sizeCanvas(canvas, cssSize) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = canvas.style.height = cssSize + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // Hue 0 sits at 3 o'clock and increases clockwise.
  function drawWheel(canvas, diameter, thickness) {
    var ctx = sizeCanvas(canvas, diameter);
    var c = diameter / 2;
    var radius = (diameter - thickness) / 2;
    var step = TAU / 360;
    // Overdraw each wedge slightly so no seams show between segments.
    var overlap = step * 0.6;
    ctx.lineWidth = thickness;
    for (var i = 0; i < 360; i++) {
      var a = i * step;
      ctx.beginPath();
      ctx.strokeStyle = 'hsl(' + i + ', 100%, 50%)';
      ctx.arc(c, c, radius, a - overlap, a + step + overlap);
      ctx.stroke();
    }
  }

  // Barycentric weights of p against triangle A/B/C. Each is 1 at its own
  // vertex and 0 along the opposite edge; all three sum to 1.
  function barycentric(p, A, B, C) {
    var det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    var a =
      ((B[1] - C[1]) * (p[0] - C[0]) + (C[0] - B[0]) * (p[1] - C[1])) / det;
    var b =
      ((C[1] - A[1]) * (p[0] - C[0]) + (A[0] - C[0]) * (p[1] - C[1])) / det;
    return [a, b, 1 - a - b];
  }

  // The triangle's corners are the pure hue, white and black, and an HSV
  // color is exactly the linear RGB blend of those three -- hsv(h, s, v) is
  // (s*v) * hue + (v - s*v) * white + (1 - v) * black -- so a plain
  // barycentric interpolation renders it, no per-pixel conversion needed.
  function drawTriangle(canvas, size, hue, verts) {
    var ctx = sizeCanvas(canvas, size);
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.width,
      h = canvas.height;
    var img = ctx.createImageData(w, h);
    var data = img.data;
    var A = verts[0],
      B = verts[1],
      C = verts[2];
    var rgb = hsv2rgb(hue, 100, 100);
    var r = rgb[0],
      g = rgb[1],
      b = rgb[2];

    var det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    for (var y = 0; y < h; y++) {
      var py = (y + 0.5) / dpr;
      for (var x = 0; x < w; x++) {
        var px = (x + 0.5) / dpr;
        var wa =
          ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / det;
        var wb =
          ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / det;
        var i = (y * w + x) << 2;
        if (wa < 0 || wb < 0 || wa + wb > 1) {
          data[i + 3] = 0;
          continue;
        }
        var white = wb * 255;
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

  /* -------------------------------------------------------------- picker */

  function ColorPicker(options) {
    if (!(this instanceof ColorPicker)) return new ColorPicker(options);
    options = options || {};

    this.wheelDiameter = options.wheelDiameter || 200;
    this.wheelThickness = options.wheelThickness || 20;
    this.handleDiameter = options.handleDiameter || 16;
    this.onChange = options.onChange || null;

    this._hsv = [0, 100, 100];
    this._dragging = null;

    this._build();

    if (options.rgb) this.rgb = options.rgb;
    else if (options.hsv) this.hsv = options.hsv;
    else this.hex = options.hex;

    if (options.appendTo) options.appendTo.appendChild(this.root);
  }

  ColorPicker.hsv2rgb = hsv2rgb;
  ColorPicker.rgb2hsv = rgb2hsv;
  ColorPicker.rgb2hex = rgb2hex;
  ColorPicker.hex2rgb = hex2rgb;

  ColorPicker.prototype._build = function () {
    var d = this.wheelDiameter;
    // The triangle is inscribed in the ring's inner circle, so its canvas is
    // that circle's bounding box.
    var size = (this._triSize = d - this.wheelThickness * 2);
    // Inset the corners by half a handle so the one sitting on the pure-hue
    // corner doesn't collide with the hue handle on the ring beside it.
    this._triRadius = size / 2 - this.handleDiameter / 2;

    var root = (this.root = document.createElement('div'));
    root.className = 'color-picker';
    root.style.width = root.style.height = d + 'px';

    var wheel = (this._wheelCanvas = document.createElement('canvas'));
    wheel.className = 'color-picker__wheel';
    drawWheel(wheel, d, this.wheelThickness);

    var triangle = (this._triangleCanvas = document.createElement('canvas'));
    triangle.className = 'color-picker__triangle';
    triangle.style.left = triangle.style.top = this.wheelThickness + 'px';

    this._hueHandle = this._makeHandle('hue', 'Hue', 0, 360);
    this._svHandle = this._makeHandle(
      'sv',
      'Saturation and brightness',
      0,
      100,
    );

    root.appendChild(wheel);
    root.appendChild(triangle);
    root.appendChild(this._hueHandle);
    root.appendChild(this._svHandle);

    var self = this;
    root.addEventListener('pointerdown', function (e) {
      self._onPointerDown(e);
    });
    root.addEventListener('pointermove', function (e) {
      self._onPointerMove(e);
    });
    root.addEventListener('pointerup', function (e) {
      self._onPointerUp(e);
    });
    root.addEventListener('pointercancel', function (e) {
      self._onPointerUp(e);
    });
  };

  ColorPicker.prototype._makeHandle = function (kind, label, min, max) {
    var el = document.createElement('div');
    el.className = 'color-picker__handle color-picker__handle--' + kind;
    el.style.width = el.style.height = this.handleDiameter + 'px';
    el.style.marginLeft = el.style.marginTop = -this.handleDiameter / 2 + 'px';
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', label);
    el.setAttribute('aria-valuemin', min);
    el.setAttribute('aria-valuemax', max);
    var self = this;
    el.addEventListener('keydown', function (e) {
      self._onKeyDown(kind, e);
    });
    return el;
  };

  /* ------------------------------------------------------------- pointer */

  ColorPicker.prototype._local = function (e) {
    var rect = this.root.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Corners of the triangle: pure hue, white, black. The hue corner points at
  // the hue handle, so the whole triangle rotates as the hue changes. Pass the
  // canvas offset to get coordinates local to the triangle canvas.
  ColorPicker.prototype._vertices = function (offset) {
    var radius = this._triRadius;
    var c = this.wheelDiameter / 2 - (offset || 0);
    var a0 = (this._hsv[0] * TAU) / 360;
    var out = [];
    for (var i = 0; i < 3; i++) {
      var a = a0 + (i * TAU) / 3;
      out.push([c + radius * Math.cos(a), c + radius * Math.sin(a)]);
    }
    return out;
  };

  // Anywhere inside the ring counts as the triangle, including the gaps at its
  // corners -- dragging there clamps onto the triangle instead of grabbing the
  // hue ring out from under the pointer.
  ColorPicker.prototype._inCore = function (p) {
    var c = this.wheelDiameter / 2;
    var dx = p.x - c,
      dy = p.y - c;
    return dx * dx + dy * dy <= (this._triSize / 2) * (this._triSize / 2);
  };

  ColorPicker.prototype._onPointerDown = function (e) {
    var p = this._local(e);
    this._dragging = this._inCore(p) ? 'sv' : 'hue';
    this.root.setPointerCapture(e.pointerId);
    (this._dragging === 'sv' ? this._svHandle : this._hueHandle).focus();
    this._applyPointer(p);
    e.preventDefault();
  };

  ColorPicker.prototype._onPointerMove = function (e) {
    if (!this._dragging) return;
    this._applyPointer(this._local(e));
    e.preventDefault();
  };

  ColorPicker.prototype._onPointerUp = function (e) {
    if (!this._dragging) return;
    this._dragging = null;
    if (this.root.hasPointerCapture(e.pointerId)) {
      this.root.releasePointerCapture(e.pointerId);
    }
  };

  ColorPicker.prototype._applyPointer = function (p) {
    var c = this.wheelDiameter / 2;
    if (this._dragging === 'hue') {
      var angle = Math.atan2(p.y - c, p.x - c);
      var hue = (angle * 360) / TAU;
      this.hsv = [((hue % 360) + 360) % 360, this._hsv[1], this._hsv[2]];
    } else {
      var t = this._vertices(0);
      var w = barycentric([p.x, p.y], t[0], t[1], t[2]);
      // Clamping the negative weights and renormalizing slides a point outside
      // the triangle onto the nearest edge instead of letting it run away.
      var wHue = Math.max(w[0], 0),
        wWhite = Math.max(w[1], 0);
      var sum = wHue + wWhite + Math.max(w[2], 0);
      wHue /= sum;
      wWhite /= sum;
      var v = wHue + wWhite;
      // At the black corner saturation is undefined; keep what the user had.
      var s = v > 0 ? wHue / v : this._hsv[1] / 100;
      this.hsv = [this._hsv[0], s * 100, v * 100];
    }
  };

  /* ------------------------------------------------------------ keyboard */

  ColorPicker.prototype._onKeyDown = function (kind, e) {
    var step = e.shiftKey ? 10 : 1;
    var h = this._hsv[0],
      s = this._hsv[1],
      v = this._hsv[2];
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
  };

  /* --------------------------------------------------------------- state */

  Object.defineProperty(ColorPicker.prototype, 'hsv', {
    get: function () {
      return this._hsv.slice();
    },
    set: function (hsv) {
      var h = ((hsv[0] % 360) + 360) % 360;
      var next = [h, clamp(hsv[1], 0, 100), clamp(hsv[2], 0, 100)];
      var hueChanged = next[0] !== this._hsv[0];
      var changed =
        hueChanged || next[1] !== this._hsv[1] || next[2] !== this._hsv[2];
      this._hsv = next;
      this._render(hueChanged);
      if (changed && this.onChange) this.onChange(this);
    },
  });

  Object.defineProperty(ColorPicker.prototype, 'rgb', {
    get: function () {
      return hsv2rgb(this._hsv[0], this._hsv[1], this._hsv[2]);
    },
    set: function (rgb) {
      var hsv = rgb2hsv(rgb[0], rgb[1], rgb[2]);
      // A gray or black input carries no hue/saturation of its own; keep the
      // handle where the user left it instead of snapping it back to red.
      if (hsv[1] === 0) hsv[0] = this._hsv[0];
      if (hsv[2] === 0) hsv[1] = this._hsv[1];
      this.hsv = hsv;
    },
  });

  Object.defineProperty(ColorPicker.prototype, 'hex', {
    get: function () {
      return rgb2hex(this.rgb);
    },
    set: function (hex) {
      var rgb = hex2rgb(hex);
      if (rgb) this.rgb = rgb;
    },
  });

  ColorPicker.prototype._render = function (hueChanged) {
    var h = this._hsv[0],
      s = this._hsv[1],
      v = this._hsv[2];
    var d = this.wheelDiameter;
    var c = d / 2;

    if (hueChanged || this._drawnHue === undefined) {
      drawTriangle(
        this._triangleCanvas,
        this._triSize,
        h,
        this._vertices(this.wheelThickness),
      );
      this._drawnHue = h;
    }

    var radius = (d - this.wheelThickness) / 2;
    var a = (h * TAU) / 360;
    this._hueHandle.style.left = c + radius * Math.cos(a) + 'px';
    this._hueHandle.style.top = c + radius * Math.sin(a) + 'px';

    var t = this._vertices(0);
    var wHue = (s / 100) * (v / 100),
      wWhite = v / 100 - wHue,
      wBlack = 1 - v / 100;
    this._svHandle.style.left =
      wHue * t[0][0] + wWhite * t[1][0] + wBlack * t[2][0] + 'px';
    this._svHandle.style.top =
      wHue * t[0][1] + wWhite * t[1][1] + wBlack * t[2][1] + 'px';

    var hex = this.hex;
    this._svHandle.style.backgroundColor = hex;
    this._hueHandle.style.backgroundColor = 'hsl(' + h + ', 100%, 50%)';
    // Keep the handle outline readable against the color underneath it.
    this.root.classList.toggle('color-picker--dark-handle', v > 60 && s < 60);

    this._hueHandle.setAttribute('aria-valuenow', Math.round(h));
    this._hueHandle.setAttribute('aria-valuetext', Math.round(h) + ' degrees');
    this._svHandle.setAttribute('aria-valuenow', Math.round(s));
    this._svHandle.setAttribute(
      'aria-valuetext',
      Math.round(s) + '% saturation, ' + Math.round(v) + '% brightness, ' + hex,
    );
  };

  ColorPicker.prototype.destroy = function () {
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  return ColorPicker;
});
