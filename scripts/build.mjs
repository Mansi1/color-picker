// Builds dist/ from src/: a readable bundle and a minified one, for both JS
// and CSS. The JS is an IIFE that defines the global `ColorPicker`, so the
// demo pages can keep using a plain <script> tag with no module loader.
import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} | ${pkg.homepage} */`;

// esbuild's IIFE global is the module namespace, so unwrap it to the class
// itself and hand the same class to CommonJS consumers.
const footer =
  'ColorPicker=ColorPicker.default;' +
  'if(typeof module==="object"&&module.exports)module.exports=ColorPicker;';

for (const minify of [false, true]) {
  const suffix = minify ? '.min' : '';

  await esbuild.build({
    entryPoints: ['src/color-picker.ts'],
    outfile: `dist/color-picker${suffix}.js`,
    bundle: true,
    format: 'iife',
    globalName: 'ColorPicker',
    target: ['es2018'],
    banner: { js: banner },
    footer: { js: footer },
    minify,
  });

  await esbuild.build({
    entryPoints: ['src/color-picker.css'],
    outfile: `dist/color-picker${suffix}.css`,
    banner: { css: banner },
    minify,
  });
}

console.log('built dist/');
