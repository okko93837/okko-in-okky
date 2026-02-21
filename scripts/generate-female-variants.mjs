import OpenAI, { toFile } from 'openai';
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
const REFERENCE_IMAGE = path.join(OUTPUT_DIR, 'female-normal-sample.png');

const TARGETS = [
  {
    filename: 'female-slim.png',
    label: '여성 마른 체형',
    bodyDesc: '매우 마른 체형 — 가느다란 팔다리, 좁은 어깨와 골반, 저체중에 가까운 슬림한 몸매',
  },
  {
    filename: 'female-plus.png',
    label: '여성 뚱뚱한 체형',
    bodyDesc: '통통한 체형 — 넓은 어깨와 허리, 배·허벅지·팔에 살이 많은 과체중 몸매',
  },
];

async function generateOne(target, index) {
  const outputPath = path.join(OUTPUT_DIR, target.filename);
  console.log(`[${index + 1}/${TARGETS.length}] 생성 중... ${target.label}`);

  const prompt = `
참고 이미지와 동일한 의상·스타일을 유지하되, 체형만 "${target.bodyDesc}"으로 바꾼 20대 한국 여성 전신 실사 사진.
의상은 참고 이미지와 완전히 동일하게:
- 같은 보라색 반팔 티셔츠, 상의를 하의 안에 집어 넣은 형태 그대로
- 같은 보라색 반바지
- 같은 네이비색 굽 낮은 캔버스화(색상·스타일 변경 금지)
흰색 배경. 머리 위부터 발끝까지 여백을 두고 전신이 모두 보이도록 프레이밍, 잘림 없음.
실사 느낌, 스튜디오 조명, 정면, 세로 구도, 중앙 정렬. 텍스트 없음, 워터마크 없음.
  `.trim();

  try {
    const imageFile = await toFile(fs.createReadStream(REFERENCE_IMAGE), 'reference.png', { type: 'image/png' });

    const response = await client.images.edit({
      model: 'gpt-image-1-mini',
      image: imageFile,
      prompt,
      size: '1024x1536',
      quality: 'high',
    });

    const imageData = response.data[0].b64_json;
    fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
    console.log(`  완료: ${outputPath}`);
  } catch (err) {
    console.error(`  실패 (${target.label}):`, err.message);
    if (err.status) console.error('  status:', err.status);
    if (err.error) console.error('  error:', JSON.stringify(err.error));
  }
}

async function generateAll() {
  for (let i = 0; i < TARGETS.length; i++) {
    await generateOne(TARGETS[i], i);
  }
  console.log('\n전체 생성 완료!');
}

generateAll();
