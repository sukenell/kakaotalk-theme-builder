# 프리뷰 기본 대비 ledger

이 문서는 기본 팔레트와 실제 프리뷰 selector를 연결한 Task 8B 검수 기록이다. 자동 판정은 색상 토큰과 명시된 합성 레이어만 계산하며, 비율은 반올림하지 않은 값으로 합격 여부를 결정한다. 표의 표시는 읽기 편하도록 소수 셋째 자리까지만 반올림했다.

이미지 상태는 `cleared`(초기 이미지 제거 후 단색), `bundled`(저장소 번들 raster), `user`(사용자 업로드)로 구분한다. 기본 main/chat/tab/passcode/splash 배경은 런타임에서 `cleared`다. 번들 말풍선과 상품 사진의 텍스트는 실제 raster 위 CSS backing/scrim으로 최악 배경에서도 기준을 보장한다. 탭 아이콘·암호 점·테마 아이콘처럼 이미지 자체가 정보인 항목은 `수동`으로 남긴다. `user` 이미지와 사용자가 바꾼 색의 진단 UI는 Task 8C 범위다.

axe는 배경 이미지의 픽셀 대비를 판정하지 않으므로 이미지 항목의 수동 판정을 대체하지 않는다. 자동화가 `unknown`을 반환하는 것은 통과가 아니라, 아래 수동 증거가 필요한 상태라는 뜻이다.

기준은 일반 텍스트 4.5:1, 큰 텍스트와 UI 구성요소/정보 이미지 3:1이다. `worst-case`는 raster가 가장 불리한 완전한 흰색 또는 검정이라고 가정한 수학적 하한이다.

