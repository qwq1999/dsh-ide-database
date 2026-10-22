import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

const banner = `window.__ModuleLoader__.load({
  id: "dsh-ide-database",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
`
const footer = `
    return module.exports;
  },
});
`

await mkdir('lib', { recursive: true })
const result = await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  banner: { js: banner },
  footer: { js: footer },
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
  ],
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
  sourcemap: false,
  minify: false,
})
const output = result.outputFiles[0]
if (output === undefined) throw new Error('esbuild produced no client bundle')
await writeFile('lib/client.js', output.text)
console.log(`client bundle written: lib/client.js (${(output.text.length / 1024).toFixed(1)} KiB)`)
