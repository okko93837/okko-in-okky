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

const prompt = `
참고 이미지의 의상과 배경을 그대로 유지한 채 체형만 변경한 20대 한국 여성 전신 실사 사진.

체형: 통통한 체형. 얼굴, 팔, 배, 허벅지, 종아리 전체에 살이 많은 과체중 몸매. 어깨와 허리가 넓음.

의상 절대 변경 금지:
- 상의: 참고 이미지와 동일한 보라색 반팔 크루넥 티셔츠, 상의를 반바지 안에 집어넣은 형태 그대로 유지
- 하의: 참고 이미지와 동일한 보라색 반바지, 색상과 스타일 동일
- 신발: 참고 이미지와 동일한 네이비색 로우탑 캔버스화, 색상과 스타일 동일

프레이밍: 머리 위부터 발끝까지 여백을 두고 전신이 모두 보임. 잘림 없음.
흰색 배경, 실사 느낌, 스튜디오 조명, 정면, 세로 구도, 중앙 정렬. 텍스트 없음, 워터마크 없음.
`.trim();

async function generate() {
  console.log('생성 중... 여성 통통한 체형');

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
  const outputPath = path.join(OUTPUT_DIR, 'female-plus.png');
  fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
  console.log(`완료: ${outputPath}`);
}

generate().catch(err => {
  console.error('실패:', err.message);
  if (err.status) console.error('status:', err.status);
  if (err.error) console.error('error:', JSON.stringify(err.error));
  process.exit(1);
});
