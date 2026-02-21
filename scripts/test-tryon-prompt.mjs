/**
 * 가상 피팅 프롬프트 안정성 테스트
 * - 모델 이미지 + 상의/하의/신발 이미지를 함께 넘겨
 * - 3가지 프롬프트 전략을 순서대로 생성해 결과 비교
 * - 출력: public/tryon-test/result-v1.png ~ result-v3.png
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

// ── 입력 이미지 경로 ──────────────────────────────────────────
const MODEL_IMG  = path.join(ROOT, 'public/models/male-normal.png');
const TOP_IMG    = path.join(ROOT, 'public/closet/top.png');
const PANTS_IMG  = path.join(ROOT, 'public/closet/pants.png');
const SHOES_IMG  = path.join(ROOT, 'public/closet/shoes.jpg');

// ── 프롬프트 전략 3가지 ───────────────────────────────────────
const PROMPTS = [
  {
    version: 'v1',
    strategy: '직접 지시형 — 각 이미지 역할을 명확히 분리',
    text: `
첫 번째 이미지는 기본 모델(인물)이고, 두 번째 이미지는 상의, 세 번째 이미지는 하의, 네 번째 이미지는 신발이다.
모델에게 두 번째 이미지의 상의, 세 번째 이미지의 하의, 네 번째 이미지의 신발을 그대로 입혀라.
의상의 색상, 패턴, 디자인, 핏을 원본 그대로 유지하라.
모델의 체형, 포즈, 배경, 촬영 구도는 첫 번째 이미지 그대로 유지하라.
머리부터 발끝까지 전신이 보이도록 프레이밍. 실사 느낌, 흰색 배경, 스튜디오 조명.
    `.trim(),
  },
  {
    version: 'v2',
    strategy: '역할 태그형 — [MODEL] [TOP] [BOTTOM] [SHOES] 레이블 활용',
    text: `
[MODEL]: 첫 번째 이미지의 인물 (체형, 포즈, 배경을 그대로 유지)
[TOP]: 두 번째 이미지의 상의를 [MODEL]에게 입힘 (색상·디자인·핏 원본 유지)
[BOTTOM]: 세 번째 이미지의 하의를 [MODEL]에게 입힘 (색상·디자인·핏 원본 유지)
[SHOES]: 네 번째 이미지의 신발을 [MODEL]에게 신김 (색상·디자인 원본 유지)

위 4개 이미지를 합성하여 [MODEL]이 [TOP], [BOTTOM], [SHOES]를 착용한 전신 실사 사진을 생성하라.
배경 흰색, 정면, 세로 구도, 머리부터 발끝까지 전신 보임. 텍스트·워터마크 없음.
    `.trim(),
  },
  {
    version: 'v3',
    strategy: '가상 피팅 명시형 — virtual try-on 태스크 직접 명시',
    text: `
Virtual try-on task.
Reference images in order: (1) person model, (2) top garment, (3) bottom garment, (4) shoes.
Generate a photorealistic full-body image of the person from image (1) wearing exactly:
- the top from image (2): preserve its exact color, pattern, and fit
- the bottom from image (3): preserve its exact color, pattern, and fit
- the shoes from image (4): preserve its exact color and style
Keep the model's body shape, pose, and white studio background identical to image (1).
Full body visible from head to toe, portrait orientation, centered, no text, no watermark.
    `.trim(),
  },
];

async function loadImage(filePath, filename, mimeType) {
  return toFile(fs.createReadStream(filePath), filename, { type: mimeType });
}

async function runTest(promptObj) {
  const { version, strategy, text } = promptObj;
  console.log(`\n[${version}] ${strategy}`);
  console.log('생성 중...');

  const [modelFile, topFile, pantsFile, shoesFile] = await Promise.all([
    loadImage(MODEL_IMG,  'model.png',  'image/png'),
    loadImage(TOP_IMG,    'top.png',    'image/png'),
    loadImage(PANTS_IMG,  'pants.png',  'image/png'),
    loadImage(SHOES_IMG,  'shoes.jpg',  'image/jpeg'),
  ]);

  const response = await client.images.edit({
    model: 'gpt-image-1-mini',
    image: [modelFile, topFile, pantsFile, shoesFile],
    prompt: text,
    size: '1024x1536',
    quality: 'high',
  });

  const imageData = response.data[0].b64_json;
  const outputPath = path.join(OUTPUT_DIR, `result-${version}.png`);
  fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
  console.log(`  완료: ${outputPath}`);
}

async function runAll() {
  for (const promptObj of PROMPTS) {
    await runTest(promptObj);
  }
  console.log('\n\n=== 전체 테스트 완료 ===');
  console.log('결과물: public/tryon-test/result-v1.png ~ result-v3.png');
  console.log('세 결과를 비교해 가장 안정적인 프롬프트 전략을 선택하세요.');
}

runAll().catch(err => {
  console.error('오류:', err.message);
  if (err.status) console.error('status:', err.status);
  if (err.error) console.error('detail:', JSON.stringify(err.error, null, 2));
  process.exit(1);
});
