# 웹 접근성 검증 기록

## 1. 검증 식별 정보

| 항목 | 값 |
| --- | --- |
| 검증일 | 2026-08-22 |
| 검증 대상 구현 커밋 | `121958399e52e7e4e567ef249d777d8524a2aa84` |
| Task 10 구현 커밋 | `121958399e52e7e4e567ef249d777d8524a2aa84` |
| GitHub Pages 배포 커밋 | `PENDING` |
| GitHub Pages URL | `PENDING` |
| 운영체제 | macOS 26.5.2 (25F84) |
| 자동 검사 브라우저 | Playwright Desktop Chrome / Chromium, `@playwright/test` 1.62.1 |
| 설치된 수동 검사 브라우저 | Google Chrome 151.0.7922.174, Safari 26.5.2, Firefox 148.0.2 |
| 설치된 보조기술 | VoiceOver 10 |
| 자동 접근성 엔진 | axe-core 4.13.0 (`@axe-core/playwright` 4.13.0) |

이 문서는 지정 커밋의 자동 검사 결과와 아직 수행하지 못한 수동 검사 경계를 함께 기록한다. 자동 검사 통과는 웹 접근성 인증이나 모든 WCAG/KWCAG 성공기준 충족을 뜻하지 않는다. `PASS`는 표에 적힌 환경과 증거 범위에서만 사용한다.

결과 상태는 다음 의미로 사용한다.

- `PASS`: 해당 행에 명시한 검사를 실제 실행해 통과했다.
- `FAIL`: 실제 검사에서 결함을 확인했다.
- `NOT RUN`: 이 환경에서 실행 가능하지만 아직 사람이 수행하지 않았다.
- `BLOCKED`: 현재 운영체제, 보조기술 또는 장비로 실행할 수 없다.
- `EXCLUDED`: 사용자가 완료 범위에서 명시적으로 제외했다.
- `N/A`: 이 앱에 해당 콘텐츠나 기능이 없으며 그 근거를 함께 기록했다.

## 2. 자동 검증 결과

| 명령 또는 gate | 결과 | 범위 |
| --- | --- | --- |
| `npm test -- --test-reporter=spec` | PASS — 195 passed, 0 failed, 0 skipped | Node 단위·구조·대비 계산·내보내기 회귀 |
| `npx playwright test e2e/accessibility-audit.spec.js e2e/accessibility-keyboard.spec.js` | PASS — 20 passed | 10개 기본 화면 axe/ARIA와 48단계 Tab 및 9개 키보드 시나리오 |
| `npx playwright test --list` | 124개 발견 | 로컬 123개 실행 대상과 환경변수 없을 때 skip되는 배포 smoke 1개 |
| `npm run test:all` | PASS — Node 195 passed; Playwright 123 passed, deployment 1 skipped; 실패 0 | 전체 로컬 회귀. 배포 smoke는 URL이 없는 로컬 suite에서 의도적으로 skip |
| `npm run test:deployment` | 로컬 PASS — 1 passed; 실제 Pages `PENDING` | Pages형 `/kakaotalk-theme-builder/` subpath fixture에서 asset 2xx·진단 0·axe 0 검증. 최종 SHA 배포 뒤 다시 실행 |

모든 Playwright 테스트는 공통 fixture에서 `console.error`와 `pageerror`를 수집한다. 선언이 없으면 기대 multiset은 0건이며, 예외가 필요할 때에도 `kind + 정확한 message + 정확한 count`가 모두 일치해야 한다. 처리되지 않은 Promise rejection은 Playwright의 `pageerror`로 한 번 수집한다. 각 테스트는 `browser-diagnostics` JSON을 증거로 남긴다.

axe 4.13.0에서 실제 rule이 있는 태그만 사용한다.

| 태그 | axe 4.13.0 rule 수 | 사용 여부 |
| --- | ---: | --- |
| `wcag2a` | 62 | 사용 |
| `wcag2aa` | 3 | 사용 |
| `wcag21a` | 1 | 사용 |
| `wcag21aa` | 3 | 사용 |
| `wcag22a` | 0 | 사용하지 않음 — 빈 태그를 범위 증거로 오인하지 않음 |
| `wcag22aa` | 1 | 사용 |