| ID | 페이지 | selector | 상태 | 유효 전경 | 최악 배경 | 이미지 / backing·scrim | 기준 | 판정·증거 |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| home-status | home | `#preview-panel-home .phone-status` | default | `#3C4148` | `#FFFFFF` | none | 4.5 | 자동 10.285 |
| home-header | home | `#preview-panel-home .main-header strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | mainBackground cleared | 4.5 | 자동 6.915 |
| home-segment-default | home | `#preview-panel-home .friend-segment:not(.is-active)` | default | titleText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| home-segment-selected | home | `#preview-panel-home .friend-segment.is-active` | selected | titlePressed `#664242` | bodyPressed `#FFB3B3` | none | 4.5 | 자동 5.098 |
| home-section | home | `#preview-panel-home .friends-section-label` | default | sectionTitle `#9B3F49` | mainBackground `#FFDEDE` | none | 4.5 | 자동 5.235 |
| home-secondary | home | `#preview-panel-home .favorite-profile-row span` | default | paragraphText `#805959` | mainBackground `#FFDEDE` | opaque text | 4.5 | 자동 4.800 |
| home-tab-icon-selected | home | `#preview-panel-home .tab-friends.is-selected .tab-icon` | selected | bundled PNG | tabBackground `#FFFFFF` | tabFriendIconSelected bundled | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| chat-list-header | chat-list | `#preview-panel-chat-list .chat-list-header > strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | mainBackground cleared | 4.5 | 자동 6.915 |
| chat-list-title | chat-list | `#preview-panel-chat-list .chat-list-copy > strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| chat-list-secondary | chat-list | `#preview-panel-chat-list .chat-list-copy > span` | default | paragraphText `#805959` | mainBackground `#FFDEDE` | opaque text | 4.5 | 자동 4.800 |
| chat-list-unread | chat-list | `#preview-panel-chat-list .unread-badge` | default | unreadCount `#FF7F7F` | web-only `#552020` | none | 4.5 | 자동 5.326; native unread 색은 전경으로 유지 |
| chat-list-tab-icon-selected | chat-list | `#preview-panel-chat-list .tab-chat.is-selected .tab-icon` | selected | bundled PNG | tabBackground `#FFFFFF` | tabChatIconSelected bundled | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| open-chat-header | open-chat | `#preview-panel-open-chat .chat-list-header > strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | mainBackground cleared | 4.5 | 자동 6.915 |
| open-chat-title | open-chat | `#preview-panel-open-chat .chat-list-title strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| open-chat-secondary | open-chat | `#preview-panel-open-chat .chat-list-copy > span` | default | paragraphText `#805959` | mainBackground `#FFDEDE` | opaque text | 4.5 | 자동 4.800 |
| open-chat-unread | open-chat | `#preview-panel-open-chat .unread-badge` | default | unreadCount `#FF7F7F` | web-only `#552020` | none | 4.5 | 자동 5.326 |
| open-chat-tab-icon-selected | open-chat | `#preview-panel-open-chat .tab-openchat.is-selected .tab-icon` | selected | bundled PNG | tabBackground `#FFFFFF` | tabOpenChatIconSelected bundled | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| shopping-header | shopping | `#preview-panel-shopping .phone-header` | default | headerText `#664242` | mainBackground `#FFDEDE` | mainBackground cleared | 3 | 자동 6.915; currentColor 마스크 아이콘 |
| shopping-tab-default | shopping | `#preview-panel-shopping .shopping-tab:not(.is-active)` | default | titleText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| shopping-tab-selected | shopping | `#preview-panel-shopping .shopping-tab.is-active` | selected | titlePressed `#664242` | bodyPressed `#FFB3B3` | none | 4.5 | 자동 5.098 |
| shopping-summary-title | shopping | `#preview-panel-shopping .shopping-summary-card strong` | default | titleText `#664242` | mainBackground + white 90% | none | 4.5 | 자동 8.481 |
| shopping-summary-secondary | shopping | `#preview-panel-shopping .shopping-summary-heading span` | default | paragraphText `#805959` | mainBackground + white 90% | opaque text | 4.5 | 자동 5.886 |
| shopping-order-glyph | shopping | `#preview-panel-shopping .shopping-order-icon` | default | `#9B3F49` | `#DEDEDE` | ::before | 3 | 자동 4.876 |
| shopping-pick-title | shopping | `#preview-panel-shopping .shopping-pick-title strong` | default | sectionTitle `#9B3F49` | mainBackground `#FFDEDE` | none | 4.5 | 자동 5.235 |
| shopping-carousel-default | shopping | `#preview-panel-shopping .shopping-carousel-control.next` | default | titleText `#664242` | mainBackground + white 90% | none | 3 | 자동 8.481 |
| shopping-carousel-hover | shopping | `#preview-panel-shopping .shopping-carousel-control.next` | hover | titleText `#664242` | `#F5F5F5` | none | 3 | 자동 7.950 |
| shopping-carousel-pressed | shopping | `#preview-panel-shopping .shopping-carousel-control.next` | pressed | titleText `#664242` | `#E5E5E5` | none | 3 | 자동 6.880 |
| shopping-product-title | shopping | `#preview-panel-shopping .shop-card-content strong` | default | `#FFFFFF` | worst white + black 72% | shoppingImage_01–04 bundled / fixed scrim | 4.5 | 자동 하한 9.291; raster 픽셀을 통과로 가정하지 않음 |
| shopping-product-price | shopping | `#preview-panel-shopping .shop-price` | default | `#FFFFFF` | worst white + black 72% | shoppingImage_01–04 bundled / fixed scrim | 4.5 | 자동 하한 9.291 |
| shopping-tab-icon-selected | shopping | `#preview-panel-shopping .tab-shopping.is-selected .tab-icon` | selected | bundled PNG | tabBackground `#FFFFFF` | tabShoppingIconSelected bundled | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| more-header | more | `#preview-panel-more .chat-list-header > strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | mainBackground cleared | 4.5 | 자동 6.915 |
| more-segment-default | more | `#preview-panel-more .more-segment:not(.is-active)` | default | titleText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| more-segment-selected | more | `#preview-panel-more .more-segment.is-active` | selected | titlePressed `#664242` | bodyPressed `#FFB3B3` | none | 4.5 | 자동 5.098 |
| more-service-title | more | `#preview-panel-more .more-service-item strong` | default | titleText `#664242` | 기본 mix `#FFE7E7` | none | 4.5 | 자동 7.362 |
| more-ad-title | more | `#preview-panel-more .more-ad-art strong` | default | `#23406D` | worst black + white 74% | readingLogAd bundled / fixed backing | 4.5 | 자동 하한 5.518 |
| more-ad-description | more | `#preview-panel-more .more-ad-art span:not(.ad-mark)` | default | `#23406D` | worst black + white 70% | readingLogAd bundled / fixed backing | 4.5 | 자동 하한 4.944 |
| more-ad-mark | more | `#preview-panel-more .ad-mark` | default | `#687078` | opaque `#FFFFFF` | readingLogAd bundled / opaque backing | 4.5 | 자동 5.027 |
| more-section | more | `#preview-panel-more .more-section-heading` | default | sectionTitle `#9B3F49` | mainBackground `#FFDEDE` | none | 4.5 | 자동 5.235 |
| more-tab-icon-selected | more | `#preview-panel-more .tab-more.is-selected .tab-icon` | selected | bundled PNG | tabBackground `#FFFFFF` | tabMoreIconSelected bundled | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| chat-header | chat | `#preview-panel-chat .phone-header strong` | default | headerText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| chat-date | chat | `#preview-panel-chat .date-chip` | default | `#FFFFFF` | mainBackground + black 55% | chatBackground cleared | 4.5 | 자동 5.614 |
| chat-sender | chat | `#preview-panel-chat .sender` | default | receiveText `#4D4D4D` | mainBackground `#FFDEDE` | chatBackground cleared | 4.5 | 자동 6.745 |
| chat-time | chat | `#preview-panel-chat .message-time` | default | receiveText `#4D4D4D` | mainBackground `#FFDEDE` | chatBackground cleared / opaque text | 4.5 | 자동 6.745 |
| chat-send-bubble | chat | `#preview-panel-chat .send-bubble` | default | sendText `#FFFFFF` | worst white + black 72% | sendBubbleNormal/Tailless bundled / CSS backing | 4.5 | 자동 하한 9.291; 원본 center `#4F8F84` 단독 대비는 3.754라서 backing 사용 |
| chat-receive-bubble | chat | `#preview-panel-chat .receive-bubble` | default | receiveText `#4D4D4D` | opaque `#F8F8F8` | receiveBubbleNormal/Tailless bundled / CSS backing | 4.5 | 자동 7.960 |
| chat-input | chat | `#preview-panel-chat .input-pill` | default | inputBarText `#191919` | inputBarBackground + black 5% | none | 4.5 | 자동 15.705 |
| chat-input-menu | chat | `#preview-panel-chat .input-bar-content > .preview-mock-control:first-child` | default | inputMenu `#B23A48` | inputBarBackground + ARGB inputMenuButton | none | 3 | 자동 5.363 |
| chat-send-button | chat | `#preview-panel-chat .send-button` | default | sendButtonText `#FFFFFF` | sendButton `#B23A48` | none | 4.5 | 자동 5.847 |
| bubble-detail-header | bubble-detail | `#preview-panel-bubble-detail .bubble-detail-header h3` | default | headerText `#664242` | mainBackground `#FFDEDE` | none | 4.5 | 자동 6.915 |
| bubble-detail-action | bubble-detail | `#preview-panel-bubble-detail .bubble-detail-actions button` | default | headerText `#664242` | mainBackground + white 56% | none | 3 | 자동 7.858 |
| bubble-detail-send-default | bubble-detail | `#preview-panel-bubble-detail .nine-patch-sample` | default | sendText `#FFFFFF` | worst white + black 72% | send normal/tailless bundled / fixed scrim backing | 4.5 | 자동 하한 9.291 |
| bubble-detail-send-selected | bubble-detail | `#preview-panel-bubble-detail .nine-patch-sample` | selected | sendText `#FFFFFF` | worst white + black 72% | send selected rasters bundled / fixed scrim backing | 4.5 | 자동 하한 9.291 |
| bubble-detail-receive-default | bubble-detail | `#preview-panel-bubble-detail .nine-patch-sample` | default | receiveText `#4D4D4D` | opaque `#F8F8F8` | receive normal/tailless bundled / opaque backing | 4.5 | 자동 7.960 |
| bubble-detail-receive-selected | bubble-detail | `#preview-panel-bubble-detail .nine-patch-sample` | selected | receiveText `#4D4D4D` | opaque `#F8F8F8` | receive selected rasters bundled / opaque backing | 4.5 | 자동 7.960 |
| bubble-detail-fit | bubble-detail | `#preview-panel-bubble-detail .nine-patch-fit-control` | default | descriptionText `#805959` | mainBackground `#FFDEDE` | chatBackground cleared | 4.5 | 자동 4.800 |
| bubble-detail-fit-selected | bubble-detail | `#preview-panel-bubble-detail .nine-patch-fit-option input:checked + label` | selected | sendButtonText `#FFFFFF` | sendButton `#B23A48` | none | 4.5 | 자동 5.847 |
| passcode-title | passcode | `#preview-panel-passcode .passcode-intro strong` | default | passcodeText `#664242` | mainBackground `#FFDEDE` | passcodeBackgroundImage cleared | 3 | 자동 6.915 |
| passcode-description | passcode | `#preview-panel-passcode .passcode-intro > span` | default | passcodeText `#664242` | mainBackground `#FFDEDE` | passcodeBackgroundImage cleared / opaque text | 4.5 | 자동 6.915 |
| passcode-keypad | passcode | `#preview-panel-passcode .keypad button[data-passcode-digit]` | default | passcodeKeypadText `#664242` | 실제 passcode screen `#FFDEDE` | passcodeBackgroundImage cleared | 3 | 자동 6.915; 투명 버튼을 keypadBackground 토큰과 비교하지 않음 |
| passcode-dot-default | passcode | `#preview-panel-passcode .passcode-dot` | default | bundled PNG | mainBackground `#FFDEDE` | passcodeDot 번들 이미지 | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| passcode-dot-selected | passcode | `#preview-panel-passcode .passcode-dot` | selected | bundled PNG | mainBackground `#FFDEDE` | passcodeDotSelected 번들 이미지 | 3 | 수동: 선택 이미지 자체의 경계/형태 확인 |
| splash-status | splash | `#preview-panel-splash .phone-status` | default | `#3C4148` | mainBackground `#FFDEDE` | splashImage cleared | 4.5 | 자동 8.206 |
| splash-theme-icon | splash | `#preview-panel-splash .splash-icon` | default | bundled PNG | mainBackground `#FFDEDE` | themeIcon bundled | 3 | 수동: 이미지 자체의 경계/형태 확인 |
| theme-list-header | theme-list | `#preview-panel-theme-list .theme-list-header strong` | default | headerText `#664242` | `#FFFFFF` | none | 4.5 | 자동 8.667 |
| theme-list-manage | theme-list | `#preview-panel-theme-list .theme-list-header > .preview-mock-control:last-child` | default | static `#687078` | `#FFFFFF` | none | 4.5 | 자동 5.027 |
| theme-list-section | theme-list | `#preview-panel-theme-list .section-title` | default | sectionTitle `#9B3F49` | `#FFFFFF` | none | 4.5 | 자동 6.561 |
| theme-list-title | theme-list | `#preview-panel-theme-list .theme-list-copy strong` | default | `#202124` | `#FFFFFF` | none | 4.5 | 자동 16.099 |
| theme-list-secondary | theme-list | `#preview-panel-theme-list .theme-list-copy > span` | default | static `#687078` | `#FFFFFF` | none | 4.5 | 자동 5.027 |
| theme-list-selected-row | theme-list | `#preview-panel-theme-list .active-theme-row .theme-list-copy strong` | selected | `#202124` | 기본 선택 mix `#F7F0F0` | none | 4.5 | 자동 14.318 |
| theme-list-choice-selected | theme-list | `#preview-panel-theme-list .theme-choice.selected` | selected | sectionTitle `#9B3F49` | `#FFFFFF` | none | 3 | 자동 6.561 |

## 수동 증거 범위

- 이 ledger의 자동 비율은 기본 팔레트의 논리 검증과 Chromium computed style 확인을 함께 사용한다.
- 번들 탭 아이콘, 암호 점, 로딩 아이콘은 이미지 자체의 형태·경계 대비이므로 실제 픽셀/시각 수동 검사가 필요하다. 이 행들을 `pass`로 가장하지 않고 `unknown`으로 유지한다.
- 번들 말풍선의 PNG 바이트와 iOS/Android 다운로드 결과는 변경하지 않는다. CSS backing은 웹 프리뷰에만 적용된다.
- 실제 사용자 업로드 이미지/색은 이 기본 ledger의 증거가 아니다. Task 8C에서 `user` 상태로 계산 가능/불가능을 구분해 보고한다.
