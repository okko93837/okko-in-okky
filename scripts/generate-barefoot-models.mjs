/**
 * 맨발 모델 이미지 생성
 * - public/models/ 의 6개 이미지를 기반으로
 * - 신발만 맨발로 교체, 나머지 모든 것 그대로 유지
 * - 결과: public/models2/
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

const INPUT_DIR  = path.join(ROOT, 'public/models');
const OUTPUT_DIR = path.join(ROOT, 'public/models2');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MODELS = [
  'female-slim.png',
  'female-normal.png',
  'female-plus.png',
  'male-slim.png',
  'male-normal.png',
  'male-plus.png',
];

const prompt = `
You are editing this image. Keep absolutely everything identical — the person's race, gender, age, body type, face, hair, pose, clothing (top and bottom including colors, fabric, pattern, style, and the tucked-in style), white background, lighting, framing, and full-body composition from head to toe.

Change ONLY the footwear: remove the shoes entirely and replace them with bare feet. The bare feet must look natural and realistic, matching the person's skin tone.

Do NOT change anything else whatsoever.
`.trim();

async function generateOne(filename, index) {
  const inputPath  = path.join(INPUT_DIR,  filename);
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`[${index + 1}/${MODELS.length}] 처리 중... ${filename}`);

  const imageFile = await toFile(
    fs.createReadStream(inputPath),
    filename,
    { type: 'image/png' }
  );

  const response = await client.images.edit({
    model: 'gpt-image-1.5',
    image: imageFile,
    prompt,
    size: '1024x1536',
    quality: 'high',
    input_fidelity: 'high',
  });

  const imageData = response.data[0].b64_json;
  fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
  console.log(`  완료: public/models2/${filename}`);
}

async function generateAll() {
  for (let i = 0; i < MODELS.length; i++) {
    await generateOne(MODELS[i], i);
  }
  console.log('\n전체 생성 완료! → public/models2/');
}

generateAll().catch(err => {
  console.error('오류:', err.message);
  if (err.status) console.error('status:', err.status);
  process.exit(1);
});
