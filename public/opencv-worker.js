/**
 * OpenCV.js 얼굴 블러 Web Worker
 * FaceDetectorYN (YuNet) 기반 — face-blur-demo/index.html 패턴 참조
 * OpenCV.js 4.x (latest) 사용
 */

let cv = null;

self.onmessage = async function (e) {
  const { type, data } = e.data;

  if (type === 'init') {
    try {
      // 1) OpenCV.js 로드
      self.Module = {
        onRuntimeInitialized: async () => {
          try {
            cv = self.cv;

            // 2) 초기화 직후 YuNet 모델도 로드
            var response = await fetch('/face_detection_yunet_2023mar.onnx');
            if (!response.ok) throw new Error('YuNet 다운로드 실패: ' + response.status);
            var buf = await response.arrayBuffer();
            cv.FS_createDataFile('/', 'yunet.onnx', new Uint8Array(buf), true, false, false);

            self.postMessage({ type: 'init_done' });
          } catch (err) {
            self.postMessage({ type: 'error', error: '모델 로드 실패: ' + err.message });
          }
        },
      };
      importScripts('https://docs.opencv.org/4.x/opencv.js');
    } catch (err) {
      self.postMessage({ type: 'error', error: 'OpenCV.js 로드 실패: ' + err.message });
    }
    return;
  }

  if (type === 'process') {
    try {
      var imageData = data.imageData;
      var width = data.width;
      var height = data.height;

      // ImageData → RGBA Mat
      var rgba = new Uint8ClampedArray(imageData);
      var src = cv.matFromImageData(new ImageData(rgba, width, height));

      // RGBA → BGR (FaceDetectorYN은 3채널 BGR 입력 필요)
      var bgr = new cv.Mat();
      cv.cvtColor(src, bgr, cv.COLOR_RGBA2BGR);

      // FaceDetectorYN 생성 + 감지
      var detector = new cv.FaceDetectorYN(
        '/yunet.onnx', '', new cv.Size(width, height), 0.5, 0.3, 5000
      );
      var faces = new cv.Mat();
      detector.detect(bgr, faces);

      // 결과 버퍼 (RGBA)
      var resultData = new Uint8ClampedArray(src.data);
      var faceCount = faces.rows;

      // 각 얼굴에 모자이크 적용
      var blockSize = 8;
      for (var i = 0; i < faceCount; i++) {
        var fx = Math.round(faces.floatAt(i, 0));
        var fy = Math.round(faces.floatAt(i, 1));
        var fw = Math.round(faces.floatAt(i, 2));
        var fh = Math.round(faces.floatAt(i, 3));

        var x1 = Math.max(0, fx);
        var y1 = Math.max(0, fy);
        var x2 = Math.min(fx + fw, width);
        var y2 = Math.min(fy + fh, height);

        for (var by = y1; by < y2; by += blockSize) {
          for (var bx = x1; bx < x2; bx += blockSize) {
            var bw = Math.min(blockSize, x2 - bx);
            var bh = Math.min(blockSize, y2 - by);

            var sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
            for (var py = by; py < by + bh; py++) {
              for (var px = bx; px < bx + bw; px++) {
                var idx = (py * width + px) * 4;
                sumR += resultData[idx];
                sumG += resultData[idx + 1];
                sumB += resultData[idx + 2];
                sumA += resultData[idx + 3];
                count++;
              }
            }
            var avgR = Math.round(sumR / count);
            var avgG = Math.round(sumG / count);
            var avgB = Math.round(sumB / count);
            var avgA = Math.round(sumA / count);

            for (var py2 = by; py2 < by + bh; py2++) {
              for (var px2 = bx; px2 < bx + bw; px2++) {
                var idx2 = (py2 * width + px2) * 4;
                resultData[idx2] = avgR;
                resultData[idx2 + 1] = avgG;
                resultData[idx2 + 2] = avgB;
                resultData[idx2 + 3] = avgA;
              }
            }
          }
        }
      }

      // 메모리 해제
      src.delete();
      bgr.delete();
      faces.delete();
      detector.delete();

      // Transferable로 반환
      self.postMessage(
        { type: 'result', data: resultData.buffer, width: width, height: height, faceCount: faceCount },
        [resultData.buffer],
      );
    } catch (err) {
      self.postMessage({ type: 'error', error: '얼굴 처리 실패: ' + err.message });
    }
    return;
  }
};
