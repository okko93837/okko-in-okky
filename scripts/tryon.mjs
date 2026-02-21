/**
 * 가상 피팅 실행 스크립트
 *
 * 사용법:
 *   node scripts/tryon.mjs [모델키] [상의] [하의] [신발]
 *
 * 예시:
 *   node scripts/tryon.mjs male-normal top pants shoes.jpg
 *   node scripts/tryon.mjs male-normal top2 pants2 shoes2.jpg
 *   node scripts/tryon.mjs  (인자 없으면 MODELS 배열 전체 병렬 실행)
 *
 * 모델 이미지: public/models2/{key}.png
 * 의상 이미지: public/closet/{top}.png, {pants}.png, {shoes}
 * 결과 이미지: public/tryon-test/tryon-{모델키}-{상의}-{하의}-{신발키}.png
 */
import OpenAI, { toFile } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const OUTPUT_DIR = path.join(ROOT, 'public/tryon-test');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const prompt = `
You are performing a virtual try-on task. You are given 4 reference images in this exact order:
  Image 1: The person (model) — keep this person's body, pose, and background exactly as-is.
  Image 2: The TOP garment — replace whatever the model is wearing on top with this exact garment.
  Image 3: The BOTTOM garment — replace whatever the model is wearing on the bottom with this exact garment.
  Image 4: The SHOES — REMOVE the model's current shoes entirely and replace them with ONLY the shoes shown in Image 4. The shoes on the model's feet in the final image must look identical to Image 4.

STRICT RULES — do NOT violate any of these:
- Do NOT keep or reuse any clothing from the model's original outfit (Image 1). All garments must come from Images 2, 3, 4.
- Do NOT change the color, brightness, saturation, pattern, logo, texture, or silhouette of any garment from Images 2, 3, 4.
- Do NOT invent or hallucinate any detail not present in the garment images.
- Do NOT blend, stylize, or reinterpret the garments — copy them exactly as they appear in the reference images.
- SHOES: the footwear in the final image must exactly match Image 4 in color, shape, and style — not Image 1.
- Keep the model's body proportions, face, hair, pose, and white studio background identical to Image 1.
- The final image must show the full body from head to toe including feet, with no cropping.
- Portrait orientation, white background, studio lighting, centered composition. No text, no watermark.
`.trim();

function resolveClothing(name, type) {
  const exts = type === 'shoes' ? ['jpg', 'jpeg', 'png'] : ['png', 'jpg', 'jpeg'];
  for (const ext of exts) {
    const p = path.join(ROOT, `public/closet/${name}.${ext}`);
    if (fs.existsSync(p)) return { filePath: p, ext };
  }
  // 확장자가 이미 포함된 경우
  const p = path.join(ROOT, `public/closet/${name}`);
  if (fs.existsSync(p)) {
    const ext = path.extname(name).slice(1);
    return { filePath: p, ext };
  }
  throw new Error(`의상 파일을 찾을 수 없습니다: public/closet/${name}`);
}

async function runOne({ modelKey, topKey, pantsKey, shoesKey }) {
  const modelPath = path.join(ROOT, `public/models2/${modelKey}.png`);
  if (!fs.existsSync(modelPath)) throw new Error(`모델 파일 없음: ${modelPath}`);

  const top   = resolveClothing(topKey,   'top');
  const pants = resolveClothing(pantsKey, 'pants');
  const shoes = resolveClothing(shoesKey, 'shoes');

  const shoesKey_clean = shoesKey.replace(/\.[^.]+$/, '');
  const outputName = `tryon-${modelKey}-${topKey}-${pantsKey}-${shoesKey_clean}.png`;
  const outputPath = path.join(OUTPUT_DIR, outputName);

  console.log(`  생성 중: ${outputName}`);

  const [modelFile, topFile, pantsFile, shoesFile] = await Promise.all([
    toFile(fs.createReadStream(modelPath),    'model.png',  { type: 'image/png' }),
    toFile(fs.createReadStream(top.filePath), 'top.png',    { type: 'image/png' }),
    toFile(fs.createReadStream(pants.filePath), 'pants.png', { type: 'image/png' }),
    toFile(fs.createReadStream(shoes.filePath), `shoes.${shoes.ext}`, { type: shoes.ext === 'png' ? 'image/png' : 'image/jpeg' }),
  ]);

  const response = await client.images.edit({
    model: 'gpt-image-1.5',
    image: [modelFile, topFile, pantsFile, shoesFile],
    prompt,
    size: '1024x1536',
    quality: 'high',
    input_fidelity: 'high',
  });

  fs.writeFileSync(outputPath, Buffer.from(response.data[0].b64_json, 'base64'));
  console.log(`  완료: public/tryon-test/${outputName}`);
}

// ── CLI 인자 처리 ─────────────────────────────────────────────
const [,, modelKey, topKey, pantsKey, shoesKey] = process.argv;

const jobs = modelKey
  ? [{ modelKey, topKey: topKey ?? 'top', pantsKey: pantsKey ?? 'pants', shoesKey: shoesKey ?? 'shoes' }]
  : [
      { modelKey: 'female-slim',   topKey: 'top', pantsKey: 'pants', shoesKey: 'shoes' },
      { modelKey: 'female-normal', topKey: 'top', pantsKey: 'pants', shoesKey: 'shoes' },
      { modelKey: 'female-plus',   topKey: 'top', pantsKey: 'pants', shoesKey: 'shoes' },
      { modelKey: 'male-slim',     topKey: 'top', pantsKey: 'pants', shoesKey: 'shoes' },
      { modelKey: 'male-normal',   topKey: 'top', pantsKey: 'pants', shoesKey: 'shoes' },
      { modelKey: 'male-plus',     topKey: 'top', pantsKey: 'pants', shoesKey: 'shoes' },
    ];

console.log(`총 ${jobs.length}개 병렬 생성 시작...`);
jobs.forEach(j => console.log(`  - ${j.modelKey} / ${j.topKey} / ${j.pantsKey} / ${j.shoesKey}`));
console.log('');

Promise.all(jobs.map(runOne))
  .then(() => console.log('\n전체 생성 완료!'))
  .catch(err => {
    console.error('오류:', err.message);
    if (err.status) console.error('status:', err.status);
    process.exit(1);
  });
