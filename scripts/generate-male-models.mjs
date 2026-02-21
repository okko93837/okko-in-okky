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

const COMMON_OUTFIT = `
의상 절대 변경 금지 (참고 이미지와 동일):
- 상의: 동일한 보라색 반팔 크루넥 티셔츠, 상의를 반바지 안에 집어넣은 스타일 그대로 유지
- 하의: 동일한 보라색 반바지, 색상·스타일·명도·채도 변경 금지
- 신발: 동일한 네이비색 로우탑 캔버스화, 색상·스타일 변경 금지
`.trim();

const TARGETS = [
  {
    filename: 'male-slim.png',
    label: '남성 마른 체형',
    bodyDesc: '마른 체형 — 가느다란 팔다리, 좁은 어깨와 가슴, 저체중에 가까운 슬림한 몸매',
  },
  {
    filename: 'male-normal.png',
    label: '남성 보통 체형',
    bodyDesc: '보통 체형 — 마르지도 뚱뚱하지도 않은 평균 체형, 적당한 어깨 너비와 허리',
  },
  {
    filename: 'male-plus.png',
    label: '남성 통통한 체형',
    bodyDesc: '통통한 체형 — 배가 나오고 얼굴·팔·허벅지에 살이 많은 과체중 몸매, 넓은 어깨와 허리',
  },
];

async function generateOne(target, index) {
  const outputPath = path.join(OUTPUT_DIR, target.filename);
  console.log(`[${index + 1}/${TARGETS.length}] 생성 중... ${target.label}`);

  const prompt = `
참고 이미지의 의상 스타일과 배경을 그대로 유지하되, 인물을 20대 한국 남성으로 바꾸고 체형만 아래와 같이 적용한 전신 실사 사진.

체형: ${target.bodyDesc}

${COMMON_OUTFIT}

프레이밍: 머리 위부터 발끝까지 여백을 두고 전신이 모두 보임. 잘림 없음.
흰색 배경, 실사 느낌, 스튜디오 조명, 정면, 세로 구도, 중앙 정렬. 텍스트 없음, 워터마크 없음.
  `.trim();

  const imageFile = await toFile(
    fs.createReadStream(REFERENCE_IMAGE),
    'reference.png',
    { type: 'image/png' }
  );

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
}

async function generateAll() {
  for (let i = 0; i < TARGETS.length; i++) {
    await generateOne(TARGETS[i], i);
  }
  console.log('\n전체 생성 완료!');
}

generateAll().catch(err => {
  console.error('실패:', err.message);
  if (err.status) console.error('status:', err.status);
  process.exit(1);
});
