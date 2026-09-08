# color-picker

A color picker in TypeScript: a hue ring with an HSV triangle inside it. The
triangle's corners are the pure hue, white and black, and it rotates so the hue
corner always points at the hue handle. No runtime dependencies.

From the CDN -- no install, no build:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Mansi1/color-picker@v1.0.0/dist/color-picker.min.css">
<script src="https://cdn.jsdelivr.net/gh/Mansi1/color-picker@v1.0.0/dist/color-picker.min.js"></script>
```

Pin the tag as above and the file is immutable and cached for a year. Swapping
`@v1.0.0` for `@main` tracks the branch instead, but jsDelivr recaches those
every 12 hours.

Or serve it yourself:

```html
<link rel="stylesheet" href="dist/color-picker.min.css">
<script src="dist/color-picker.min.js"></script>

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

The script tag defines the global `ColorPicker`. In TypeScript or with a
bundler, install it and import instead -- the package ships its own types:

```sh
npm install @mansi1/color-picker
```

```ts
import ColorPicker, { type ColorPickerOptions, type RGB, type HSV } from '@mansi1/color-picker';
import '@mansi1/color-picker/dist/color-picker.css';

const picker = new ColorPicker({ hex: '#ff0000' });
```

See it live at <https://mansi1.github.io/color-picker/>, or open
`index.html` locally for the same demo.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `appendTo` | – | Element the picker is appended to. Omit it and mount `picker.root` yourself. |
| `hex` / `rgb` / `hsv` | `'#ff0000'` | Initial color (first one given wins). |
| `wheelDiameter` | `200` | Outer diameter of the ring, in px. |
| `wheelThickness` | `20` | Ring thickness, in px. |
| `handleDiameter` | `16` | Handle size, in px. |
| `onChange` | – | Called with the picker whenever the color changes. |

## API

- `picker.hex` — `'#rrggbb'`, readable and writable. Invalid strings are ignored,
  so it is safe to wire straight to an `<input>`.
- `picker.rgb` — `[r, g, b]`, each `0–255`.
- `picker.hsv` — `[h, s, v]`, `0–360` and `0–100`.
- `picker.root` — the picker's DOM element.
- `picker.destroy()` — removes it from the DOM.

Assigning to any of these updates the UI and fires `onChange` (only when the
value actually changed). Setting a gray or black color keeps the existing hue
and saturation handle positions rather than snapping them back to red.

Static helpers are also exposed: `ColorPicker.hsv2rgb`, `rgb2hsv`, `rgb2hex`,
`hex2rgb` (`hex2rgb` returns `null` for anything unparseable). They are named
exports of the module too.

## Accessibility

Both handles are focusable and expose `role="slider"`. Arrow keys move the
focused handle by 1 (hue in degrees, saturation/brightness in percent), Shift
by 10, and Home/End jump to the extremes.

Dragging anywhere inside the ring moves the triangle handle -- including the
gaps at the triangle's corners, where the position is clamped onto the nearest
edge -- so the hue never shifts by accident mid-drag.

## Building

The source is `src/color-picker.ts` and `src/color-picker.css`; everything in
`dist/` is generated and committed so the demo pages and GitHub Pages can load
it directly.

```sh
npm install
npm run build     # tsc for types, esbuild for the bundles
npm run typecheck
```

| File | What it is |
| --- | --- |
| `dist/color-picker.js` | Readable bundle; defines the global `ColorPicker`. |
| `dist/color-picker.min.js` | Same, minified. |
| `dist/color-picker.css` | Stylesheet. |
| `dist/color-picker.min.css` | Same, minified. |
| `dist/color-picker.d.ts` | Type declarations. |

## License

MIT
