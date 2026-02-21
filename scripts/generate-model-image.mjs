import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const OUTPUT_DIR = path.join(__dirname, '../public/models');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const COMMON_SUFFIX = `
보라색 반팔 티셔츠와 보라색 반바지를 착용. 신발은 네이비색 굽 낮은 캔버스화.
배경은 순수한 흰색.
머리 위부터 발끝까지 여백을 두고 전신이 모두 보이도록 프레이밍. 잘림 없음.
실사 느낌, 스튜디오 조명, 세로 구도, 중앙 정렬.
텍스트 없음, 워터마크 없음.
`.trim();

const MODELS = [
  {
    filename: 'female-slim.png',
    label: '여성 마른 체형',
    prompt: `20대 한국 여성, 마른 체형(키 대비 날씬한 체형, 저체중에 가까운 슬림한 몸매), 정면을 바라보며 똑바로 서 있는 전신 실사 사진.\n${COMMON_SUFFIX}`,
  },
  {
    filename: 'female-normal.png',
    label: '여성 보통 체형',
    prompt: `20대 한국 여성, 보통 체형(마르지도 뚱뚱하지도 않은 평균 체형), 정면을 바라보며 똑바로 서 있는 전신 실사 사진.\n${COMMON_SUFFIX}`,
  },
  {
    filename: 'female-plus.png',
    label: '여성 뚱뚱한 체형',
    prompt: `20대 한국 여성, 통통한 체형(과체중, 포동포동한 몸매, 배와 허벅지에 살이 있는 체형), 정면을 바라보며 똑바로 서 있는 전신 실사 사진.\n${COMMON_SUFFIX}`,
  },
  {
    filename: 'male-slim.png',
    label: '남성 마른 체형',
    prompt: `20대 한국 남성, 마른 체형(키 대비 날씬한 체형, 저체중에 가까운 슬림한 몸매), 정면을 바라보며 똑바로 서 있는 전신 실사 사진.\n${COMMON_SUFFIX}`,
  },
  {
    filename: 'male-normal.png',
    label: '남성 보통 체형',
    prompt: `20대 한국 남성, 보통 체형(마르지도 뚱뚱하지도 않은 평균 체형), 정면을 바라보며 똑바로 서 있는 전신 실사 사진.\n${COMMON_SUFFIX}`,
  },
  {
    filename: 'male-plus.png',
    label: '남성 뚱뚱한 체형',
    prompt: `20대 한국 남성, 통통한 체형(과체중, 배가 나오고 체격이 크고 살이 많은 체형), 정면을 바라보며 똑바로 서 있는 전신 실사 사진.\n${COMMON_SUFFIX}`,
  },
];

async function generateOne(model, index) {
  const outputPath = path.join(OUTPUT_DIR, model.filename);

  // female-normal-sample.png 기존 파일은 female-normal.png로 대체되므로 스킵 안 함
  console.log(`[${index + 1}/${MODELS.length}] 생성 중... ${model.label}`);

  try {
    const response = await client.images.generate({
      model: 'gpt-image-1-mini',
      prompt: model.prompt,
      n: 1,
      size: '1024x1536',
      quality: 'high',
    });

    const imageData = response.data[0].b64_json;
    fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
    console.log(`  완료: ${outputPath}`);
  } catch (err) {
    console.error(`  실패 (${model.label}):`, err.message);
    if (err.status) console.error('  status:', err.status);
  }
}

async function generateAll() {
  for (let i = 0; i < MODELS.length; i++) {
    await generateOne(MODELS[i], i);
  }
  console.log('\n전체 생성 완료!');
}

generateAll();