axe가 자동 판정하지 못하는 읽기 순서, 실제 화면낭독기 발화, 실제 브라우저 확대, Windows 고대비 및 사용자 생성 이미지의 픽셀 대비는 custom assertion 또는 수동 검사로 분리한다.

## 3. 10개 기본 프리뷰 상태

각 행은 새 페이지에서 해당 상위 탭을 활성화한 뒤 전체 문서 axe를 실행한다. rule 또는 영역을 전역 제외하지 않는다. 동시에 활성 tabpanel 하나만 접근성 트리에 있고 비활성 panel 각각의 ARIA snapshot이 빈 문자열인지 확인한다.

| 순서 | ID | 화면 | axe violations | 활성/비활성 ARIA | 결과 |
| ---: | --- | --- | ---: | --- | --- |
| 1 | `home` | 메인 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 2 | `chat-list` | 대화 목록 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 3 | `open-chat` | 지금 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 4 | `shopping` | 쇼핑 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 5 | `more` | 더보기 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 6 | `chat` | 채팅방 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 7 | `bubble-detail` | 말풍선 상세 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 8 | `passcode` | 잠금화면 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 9 | `splash` | 로딩화면 | 0 | 활성 1개, 비활성 subtree 0 | PASS |
| 10 | `theme-list` | 테마 목록 | 0 | 활성 1개, 비활성 subtree 0 | PASS |

검사는 각 화면의 실제 overflow 상태와 `[data-preview-scroll-region]`의 순차 포커스 가능 여부도 대조한다. overflow가 있을 때만 `tabindex="0"`이어야 한다.

## 4. 전체 키보드 흐름

### 4.1 48단계 Tab 계약

쇼핑 화면을 활성화한 후 문서 시작점에서 실제 `Tab`을 누른 결과의 정확한 계약이다. 최대 허용 횟수는 200회이고, 같은 DOM 노드가 Android terminal 전에 다시 나타나거나 비활성 `[aria-hidden="true"]`/`[inert]` panel로 진입하면 즉시 실패한다.

| 순번 | 접근 가능한 이름 |
| ---: | --- |
| 1–5 | 테마 이름 → 테마 ID → 버전 → 제작자 → 쇼핑 |
| 6–13 | 배경 색 `#FFDEDE` → 하단 탭 배경 색 `#FFFFFF` → 메인 글자 색 `#664242` → 메뉴 글자 색 `#664242` → 서브 글자색 `#805959` → 섹션 타이틀 `#9B3F49` → 선택 메뉴 글자 색 `#664242` → 선택 메뉴 배경 색 `#FFB3B3` |
| 14–17 | 현재 화면 대비 결과 → 공식 가이드 파일 다운로드 → 메인 배경 업로드 → 탭 배경 업로드 |
| 18–21 | 친구 탭 아이콘 기본 색상 적용 → 기본 업로드 → 선택 색상 적용 → 선택 업로드 |
| 22–25 | 대화 탭 아이콘 기본 색상 적용 → 기본 업로드 → 선택 색상 적용 → 선택 업로드 |
| 26–29 | 오픈채팅 탭 아이콘 기본 색상 적용 → 기본 업로드 → 선택 색상 적용 → 선택 업로드 |
| 30–33 | 쇼핑 탭 아이콘 기본 색상 적용 → 기본 업로드 → 선택 색상 적용 → 선택 업로드 |
| 34–37 | 더보기 탭 아이콘 기본 색상 적용 → 기본 업로드 → 선택 색상 적용 → 선택 업로드 |
| 38–42 | 기본 프로필 업로드 → 스마트폰 → 태블릿 → 이전 프리뷰 → 다음 프리뷰 |
| 43–46 | 쇼핑 요약 → 이전 상품 → 다음 상품 → 오늘의 PICK 상품 캐러셀 |
| 47–48 | iOS 테마 다운로드 → Android 소스 다운로드 |

결과는 48회에 `#download-android`에 도달해 PASS했다. 48개 모두 이름이 있고 노드 identity와 key가 중복되지 않았으며 비활성 panel 포커스는 0건이었다.

### 4.2 동작 시나리오

