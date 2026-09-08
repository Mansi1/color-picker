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
/** h: 0..360, s/v: 0..100 -> [r, g, b] each 0..255. */
export declare function hsv2rgb(h: number, s: number, v: number): RGB;
export declare function rgb2hsv(r: number, g: number, b: number): HSV;
export declare function rgb2hex(rgb: RGB): string;
/** Accepts #rgb, #rgba, #rrggbb, #rrggbbaa (alpha is ignored). null if invalid. */
export declare function hex2rgb(hex: string): RGB | null;
export default class ColorPicker {
    static readonly hsv2rgb: typeof hsv2rgb;
    static readonly rgb2hsv: typeof rgb2hsv;
    static readonly rgb2hex: typeof rgb2hex;
    static readonly hex2rgb: typeof hex2rgb;
    readonly wheelDiameter: number;
    readonly wheelThickness: number;
    readonly handleDiameter: number;
    onChange: ((picker: ColorPicker) => void) | null;
    /** The picker's DOM element. */
    readonly root: HTMLDivElement;
    private _hsv;
    private _dragging;
    private _drawnHue;
    private readonly _triSize;
    private readonly _triRadius;
    private readonly _triangleCanvas;
    private readonly _hueHandle;
    private readonly _svHandle;
    constructor(options?: ColorPickerOptions);
    private _makeHandle;
    private _local;
    private _vertices;
    private _inCore;
    private _onPointerDown;
    private _onPointerMove;
    private _onPointerUp;
    private _applyPointer;
    private _onKeyDown;
    get hsv(): HSV;
    set hsv(hsv: HSV);
    get rgb(): RGB;
    set rgb(rgb: RGB);
    get hex(): string;
    /** Invalid strings are ignored, so this is safe to wire to an `<input>`. */
    set hex(hex: string);
    private _render;
    /** Remove the picker from the DOM. */
    destroy(): void;
}
