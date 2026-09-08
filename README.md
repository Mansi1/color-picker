# color-picker

A color picker in plain JavaScript: a hue ring with an HSV triangle inside
it. The triangle's corners are the pure hue, white and black, and it rotates so
the hue corner always points at the hue handle. No dependencies, no build step.

```html
<link rel="stylesheet" href="src/color-picker.css">
<script src="src/color-picker.js"></script>

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

Open `test.html` for a working demo.

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
`hex2rgb` (`hex2rgb` returns `null` for anything unparseable).

## Accessibility

Both handles are focusable and expose `role="slider"`. Arrow keys move the
focused handle by 1 (hue in degrees, saturation/brightness in percent), Shift
by 10, and Home/End jump to the extremes.

Dragging anywhere inside the ring moves the triangle handle -- including the
gaps at the triangle's corners, where the position is clamped onto the nearest
edge -- so the hue never shifts by accident mid-drag.

## License

MIT
