해커톤 제출 문서를 생성하고 okky-lab/vibe-coding-hackathon 레포에 PR을 생성합니다.

## 실행 절차

1. 사용자에게 아래 필수 정보를 확인합니다 (이미 알고 있는 정보는 자동 채움):
   - 팀명
   - 프로젝트명
   - GitHub 저장소 URL
   - 데모 URL 또는 실행 방법
   - 문제 정의
   - 한 줄 소개
   - 팀 소개 및 역할

2. 선택 정보도 가능하면 수집합니다:
   - 기술 스택 (ADR.md 참조)
   - 해결 방식 (SPEC.md 참조)
   - 검증 방법
   - 데모 요약
   - 라이선스/출처
   - 발표 자료 URL

3. 아래 스크립트를 실행합니다:
```bash
python3 .agents/skills/hackathon-submission/scripts/create_submission_pr.py \
  --team-name "팀명" \
  --project-name "프로젝트명" \
  --repo-url "https://github.com/okko93837/okko-in-okky" \
  --demo-url-or-run-method "데모URL 또는 실행방법" \
  --problem-definition "문제 정의" \
  --one-liner "한 줄 소개" \
  --team-roles "팀원 역할" \
  --solution "해결 방식" \
  --tech-stack "기술 스택"
```

4. 스크립트가 fork → 브랜치 생성 → 제출 문서 렌더링 → 커밋 → PR 생성까지 자동 수행합니다.

5. 결과로 나온 PR URL을 사용자에게 전달합니다.

## 주의사항
- gh CLI 인증이 필요합니다 (`gh auth status`로 확인)
- fork 기반 워크플로우입니다. upstream에 직접 push하지 않습니다.
- `--github-dry-run` 플래그로 PR 생성 없이 테스트 가능합니다.
