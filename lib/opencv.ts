/**
 * OpenCV.js 얼굴 블러 유틸 (Web Worker 기반)
 * - 메인 스레드 블로킹 없이 얼굴 감지 + 모자이크 처리
 * - Worker와 Transferable ArrayBuffer로 통신
 */

/** 매 호출마다 새 Worker 생성 (FS 충돌 방지) */
function createWorker(): Promise<Worker> {
  const w = new Worker('/opencv-worker.js');

  return new Promise<Worker>((resolve, reject) => {
    const timeout = setTimeout(() => {
      w.terminate();
      reject(new Error('OpenCV.js 초기화 타임아웃 (60초)'));
    }, 60000);

    const handler = (e: MessageEvent) => {
      if (e.data.type === 'init_done') {
        w.removeEventListener('message', handler);
        clearTimeout(timeout);
        resolve(w);
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        clearTimeout(timeout);
        w.terminate();
        reject(new Error(e.data.error));
      }
    };

    w.addEventListener('message', handler);
    w.postMessage({ type: 'init' });
  });
}

/** 이미지 data URL에서 얼굴 감지 + 모자이크 처리 → 결과 data URL 반환 */
export async function mosaicFaces(dataUrl: string): Promise<string> {
  const w = await createWorker();

  // data URL → Canvas → ImageData
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Worker에 전송 (Transferable)
  const result = await new Promise<{
    data: ArrayBuffer;
    width: number;
    height: number;
  }>((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'result') {
        w.removeEventListener('message', handler);
        resolve(e.data);
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        reject(new Error(e.data.error));
      }
    };

    w.addEventListener('message', handler);

    const buffer = imageData.data.buffer.slice(0);
    w.postMessage(
      {
        type: 'process',
        data: { imageData: buffer, width: canvas.width, height: canvas.height },
      },
      [buffer],
    );
  });

  // Worker 종료
  w.terminate();

  // 결과 → Canvas → data URL
  const resultImageData = new ImageData(
    new Uint8ClampedArray(result.data),
    result.width,
    result.height,
  );
  ctx.putImageData(resultImageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** data URL에서 Image 객체 로드 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