| 시나리오 | 자동 증거 | 결과 |
| --- | --- | --- |
| preview tab Arrow/Home/End/wrap과 포커스 | `@task10-keyboard preview tabs…` | PASS |
| color popover invalid/valid 입력, Escape 닫기와 trigger 복귀 | `@task10-keyboard color popover…` | PASS |
| 말풍선 상세 진입, radio, range와 DOM/focus 유지 | `@task10-keyboard opens bubble detail…` | PASS |
| passcode 입력, 한 자리 삭제, Backspace, 취소와 scope | `@task10-keyboard passcode…` | PASS |
| carousel Arrow/Home 및 이전/다음 버튼 포커스 | `@task10-keyboard carousel…` | PASS |
| metadata invalid/valid 오류와 다운로드 disable/recovery | `@task10-keyboard invalid metadata…` | PASS |
| upload 성공/ decode 실패, 이전 상태와 파일 포커스 유지 | `@task10-keyboard upload success…` | PASS |
| Enter로 iOS 생성 시작/성공/다운로드/포커스 | `@task10-keyboard download…success…` | PASS |
| Space로 Android 생성 시작/실패/alert/포커스 | `@task10-keyboard download…failure…` | PASS |

## 5. 사용자 지정 색상과 대비의 범위

기본 테마 10개 화면은 전체 페이지 axe 0건 gate 대상이다. 사용자가 직접 저대비 색상이나 픽셀을 알 수 없는 이미지를 선택한 상태는 이 gate와 분리한다.

- 저대비 입력값을 임의로 보정하거나 거부하지 않고 그대로 유지한다.
- 계산 가능한 문맥은 실제 ratio와 AA threshold, 통과/미달 화면을 표시한다.
- 이미지 픽셀 때문에 계산할 수 없는 문맥은 `자동 확인 불가`로 표시한다.
- 미달 또는 자동 확인 불가가 있어도 다운로드를 허용한다는 정책을 명시한다.
- 저대비 시나리오의 axe 검사는 의도적으로 바뀐 `#preview-frame`을 제외하고 앱 chrome과 경고 UI만 검사한다.
- 따라서 생성된 모든 사용자 테마의 대비 준수를 보증하지 않으며, 해당 자산과 색상은 사용자가 별도로 확인해야 한다.

## 6. 반응형, 확대, 모션과 고대비

| 항목 | 환경/방법 | 결과 | 해석 |
| --- | --- | --- | --- |
| 320×800, 390×844 CSS viewport | phone/tablet, 10개 화면 | 자동 PASS | geometry, footer 도달, 기능 손실 여부 |
| WCAG text spacing | 위 viewport matrix에 spacing override 적용 | 자동 PASS | text spacing custom assertion |
| 200% 실제 browser zoom | Safari 26.5.2 | PASS | Safari의 실제 크기에서 페이지 확대를 4회 적용해 검사 |
| 300% 실제 browser zoom | Safari 26.5.2 | PASS — 보조 증거 | Safari가 제공하는 최대 단계이며 확대 메뉴 비활성 확인. 400% 증거로 사용하지 않음 |
| 400% 실제 browser zoom | Safari 26.5.2 | BLOCKED — 비게이팅 추가 범위 | Safari의 페이지 확대 상한이 300%이며 필수 400% gate는 Firefox에서 완료 |
| 200%/400% 실제 browser zoom | Firefox 148.0.2 | PASS | 실제 브라우저 zoom 표시를 각각 확인하고, reflow·문서 수평 overflow 부재·footer 및 두 다운로드 버튼 도달을 실제 UI에서 확인 |
| 200%/400% 실제 browser zoom | Chrome 151 | BLOCKED — 비게이팅 추가 범위 | Chrome 제어 확장과 통신할 수 없어 UI 검사를 수행하지 못함; 필수 200%/400% gate는 Firefox에서 완료 |
| `forced-colors: active` | Playwright Chromium emulation + 수동 화면 확인 | PASS — 계획의 동등 환경 | system color, 경계, 포커스, 선택, mask icon CSS 반응 자동 assertion과 쇼핑 화면 전체 screenshot을 직접 확인 |
| 실제 Windows High Contrast | Windows 실기기/VM 필요 | BLOCKED — 비게이팅 추가 범위 | 동등 forced-colors 환경 gate는 PASS했으며 실제 Windows HCM PASS를 주장하지 않음 |
| `prefers-reduced-motion` | Playwright reduce/no-preference | 자동 PASS | 전환 제거 후 keyboard/button/focus 기능 유지 |

