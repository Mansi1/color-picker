# @mansi1/color-picker

A color picker in TypeScript: a hue ring with an HSV triangle inside it. The
triangle's corners are the pure hue, white and black, and it rotates so the hue
corner always points at the hue handle.

**[Live demo →](https://mansi1.github.io/color-picker/)**

- **No runtime dependencies.** 3.6 kB gzipped, JS and CSS together.
- **Works anywhere.** A `<script>` tag defines a global, or import it as a module.
- **Typed.** Written in TypeScript; ships its own declarations.
- **Keyboard accessible.** Both handles are real focusable sliders.
- **Sharp on any display.** Canvas is drawn at the device pixel ratio.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Options](#options)
- [API](#api)
- [Recipes](#recipes)
- [How it works](#how-it-works)
- [Accessibility](#accessibility)
- [Browser support](#browser-support)
- [Building](#building)
- [License](#license)

## Install

From the CDN -- no install, no build:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Mansi1/color-picker@v1.0.1/dist/color-picker.min.css">
<script src="https://cdn.jsdelivr.net/gh/Mansi1/color-picker@v1.0.1/dist/color-picker.min.js"></script>
```

Pin the tag as above and the file is immutable and cached for a year. Swapping
`@v1.0.1` for `@main` tracks the branch instead, but jsDelivr recaches those
every 12 hours.

Or from npm:

```sh
npm install @mansi1/color-picker
```

Or download `dist/` and serve it yourself.

## Quick start

With a script tag -- this defines the global `ColorPicker`:

```html
<link rel="stylesheet" href="dist/color-picker.min.css">
<script src="dist/color-picker.min.js"></script>

<div id="container"></div>

<script>
  var picker = new ColorPicker({
    appendTo: document.getElementById('container'),
    hex: '#ff0000',
    wheelDiameter: 250,
    wheelThickness: 24,
    handleDiameter: 16,
    onChange: function (color) {
      console.log(color.hex, color.rgb, color.hsv);
    }
  });
</script>
```

With a bundler or in TypeScript -- the package ships its own types:

```ts
import ColorPicker, { type ColorPickerOptions, type RGB, type HSV } from '@mansi1/color-picker';
import '@mansi1/color-picker/dist/color-picker.css';

const picker = new ColorPicker({ hex: '#ff0000' });
document.body.appendChild(picker.root);
```

`ColorPicker` is a class, so it must be called with `new`.

## Options

Every option is optional; the picker renders a 200 px red wheel with no options
at all.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `appendTo` | `HTMLElement` | – | Element the picker is appended to. Omit it and mount `picker.root` yourself. |
| `hex` | `string` | `'#ff0000'` | Initial color. |
| `rgb` | `[r, g, b]` | – | Initial color; wins over `hsv` and `hex`. |
| `hsv` | `[h, s, v]` | – | Initial color; wins over `hex`. |
| `wheelDiameter` | `number` | `200` | Outer diameter of the ring, in px. |
| `wheelThickness` | `number` | `20` | Ring thickness, in px. |
| `handleDiameter` | `number` | `16` | Handle size, in px. |
| `onChange` | `(picker) => void` | – | Called whenever the color changes. |

The triangle is sized from the other three: it is inscribed in the ring's inner
circle, inset by half a handle so the corner handle never collides with the hue
handle. Keep `wheelDiameter` above roughly `140` -- below that the triangle gets
small enough that fine saturation picking is fiddly.

`onChange` receives the picker itself, not a separate color object, so read
`picker.hex` / `.rgb` / `.hsv` off it.

It fires only on an actual change, and the picker starts out red internally --
so constructing it with any color *other* than red fires `onChange` once during
the constructor, and constructing it with red (or no color at all) fires
nothing. Don't rely on either: if you need to paint an initial state, call it
yourself once after construction.

```js
picker.onChange(picker);
```

## API

### Color

All three are readable **and** writable. Assigning updates the UI and fires
`onChange`, but only when the value actually changed.

| Property | Type | Range |
| --- | --- | --- |
| `picker.hex` | `string` | `'#rrggbb'`, always 7 chars lowercase |
| `picker.rgb` | `[number, number, number]` | each `0`–`255` |
| `picker.hsv` | `[number, number, number]` | `0`–`360`, `0`–`100`, `0`–`100` |

```js
picker.hex = '#3fa9f5';
picker.rgb;              // [63, 169, 245]
picker.hsv;              // [205.1, 74.3, 96.1]
picker.hsv = [120, 100, 100];
picker.hex;              // '#00ff00'
```

Two behaviors worth knowing:

- **Invalid hex is ignored.** `picker.hex = 'nonsense'` is a no-op rather than
  an error, so the setter is safe to wire straight to an `<input>` on every
  keystroke. `#rgb`, `#rgba`, `#rrggbb` and `#rrggbbaa` are all accepted; alpha
  is parsed but discarded.
- **Gray and black keep their handles put.** Those colors carry no hue (and
  black no saturation) of their own, so setting one leaves the hue and
  saturation where the user left them instead of snapping the handles back to
  red.

### Elements and lifecycle

| Member | Meaning |
| --- | --- |
| `picker.root` | The picker's DOM element. Mount it yourself if you skipped `appendTo`. |
| `picker.destroy()` | Removes it from the DOM. |
| `picker.onChange` | Readable and writable after construction. |
| `picker.wheelDiameter`, `.wheelThickness`, `.handleDiameter` | The sizes it was built with (read-only). |

### Conversion helpers

Available as statics and as named exports of the module:

```ts
ColorPicker.hsv2rgb(h, s, v);   // -> [r, g, b]
ColorPicker.rgb2hsv(r, g, b);   // -> [h, s, v]
ColorPicker.rgb2hex([r, g, b]); // -> '#rrggbb'
ColorPicker.hex2rgb('#abc');    // -> [170, 187, 204], or null if unparseable
```

## Recipes

**Bind to a text input, both directions:**

```js
input.addEventListener('input', () => { picker.hex = input.value; });
picker.onChange = (p) => {
  if (document.activeElement !== input) input.value = p.hex;
};
```

The `activeElement` guard stops the picker from rewriting the field while
someone is still typing in it.

**Use it in React:**

```jsx
function Picker({ value, onChange }) {
  const host = useRef(null);
  const picker = useRef(null);

  useEffect(() => {
    picker.current = new ColorPicker({ appendTo: host.current, hex: value });
    picker.current.onChange = (p) => onChange(p.hex);
    return () => picker.current.destroy();
  }, []);

  useEffect(() => {
    if (picker.current && picker.current.hex !== value) picker.current.hex = value;
  }, [value]);

  return <div ref={host} />;
}
```

Assigning an unchanged value fires nothing, so the guard above is belt and
braces rather than a hard requirement.

## How it works

**The ring** is 360 one-degree canvas arcs, each overdrawn slightly so no seams
show between them. Hue 0 sits at 3 o'clock and increases clockwise.

**The triangle** is the interesting part. Its corners are the pure hue, white
and black, and an HSV color is *exactly* the linear RGB blend of those three:

```
hsv(h, s, v)  =  (s·v)·hue  +  (v − s·v)·white  +  (1 − v)·black
```

So rendering is a plain barycentric interpolation across the triangle -- no
color-space conversion per pixel, just three weights and a blend. Inverting the
same weights turns a pointer position back into saturation and brightness. The
shape is then re-cut with a filled path so its edges come out antialiased
instead of as the stair-step the per-pixel test would leave.

**Dragging** anywhere inside the ring moves the triangle handle, including the
gaps at the triangle's corners, where the position is clamped onto the nearest
edge. Without that, a drag that strayed into a corner gap would grab the hue
ring out from under the pointer and shift the hue mid-drag.

**Everything is drawn at `devicePixelRatio`**, so the wheel stays sharp on
retina displays.

## Accessibility

Both handles are focusable and expose `role="slider"` with a live
`aria-valuetext` (the hue in degrees; saturation, brightness and hex for the
triangle).

| Key | Hue handle | Triangle handle |
| --- | --- | --- |
| `←` / `→` | hue −1° / +1° | saturation −1 / +1 |
| `↑` / `↓` | hue +1° / −1° | brightness +1 / −1 |
| `Shift` + arrow | ×10 | ×10 |
| `Home` | hue 0° | white |
| `End` | hue 359° | full saturation and brightness |

The handle outline flips between white and dark depending on the color beneath
it, so it stays visible across the whole range.

## Browser support

Any browser with **Pointer Events** and **canvas 2D** -- Chrome, Edge, Firefox
and Safari 13+. The bundles target ES2018. Touch and pen work through the same
pointer path as the mouse, and the picker uses pointer capture, so a drag keeps
tracking after the pointer leaves the ring.

## Building

The source is `src/color-picker.ts` and `src/color-picker.css`; everything in
`dist/` is generated and committed so the demo page and GitHub Pages can load it
directly.

```sh
npm install
npm run build      # tsc for declarations, esbuild for the bundles
npm run typecheck  # types only, no output
```

| File | Size | gzip | What it is |
| --- | --- | --- | --- |
| `dist/color-picker.js` | 14.4 kB | 4.4 kB | Readable bundle; defines the global `ColorPicker`. |
| `dist/color-picker.min.js` | 8.0 kB | 3.3 kB | Same, minified. |
| `dist/color-picker.css` | 833 B | 388 B | Stylesheet. |
| `dist/color-picker.min.css` | 680 B | 360 B | Same, minified. |
| `dist/color-picker.d.ts` | 2.7 kB | – | Type declarations. |

The JS bundle is an IIFE that assigns the class to `ColorPicker`, and also to
`module.exports` when one exists -- so a script tag, `require()` and a bundler
all end up with the same class.

```
src/color-picker.ts    the picker
src/color-picker.css   the styles
scripts/build.mjs      esbuild pipeline
index.html             the demo, published to GitHub Pages
dist/                  generated, committed
```

## License

MIT

---
This repo is brought to you by:

<table>
  <tbody>
    <tr>
      <td align="center">
        <img width="150" height="150"
        src="https://avatars2.githubusercontent.com/u/12079044?s=150&v=4"/>
        <br/>
        <a href="https://github.com/mansi1">Michael Mannseicher</a>
        <br/>
        <a href="https://michael.mannseicher.com">Website</a>
      </td>
    </tr>
  </tbody>
</table>