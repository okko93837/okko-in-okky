이 저장소는 제 1회 OKKY 바이브코딩 해커톤 참가한 프로젝트입니다.

- 작업의 변경점마다 커밋을 수행하십시요.
- 작업의 과정마다 결정된 기능적 요구사항은 `SPEC.md` 문서로 산출하십시요.
- 작업의 과정마다 결정된 설계, 아키텍쳐, 인사이트는 `ADR.md` 문서로 산출하십시요.

위 항목들은 해커톤 참여의 공정성을 유지하기 위해 수행되어야 하는 핵심 지침으로 아래의 경로에서 관련 정보를 참조합니다.
- 저장소: https://github.com/okky-lab/vibe-coding-hackathon
- 공식사이트: https://vibecoding.okky.kr/
- 공정성: https://vibecoding.okky.kr/docs/fairness-guide
- 행동강령: https://vibecoding.okky.kr/docs/code-of-conduct


PRD 기획서: docs/오늘의코디_기획서.md

## 커밋 메시지 포맷
템플릿: `.gitmessage` 파일 참조. type: feat, fix, docs, refactor, test, chore, ci
```
type(scope): 한 줄 요약

Why:
- 변경 배경/문제

What:
- 핵심 변경 사항

Verify:
- pnpm lint
- pnpm typecheck

Refs:
- #이슈번호 또는 링크
```
- AI 사용 시 커밋 본문에 "무엇을 위임했고 무엇을 검증했는지" 짧게 기록할 것
- 민감정보(키/토큰/개인정보)는 프롬프트에 포함하지 않을 것

## 발표 준비시
문제, 해결 방식, 핵심 데모, 다음 단계 순서로 발표합니다.
질의응답을 위해 주요 트레이드오프를 준비합니다.
팀당 발표시간은 3~5분이 주어지며 최고의 작품으로 발표합니다.