## 7. 수동 검증 현황

| 환경 | 검사 항목 | 상태 | 완료 조건 또는 제한 |
| --- | --- | --- | --- |
| Chrome 151 + VoiceOver 10 | heading/landmark, form name, tab/tabpanel, live/alert, passcode 발화 | EXCLUDED | 2026-08-22 사용자 지시에 따라 VoiceOver 실청취를 완료 범위에서 제외 |
| Chrome 151 + VoiceOver 10 | 전체 Tab 순서와 동적 focus | EXCLUDED | 2026-08-22 사용자 지시에 따라 VoiceOver 상호작용 검사를 완료 범위에서 제외 |
| Safari 26.5.2 + VoiceOver 10 | 동일한 의미·발화·focus 검사 | EXCLUDED | VoiceOver를 실제 활성화했으나 출력 창 접근이 허용되지 않아 판정하지 않았고, 사용자 지시에 따라 제외 |
| Safari 26.5.2 | 200% 실제 zoom | PASS | footer·다운로드와 문서 수평 overflow 부재를 실제 UI에서 확인 |
| Safari 26.5.2 | 최대 300% 실제 zoom | PASS — 보조 증거 | 10개 프리뷰 탭 전환, 쇼핑 carousel 1/4→2/4, footer·다운로드를 실제 UI에서 확인 |
| Firefox 148.0.2 | 200%와 400% 실제 zoom | PASS | browser zoom 표시, reflow, 문서 수평 overflow 부재, footer·iOS·Android 버튼 도달을 실제 UI에서 확인 |
| Safari 26.5.2 | 400% 실제 zoom | BLOCKED — 비게이팅 추가 범위 | Safari UI가 최대 300%까지만 제공하며 필수 400% gate는 Firefox에서 완료 |
| Chrome 151 | 200%와 400% 실제 zoom | BLOCKED — 비게이팅 추가 범위 | Chrome 제어 확장과 통신할 수 없었으며 필수 200%/400% gate는 Firefox에서 완료 |
| Safari 26.5.2 실제 순차 포커스 | 48단계 focus contract | PASS | `Option+Tab`으로 쇼핑 탭·색상·업로드·기기·프리뷰·캐러셀을 거쳐 Android 다운로드에 정확히 도달 |
| Safari 26.5.2 키보드만 사용 | 설정 → 색상 → 업로드 → 프리뷰 → 다운로드 | PASS | `Accessibility Theme` 메타데이터, `#FADADD`, 실제 PNG 업로드, 태블릿/다음 프리뷰, iOS `.ktheme`와 Android source ZIP 생성·다운로드 완료 |
| Chromium forced-colors 동등 환경 | 경계·포커스·선택·mask icon | PASS | 자동 assertion에 더해 쇼핑 화면 전체 screenshot에서 system colors, 포커스·선택 표시, control 경계와 아이콘을 직접 확인 |
| Windows High Contrast | 동일 항목의 실제 Windows 재확인 | BLOCKED — 비게이팅 추가 범위 | 현재 macOS에 실제 Windows HCM 없음; 동등 환경 gate는 PASS |
| NVDA + Chrome/Firefox | 이름·역할·상태·live region | BLOCKED — 비게이팅 추가 범위 | 원래 Task 10 필수 목록 밖의 추가 플랫폼 범위이며 현재 Windows 및 NVDA 없음 |
| JAWS + Chrome/Edge | 이름·역할·상태·live region | BLOCKED — 비게이팅 추가 범위 | 원래 Task 10 필수 목록 밖의 추가 플랫폼 범위이며 현재 Windows 및 JAWS 환경/라이선스 없음 |

Chrome과 Safari, VoiceOver는 현재 Mac에 설치되어 있다. VoiceOver는 실제로 활성화하고 캡션 패널 기반 확인을 시도했으나 제어 도구가 VoiceOver 출력 창 접근을 허용하지 않아 발화의 중복·누락을 판정하지 않았으며, 2026-08-22 사용자 지시에 따라 VoiceOver 검사를 완료 범위에서 제외했다. 자동 accessibility snapshot은 실제 음성 출력 검증이 아니다.

