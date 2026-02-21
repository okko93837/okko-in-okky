/**
 * 스타일 옵션 프롬프트 추가 테스트
 * - 기존 tryon.mjs 의 base prompt 는 그대로 유지
 * - styleOptions 배열을 뒤에 붙여서 결과 확인
 *
 * 모델 전환:
 *   OpenAI  → # 주석처리
 *   Gemini  → gemini-2.5-flash-image (Nano Banana) 사용
 */

// ── OpenAI (크레딧 소진 시 주석처리) ─────────────────────────
// import OpenAI, { toFile } from 'openai';
// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// if (!OPENAI_API_KEY) { console.error('OPENAI_API_KEY 없음'); process.exit(1); }
// const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });

// ── Gemini ────────────────────────────────────────────────────
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error('GEMINI_API_KEY 없음 — .env.local 확인'); process.exit(1); }

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const OUTPUT_DIR = path.join(ROOT, 'public/tryon-test');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── 기존 베이스 프롬프트 (변경 금지) ─────────────────────────
const BASE_PROMPT = `
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

// ── 사용자 선택 스타일 옵션 (나중에 파이프라인에서 동적으로 추가) ──
// BASE_PROMPT 뒤에 붙이되, 같은 내용을 두 번 반복해 모델이 재귀적으로 검토하게 함
const STYLE_OPTIONS = {
  tuckIn: [
    'STYLE RULE: The top garment must be fully tucked into the bottom garment.',
    'RE-CHECK BEFORE GENERATING: Is the top garment fully tucked into the bottom? If not, correct it.',
  ].join('\n'),
  tuckOut: [
    'STYLE RULE: The top garment must be completely UNTUCKED — the hem must hang freely outside and over the waistband. Do NOT tuck the top in, even if Image 1 shows it tucked.',
    'RE-CHECK BEFORE GENERATING: Is the top garment hanging outside the waistband, fully untucked? If it is tucked in, correct it now.',
  ].join('\n'),
  sleeveRollUp: [
    'STYLE RULE: The sleeves of the top garment must be rolled up to the elbow.',
    'RE-CHECK BEFORE GENERATING: Are the sleeves rolled up to the elbow? If not, correct it.',
  ].join('\n'),
  sleeveRollDown: [
    'STYLE RULE: The sleeves of the top garment must remain fully unrolled at full length.',
    'RE-CHECK BEFORE GENERATING: Are the sleeves fully unrolled? If not, correct it.',
  ].join('\n'),
};

// ── 이번 테스트: 상의 밖으로 빼기 + 소매 롤업 ───────────────
const finalPrompt = [BASE_PROMPT, STYLE_OPTIONS.tuckOut, STYLE_OPTIONS.sleeveRollUp].join('\n\n');

function toInlinePart(filePath, mimeType) {
  const data = fs.readFileSync(filePath).toString('base64');
  return { inlineData: { data, mimeType } };
}

async function run() {
  console.log('스타일 옵션 테스트: 상의 밖으로 빼기 + 소매 롤업 (tuckOut + sleeveRollUp)');
  console.log('모델: public/models2/female-normal.png');
  console.log('상의: public/closet/musinsa_top.jpg');
  console.log('하의: public/closet/musinsa_pants.jpg');
  console.log('신발: public/closet/musinsa_shoes2.jpg');
  console.log('AI 모델: gemini-2.5-flash-image');
  console.log('');

  const contents = [
    { text: finalPrompt },
    toInlinePart(path.join(ROOT, 'public/models2/female-normal.png'), 'image/png'),
    toInlinePart(path.join(ROOT, 'public/closet/musinsa_top.jpg'),    'image/jpeg'),
    toInlinePart(path.join(ROOT, 'public/closet/musinsa_pants.jpg'),  'image/jpeg'),
    toInlinePart(path.join(ROOT, 'public/closet/musinsa_shoes2.jpg'), 'image/jpeg'),
  ];

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: contents }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) {
    const textPart = parts.find(p => p.text);
    console.error('이미지 응답 없음. 텍스트:', textPart?.text ?? '(없음)');
    process.exit(1);
  }

  const outputPath = path.join(OUTPUT_DIR, 'tryon-female-normal-musinsa-tuckout-rollup.png');
  fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, 'base64'));
  console.log(`완료: public/tryon-test/tryon-female-normal-musinsa-tuckout-rollup.png`);
}

run().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
