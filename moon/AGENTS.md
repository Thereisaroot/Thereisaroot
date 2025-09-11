# Repository Guidelines

## 프로젝트 구조 및 모듈 구성
- 애플리케이션 코드는 `src/`에 두고 기능/도메인 기준으로 그룹화합니다(예: `src/auth/`, `src/api/`).
- 테스트는 `tests/`에 두고 `src/` 경로를 미러링합니다(예: `src/api/user.py` → `tests/api/test_user.py`).
- 스크립트와 개발 도구는 `scripts/`에 둡니다(예: `scripts/dev.sh`, `scripts/seed.ts`).
- 정적 자산은 `assets/`, 문서는 `docs/`에 보관합니다.
- 예시 레이아웃: `src/`, `tests/`, `scripts/`, `assets/`, `docs/`, `Makefile`, `README.md`.

## 빌드, 테스트, 로컬 개발 명령
- 로컬 개발: `make dev` (또는 스택별 서버 `npm run dev`, `uvicorn app:app --reload`).
- 테스트 실행: `make test` (예: `pytest -q` 또는 `npm test`).
- 빌드/컴파일: `make build` (예: `tsc -p .` 또는 패키징 단계).
- 린트/포맷: `make lint` / `make format` (예: `eslint .`, `prettier --write .`, `ruff check .`, `black .`).
- `Makefile`이 없다면 `package.json` 스크립트나 `scripts/` 셸 스크립트로 대체하세요.

## 코딩 스타일 및 네이밍 규칙
- 들여쓰기: JS/TS 2칸, Python 4칸. 최대 줄 길이 88–100.
- 네이밍: Python 모듈/함수는 `snake_case`, JS/TS 함수는 `camelCase`, 클래스는 `PascalCase`, 코드가 아닌 파일명은 kebab-case.
- 도구: JS/TS는 Prettier+ESLint, Python은 Black+Ruff 권장. 커밋 전 포맷터 실행.

## 테스트 가이드라인
- `tests/`는 `src/`를 미러링하고 파일명은 `test_*.py`(Python) 또는 `*.spec.ts`/`*.test.ts`(JS/TS).
- 변경 코드 기준 라인 커버리지 ≥80%를 목표로 합니다. 버그 수정 전 재현 테스트를 먼저 추가하세요.
- 빠른 실행: `make test` 또는 `pytest -q` / `npm test`. 필요 시 마커/태그로 범위를 좁히세요.

## 커밋 및 PR 가이드라인
- Conventional Commits 사용: `feat: …`, `fix: …`, `chore: …`, `docs: …`, `refactor: …`, `test: …`.
- 커밋은 단일 목적에 집중하고, 명령형 제목과 간결한 본문으로 “이유”를 설명하세요.
- PR은 목적, 테스트 방법, 연결 이슈(`Closes #123`), UI 변경 시 스크린샷을 포함하세요.

## 보안 및 설정 팁
- 비밀값은 커밋하지 마세요. `.env.local`(gitignore) 사용, 안전한 기본값의 `.env.example`를 유지하세요.
- 의존성은 버전을 고정하고 락파일을 같은 PR에서 업데이트하세요. 제3자 라이선스도 확인하세요.

## 에이전트 전용 지침
- 저장소 전반에 본 가이드를 준수하세요. 변경은 최소·정밀하게 하고 무관한 수정은 피하세요.
- 명령/디렉터리/도구를 추가하면 `README.md`와 본 문서를 즉시 갱신하세요.