Safari는 기본 설정에서 `Tab`이 일부 웹 컨트롤만 순회하므로 전체 컨트롤 탐색용 `Option+Tab`을 사용했다. 테마 이름부터 시작해 쇼핑 탭을 선택한 뒤 색상 8개, 대비 결과, 가이드 링크, 업로드·색상 적용 22개, 기기 선택, 이전·다음 프리뷰, 쇼핑 요약·상품 이동·캐러셀, iOS와 Android 다운로드까지 48단계의 실제 UI 포커스가 자동 계약과 같은 순서로 이동했다. cycle, 비활성 패널 진입, 이름 없는 포커스는 없었다.

별도의 실제 키보드 작업 흐름에서는 메타데이터를 `Accessibility Theme`, `accessibility`, `1.0.1`, `Codex QA`로 변경하고 쇼핑 프리뷰를 선택한 뒤 배경 색을 `#FADADD`로 변경했다. 메인 배경 파일 선택기를 키보드로 열어 로컬 PNG를 반영하고, 태블릿을 선택한 뒤 다음 프리뷰로 이동했다. 마지막으로 iOS와 Android 버튼을 각각 키보드로 실행해 `Accessibility-Theme.ktheme`와 `Accessibility-Theme-android-source.zip` 생성·다운로드 및 완료 status를 확인했다.

Safari 확대 검사는 `보기 > 실제 크기`를 시작점으로 삼아 실제 페이지 확대를 사용했다. 200%에서 프리뷰와 static footer가 순서대로 도달 가능하고 다운로드 버튼과 텍스트가 잘리지 않는지 확인했다. Safari가 제공하는 최대 300%에서는 10개 프리뷰 탭을 모두 선택하고, 쇼핑 화면의 다음 상품 버튼으로 상태가 `1/4`에서 `2/4`로 바뀌는지, 문서 끝에서 footer와 두 다운로드 버튼이 보이고 조작 가능한지 확인했다. 최대 단계에서 `확대` 메뉴가 비활성임을 확인했으며 이를 400%로 기록하지 않는다. 검사 후 `실제 크기`로 복원했다. 이는 VoiceOver 발화 검사나 Chrome 200%/400% 확대 결과를 대신하지 않는다.

필수 400% gate는 Firefox에서 별도로 수행했다. Firefox의 실제 zoom 표시가 200%와 400%인지 각각 확인하고 문서 끝까지 키보드로 이동해 콘텐츠가 단일 열로 reflow되는지, 문서 수평 scrollbar나 잘린 정보가 없는지, footer와 iOS·Android 다운로드 버튼이 모두 보이고 도달 가능한지 확인했다. 검사 후 100%로 복원했다.

고대비는 계획이 허용한 동등 환경으로 Chromium `forced-colors: active`를 사용했다. 관련 프리뷰 표면 전반의 자동 assertion에 더해 쇼핑 화면 전체를 직접 확인해 system colors, control 경계, 현재 focus와 선택 tab 표시, mask icon이 구분되는지 확인했다. 이는 실제 Windows HCM 결과를 주장하지 않는다.

## 8. KWCAG 2.2 공식 기준과 WCAG 2.2 관련 대응

