import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const source = join(__dirname, 'source-icons', 'logo-source.png')

// Sampled from the source art's own background fill — flattening onto this
// exact color makes the illustrated rounded corners disappear seamlessly
// (transparent corners become indistinguishable from the rounded-square fill),
// giving a genuinely full-bleed square for the "any"-purpose icons, and a
// safe base to pad further for the maskable variant.
const BG = { r: 31, g: 31, b: 30 }

async function flattenSquare(size) {
  return sharp(source).flatten({ background: BG }).resize(size, size).png().toBuffer()
}

const jobs = [
  { out: 'icon-192.png', size: 192 },
  { out: 'icon-512.png', size: 512 },
  { out: 'apple-touch-icon.png', size: 180 },
]

for (const job of jobs) {
  const buf = await flattenSquare(job.size)
  await sharp(buf).toFile(join(publicDir, job.out))
  console.log(`generated ${job.out} (${job.size}x${job.size})`)
}

// Maskable: extra safe-zone padding — shrink the art to ~72% and center it on
// a full-bleed canvas of the same background color, since OS mask shapes
// (circle, squircle, etc.) crop anything outside the inner ~80% safe zone.
const MASKABLE_SIZE = 512
const artSize = Math.round(MASKABLE_SIZE * 0.72)
const art = await sharp(source).flatten({ background: BG }).resize(artSize, artSize).png().toBuffer()
const offset = Math.round((MASKABLE_SIZE - artSize) / 2)
await sharp({
  create: {
    width: MASKABLE_SIZE,
    height: MASKABLE_SIZE,
    channels: 3,
    background: BG,
  },
})
  .composite([{ input: art, left: offset, top: offset }])
  .png()
  .toFile(join(publicDir, 'icon-maskable-512.png'))
console.log('generated icon-maskable-512.png (512x512, safe-zone padded)')

// Browser tab favicon — SVG wrapping the same flattened art via a data URI,
// so /icon.svg keeps working as a single reference without hand-drawing a
// vector version of a raster illustration.
const faviconArt = await flattenSquare(512)
const base64 = faviconArt.toString('base64')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><image width="512" height="512" href="data:image/png;base64,${base64}"/></svg>\n`
const { writeFileSync } = await import('node:fs')
writeFileSync(join(publicDir, 'icon.svg'), svg)
console.log('generated icon.svg (raster-embedded)')