규범 기준은 국립전파연구원의 [KS X OT0003:2022 한국형 웹 콘텐츠 접근성 지침 2.2](https://www.rra.go.kr/ko/reference/kcsList_view.do?nb_seq=5247&nb_type=6) 원문이다. 검사항목 명칭과 33개 항목 구성은 원문 및 [한국정보접근성인증평가원 전문가 심사기준](https://www.wa.or.kr/m1/sub3.asp)을 대조했다. 품질인증 절차 표준은 [TTAK.KO-10.1012/R1](https://committee.tta.or.kr/data/standard_view.jsp?commit_code=PG605&pk_num=TTAK.KO-10.1012%2FR1)을 참고했다.

WCAG 기준은 [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)을 사용한다. 2025년 TTA의 [TTAK.OT-10.0003/R3 웹 콘텐츠 접근성 지침(WCAG) 2.2](https://committee.tta.or.kr/data/standard_view.jsp?commit_code=PG605&nowPage=1&pk_num=TTAK.OT-10.0003%2FR3)는 W3C WCAG 2.2 번역 표준이며, KS X OT0003:2022 KWCAG 2.2와 같은 문서로 취급하지 않는다.

아래 표는 공식 기관이 발행한 규범적 1:1 매핑이 아니라, 이 프로젝트의 관련 대응과 검증 책임을 설명하기 위한 crosswalk다.

| KWCAG 2.2 검사항목 | 관련 WCAG 2.2 | 관계 | 이 프로젝트의 증거와 상태 |
| --- | --- | --- | --- |
| 5.1.1 적절한 대체 텍스트 제공 | 1.1.1 | 직접 | 10화면 axe와 이름/역할 custom assertion PASS |
| 5.2.1 자막 제공 | 1.2.1–1.2.5 | 관련 | N/A — 오디오·비디오 멀티미디어 없음 |
| 5.3.1 표의 구성 | 1.3.1 | 관련 | N/A — 데이터 표 없음 |
| 5.3.2 콘텐츠의 선형구조 | 1.3.2 | 직접 | DOM/ARIA 구조, 자동·Safari 실제 48단계 순서, reflow PASS; VoiceOver는 사용자 지시로 EXCLUDED |
| 5.3.3 명확한 지시사항 제공 | 1.3.3 | 직접 | form help/error와 색상 외 상태 표시 자동 PASS |
| 5.4.1 색에 무관한 콘텐츠 인식 | 1.4.1 | 직접 | selected/focus와 forced-colors 동등 환경 자동·수동 PASS; 실제 Windows HCM은 비게이팅 BLOCKED |
| 5.4.2 자동 재생 금지 | 1.4.2 | 직접 | N/A — 자동 재생 오디오 없음 |
| 5.4.3 텍스트 콘텐츠의 명도 대비 | 1.4.3 | 직접 | 기본 theme contrast ledger와 10화면 axe PASS; 사용자 색상은 부분 준수 정책 |
| 5.4.4 콘텐츠 간의 구분 | 1.4.11 | 관련, 기준 동일하지 않음 | 경계·focus·selected indicator·forced-colors 동등 환경 자동·수동 PASS; 실제 HCM은 비게이팅 BLOCKED |
| 6.1.1 키보드 사용 보장 | 2.1.1, 2.1.2 | 직접 | 48단계 및 9개 세부 keyboard 시나리오 PASS |
| 6.1.2 초점 이동과 표시 | 2.4.3, 2.4.7, 2.4.11 | 직접/관련 | cycle, inactive panel, focus 유지·가시성·가림 custom PASS |
| 6.1.3 조작 가능 | 2.5.8 | 관련, 크기 기준 동일하지 않음 | 24 CSS px target 및 reflow custom PASS |
| 6.1.4 문자 단축키 | 2.1.4 | 직접 | passcode 문자키가 활성 panel focus에서만 동작하도록 자동 PASS |
| 6.2.1 응답시간 조절 | 2.2.1 | 직접 | N/A — 사용자 응답 시간제한 없음 |
| 6.2.2 정지 기능 제공 | 2.2.2 | 직접 | N/A — 자동 시작·자동 갱신 콘텐츠 없음; carousel은 사용자 조작형 |
| 6.3.1 깜빡임과 번쩍임 사용 제한 | 2.3.1 | 직접 | N/A — 해당 빈도의 깜빡임/번쩍임 콘텐츠 없음 |
| 6.4.1 반복 영역 건너뛰기 | 2.4.1 | 직접 | N/A — 반복되는 사이트 navigation을 가진 페이지 집합이 아닌 단일 도구 화면 |
| 6.4.2 제목 제공 | 2.4.2, 2.4.6 | 직접/관련 | page/region/fieldset/panel 제목 구조 자동 PASS |
| 6.4.3 적절한 링크 텍스트 | 2.4.4 | 직접 | 공식 가이드 링크 목적과 새 창 관계 자동 PASS |
| 6.4.4 고정된 참조 위치 정보 | 직접 대응 없음 | KWCAG 고유 범위 | N/A — 전자출판문서 형식이 아님 |
| 6.5.1 단일 포인터 입력 지원 | 2.5.1, 2.5.7 | 직접/관련 | carousel drag의 keyboard/button 대안 자동 PASS |
| 6.5.2 포인터 입력 취소 | 2.5.2 | 직접 | carousel pointer release/capture 해제 custom PASS |
| 6.5.3 레이블과 네임 | 2.5.3 | 직접 | visible label과 accessible name, 48개 이름 자동 PASS |
| 6.5.4 동작기반 작동 | 2.5.4 | 직접 | N/A — 기기 motion 입력 기능 없음 |
| 7.1.1 기본 언어 표시 | 3.1.1 | 직접 | 문서 `lang="ko"` 자동 PASS |
| 7.2.1 사용자 요구에 따른 실행 | 3.2.1, 3.2.2 | 직접 | focus만으로 context 변경 없음, 명시적 tab/button 실행 자동 PASS |
| 7.2.2 찾기 쉬운 도움 정보 | 3.2.6 | 직접 | N/A — 반복 페이지 집합의 help mechanism 없음 |
| 7.3.1 오류 정정 | 3.3.1, 3.3.3 | 직접/관련 | metadata/HEX/upload/download 오류와 recovery 자동 PASS |
| 7.3.2 레이블 제공 | 3.3.2 | 직접 | metadata/color/upload 이름·도움 관계 자동 PASS |
| 7.3.3 접근 가능한 인증 | 3.3.8 | 직접 | N/A — 인증 과정 없음; passcode는 비기능 preview 예시 |
| 7.3.4 반복 입력 정보 | 3.3.7 | 직접 | N/A — 다단계 사용자 정보 재입력 흐름 없음 |
| 8.1.1 마크업 오류 방지 | WCAG 2.2에서 4.1.1 삭제, 4.1.2 일부 관련 | 직접 대응 없음/관련 | axe의 ID·ARIA 검사와 브라우저 파싱·동작 회귀 PASS; 별도 HTML validator는 비게이팅 추가 범위 |
| 8.2.1 웹 애플리케이션 접근성 준수 | 4.1.2, 4.1.3 | 광범위 관련 | 이름·역할·값·live region 자동 PASS; VoiceOver는 사용자 지시로 EXCLUDED, NVDA/JAWS는 비게이팅 BLOCKED |

KWCAG에 정확히 같은 독립 검사항목이 없는 WCAG 2.2 AA 범위도 누락하지 않는다.

| WCAG 2.2 범위 | 검증 방식과 현재 상태 |
| --- | --- |
| 1.3.4 Orientation | phone/tablet 및 320/390 viewport에서 방향 제한 없음 자동 PASS; 실제 기기 회전은 비게이팅 추가 범위 |
| 1.3.5 Identify Input Purpose | 입력 목적과 명시적 label의 해당 자동 범위 PASS; 별도 보조 입력기는 비게이팅 추가 범위 |
| 1.4.4 Resize Text | Safari·Firefox 200%, Firefox 400% 실제 zoom PASS; Safari/Chrome의 미실행 조합은 비게이팅 추가 범위 |
| 1.4.5 Images of Text | 기능·지시 텍스트는 HTML이며 preview 장식 이미지는 대체 목적을 검사; axe PASS |
| 1.4.10 Reflow | 320/390 CSS px geometry 자동 PASS; Safari 최대 300% 보조 PASS; Firefox 실제 400% PASS |
| 1.4.12 Text Spacing | WCAG spacing override matrix 자동 PASS |
| 1.4.13 Content on Hover or Focus | color popover 표시/닫기/focus 복귀 자동 PASS |
| 2.4.5 Multiple Ways | N/A — 단일 앱 화면이며 다중 페이지 집합 없음 |
| 2.4.11 Focus Not Obscured (Minimum) | 실제 Tab과 geometry 기반 footer/panel 가림 검사 자동 PASS |
| 3.1.2 Language of Parts | N/A — 본문은 한국어이고 제품명·플랫폼명 외 별도 언어 문단 없음 |
| 3.2.3 Consistent Navigation, 3.2.4 Consistent Identification | 단일 앱 상태 전환에서 같은 controls/이름 유지 custom PASS |
| 3.3.4 Error Prevention | N/A — 법률·금융·시험·영구 데이터 변경 작업 없음 |
| 4.1.3 Status Messages | polite status, persistent alert, contrast/carousel/passcode live region 자동 PASS; VoiceOver 실제 발화는 사용자 지시로 EXCLUDED |

## 9. GitHub Pages 배포 후 완료 절차

배포 smoke는 로컬 Playwright 설정과 분리되어 webServer를 시작하지 않는다. `DEPLOYMENT_URL`이 없거나 상대 URL이거나 `/` root이거나 trailing slash가 없는 경우 config 단계에서 실패한다. 이는 `page.goto("/")`가 GitHub Pages 저장소 subpath를 벗어나는 오류를 방지한다.

로컬에서는 실제 Pages와 같은 subpath를 제공하는 임시 정적 서버를 사용한다.

```bash
DEPLOYMENT_URL="http://127.0.0.1:43210/kakaotalk-theme-builder/?rev=local" \
  npm run test:deployment
```

서버의 document root 아래 `kakaotalk-theme-builder/`가 저장소 root를 가리켜야 한다. smoke는 요청 URL의 origin/path 유지, stylesheet와 module script 선언, 브라우저가 불러온 모든 subresource의 같은 subpath·2xx 응답, 주요 앱 semantics, 브라우저 진단 0건 및 기본 화면 axe 0건을 검사하고 JSON evidence를 남긴다.

2026-08-22에 위 구조의 로컬 fixture로 실행한 결과는 1 passed였다. 환경변수 누락, 상대 URL, origin root URL은 각각 config 단계에서 의도대로 실패했다. 이 결과는 실제 GitHub Pages 배포 결과가 아니므로 배포 SHA와 URL은 계속 `PENDING`이다.

최종 배포에서는 다음 순서를 지킨다.

1. Task 10 최종 커밋 후 이 문서의 로컬/최종 SHA를 갱신한다.
2. force 없이 `main`에 반영하고 GitHub Pages workflow의 `head_sha`가 최종 SHA와 같은지 확인한다.
3. `github-pages` deployment 최신 status가 `success`이고 `environment_url`이 예상 URL인지 확인한다.
4. 캐시를 피하도록 `?rev=<FINAL_SHA>`를 붙인 절대 URL로 `npm run test:deployment`를 실행한다.
5. 배포 smoke가 PASS한 뒤에만 이 문서의 배포 SHA, URL, 결과를 `PENDING`에서 갱신한다.

## 10. 알려진 제한과 완료 판정

- axe 0건은 axe가 자동 판정하는 규칙에서 탐지된 위반이 없다는 뜻일 뿐이다.
- ARIA snapshot은 실제 VoiceOver, NVDA, JAWS 음성 출력과 브라우저별 상호작용을 대신하지 않는다. VoiceOver는 사용자 지시에 따라 이번 완료 범위에서 제외했다.
- `forced-colors` 동등 환경은 계획의 고대비 gate를 충족하지만 실제 Windows High Contrast 결과는 아니다.
- CSS viewport와 text-spacing automation은 실제 browser zoom 결과가 아니다. 실제 확대 gate는 Safari 200%와 Firefox 200%/400%로 별도 PASS했다.
- 사용자 업로드 이미지와 임의 색상 조합은 앱이 ratio·미달·자동 확인 불가를 보고하지만 준수를 강제하거나 인증하지 않는다.
- 완료 게이트는 자동 전체 회귀, 10화면 axe/ARIA, 실제 키보드 작업 흐름, 실제 200%/400% 확대, forced-colors 동등 환경, 실제 Pages 배포 smoke다. VoiceOver는 사용자 지시로 `EXCLUDED`이며, 실제 Windows HCM·NVDA·JAWS·추가 브라우저 조합·실기기 회전·별도 HTML validator는 플랫폼 범위를 넓히는 비게이팅 추가 확인으로 남긴다. `BLOCKED`를 `PASS`로 바꾸거나 해당 플랫폼 준수를 주장하지 않는다. 현재 남은 필수 게이트는 `PENDING`인 실제 Pages 배포와 운영 smoke뿐이다.
