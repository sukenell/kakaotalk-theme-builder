const IOS_COLOR_BINDINGS = [
  ["HeaderStyle-Main", "-ios-text-color", "headerText"],
  ["HeaderStyle-Main", "-ios-tab-text-color", "descriptionText"],
  ["HeaderStyle-Main", "-ios-tab-highlighted-text-color", "headerText"],
  ["MainViewStyle-Primary", "background-color", "mainBackground"],
  ["MainViewStyle-Primary", "-ios-text-color", "titleText"],
  ["MainViewStyle-Primary", "-ios-highlighted-text-color", "titlePressed"],
  ["MainViewStyle-Primary", "-ios-description-text-color", "descriptionText"],
  ["MainViewStyle-Primary", "-ios-description-highlighted-text-color", "titlePressed"],
  ["MainViewStyle-Primary", "-ios-paragraph-text-color", "paragraphText"],
  ["MainViewStyle-Primary", "-ios-paragraph-highlighted-text-color", "titlePressed"],
  ["MainViewStyle-Primary", "-ios-selected-background-color", "bodyPressed"],
  ["MainViewStyle-Secondary", "background-color", "mainBackground"],
  ["TabBarStyle-Main", "background-color", "tabBackground"],
  ["SectionTitleStyle-Main", "border-color", "sectionTitle"],
  ["SectionTitleStyle-Main", "-ios-text-color", "sectionTitle"],
  ["FeatureStyle-Primary", "-ios-text-color", "featureText"],
  ["BackgroundStyle-ChatRoom", "background-color", "chatBackground"],
  ["InputBarStyle-Chat", "background-color", "inputBarBackground"],
  ["InputBarStyle-Chat", "-ios-send-normal-background-color", "sendButton"],
  ["InputBarStyle-Chat", "-ios-send-normal-foreground-color", "sendButtonText"],
  ["InputBarStyle-Chat", "-ios-send-highlighted-background-color", "sendButtonPressed"],
  ["InputBarStyle-Chat", "-ios-button-normal-foreground-color", "inputMenu"],
  ["InputBarStyle-Chat", "-ios-button-text-color", "inputBarText"],
  ["MessageCellStyle-Send", "-ios-text-color", "sendText"],
  ["MessageCellStyle-Send", "-ios-selected-text-color", "sendText"],
  ["MessageCellStyle-Send", "-ios-unread-text-color", "unreadCount"],
  ["MessageCellStyle-Receive", "-ios-text-color", "receiveText"],
  ["MessageCellStyle-Receive", "-ios-selected-text-color", "receiveText"],
  ["MessageCellStyle-Receive", "-ios-unread-text-color", "unreadCount"],
  ["BackgroundStyle-Passcode", "background-color", "passcodeBackground"],
  ["LabelStyle-PasscodeTitle", "-ios-text-color", "passcodeText"],
  ["PasscodeStyle", "-ios-keypad-background-color", "passcodeKeypadBackground"],
  ["PasscodeStyle", "-ios-keypad-text-normal-color", "passcodeText"],
  ["BackgroundStyle-MessageNotificationBar", "background-color", "notificationBackground"],
  ["LabelStyle-MessageNotificationBarName", "-ios-text-color", "notificationText"],
  ["LabelStyle-MessageNotificationBarMessage", "-ios-text-color", "paragraphText"],
  ["BackgroundStyle-DirectShareBar", "background-color", "directShareBackground"],
];

const IOS_BUBBLE_EQUAL_EDGE_INSETS = "10px 10px 10px 10px";

const IOS_BUBBLE_EDGE_INSET_BINDINGS = [
  ["MessageCellStyle-Send", "-ios-title-edgeinsets"],
  ["MessageCellStyle-Send", "-ios-group-title-edgeinsets"],
  ["MessageCellStyle-Receive", "-ios-title-edgeinsets"],
  ["MessageCellStyle-Receive", "-ios-group-title-edgeinsets"],
];

const IOS_FIXED_DECLARATIONS = [
  ["InputBarStyle-Chat", "-ios-button-normal-background-color", "#000000"],
  ["InputBarStyle-Chat", "-ios-button-normal-background-alpha", "0.04"],
];

const IOS_MAIN_BACKGROUND_IMAGE_BINDINGS = [
  ["MainViewStyle-Primary", "-ios-background-image"],
  ["MainViewStyle-Secondary", "-ios-background-image"],
];

const ANDROID_COLOR_BINDINGS = {
  theme_header_color: "headerText",
  theme_section_title_color: "sectionTitle",
  theme_title_color: "titleText",
  theme_title_pressed_color: "titlePressed",
  theme_paragraph_color: "paragraphText",
  theme_paragraph_pressed_color: "titlePressed",
  theme_description_color: "descriptionText",
  theme_description_pressed_color: "titlePressed",
  theme_feature_primary_color: "featureText",
  theme_feature_primary_pressed_color: "titlePressed",
  theme_feature_browse_tab_color: "descriptionText",
  theme_feature_browse_tab_focused_color: "headerText",
  theme_background_color: "mainBackground",
  theme_maintab_cell_color: "tabBackground",
  theme_chatroom_background_color: "chatBackground",
  theme_passcode_background_color: "passcodeBackground",
  theme_header_cell_color: "mainBackground",
  theme_body_cell_color: "mainBackground",
  theme_body_cell_pressed_color: "bodyPressed",
  theme_body_cell_border_color: "bodyBorder",
  theme_body_secondary_cell_color: "mainBackground",
  theme_tab_lightbannerbadge_background_color: "unreadCount",
  theme_tab_bannerbadge_background_color: "unreadCount",
  theme_direct_share_color: "headerText",
  theme_direct_share_button_color: "inputMenu",
  theme_direct_share_background_color: "directShareBackground",
  theme_notification_color: "notificationText",
  theme_notification_background_color: "notificationBackground",
  theme_notification_background_pressed_color: "bodyPressed",
  theme_passcode_color: "passcodeText",
  theme_passcode_keypad_color: "passcodeText",
  theme_passcode_keypad_pressed_color: "passcodeKeypadPressed",
  theme_passcode_keypad_background_color: "passcodeKeypadBackground",
  theme_passcode_keypad_pressed_background_color: "passcodeKeypadPressedBackground",
  theme_passcode_pattern_line_color: "notificationBackground",
  theme_chatroom_bubble_me_color: "sendText",
  theme_chatroom_bubble_you_color: "receiveText",
  theme_chatroom_unread_count_color: "unreadCount",
  theme_chatroom_input_bar_color: "inputBarText",
  theme_chatroom_input_bar_background_color: "inputBarBackground",
  theme_chatroom_input_bar_menu_icon_color: "inputMenu",
  theme_chatroom_input_bar_menu_button_color: "inputMenuButton",
  theme_chatroom_input_bar_send_icon_color: "sendButtonText",
  theme_chatroom_input_bar_send_button_color: "sendButton",
};

const ANDROID_MAIN_BACKGROUND_CELL_RESOURCES = [
  "theme_header_cell_color",
  "theme_body_cell_color",
  "theme_body_secondary_cell_color",
];

const defaultColors = {
  mainBackground: "#FFDEDE",
  tabBackground: "#FFFFFF",
  chatBackground: "#FFDEDE",
  headerText: "#664242",
  titleText: "#664242",
  titlePressed: "#B06B6B",
  descriptionText: "#805959",
  paragraphText: "#805959",
  sectionTitle: "#F66C6C",
  featureText: "#805959",
  bodyPressed: "#FFB3B3",
  bodyBorder: "#26664242",
  sendText: "#FFFFFF",
  receiveText: "#4D4D4D",
  unreadCount: "#FF7F7F",
  inputBarBackground: "#FFFFFF",
  inputBarText: "#191919",
  inputMenu: "#E86464",
  inputMenuButton: "#0A000000",
  sendButton: "#FF7F7F",
  sendButtonPressed: "#F27979",
  sendButtonText: "#FFFFFF",
  passcodeBackground: "#FFDEDE",
  passcodeText: "#664242",
  passcodeKeypadBackground: "#FFF2F2",
  passcodeKeypadPressed: "#CCB8B8",
  passcodeKeypadPressedBackground: "#99FFDEDE",
  notificationBackground: "#FCC5C5",
  notificationText: "#604242",
  directShareBackground: "#FFFFFF",
};

export const defaultThemeState = {
  appName: "나의 테마",
  baseAuthorName: "reha",
  additionalAuthorName: "",
  themeIdSegment: "example",
  version: "1.0.0",
  colors: defaultColors,
};

export const CHAT_BUBBLE_IMAGE_KEYS = [
  "sendBubbleNormal",
  "sendBubbleSelected",
  "sendBubbleTailless",
  "sendBubbleTaillessSelected",
  "receiveBubbleNormal",
  "receiveBubbleSelected",
  "receiveBubbleTailless",
  "receiveBubbleTaillessSelected",
];

export const TAB_ICON_IMAGE_KEYS = [
  "tabFriendIcon",
  "tabFriendIconSelected",
  "tabChatIcon",
  "tabChatIconSelected",
  "tabOpenChatIcon",
  "tabOpenChatIconSelected",
  "tabShoppingIcon",
  "tabShoppingIconSelected",
  "tabMoreIcon",
  "tabMoreIconSelected",
  "tabCallIcon",
  "tabCallIconSelected",
  "tabPiccomaIcon",
  "tabPiccomaIconSelected",
  "tabFindIcon",
  "tabFindIconSelected",
  "tabGameIcon",
  "tabGameIconSelected",
];

export const VISIBLE_TAB_ICON_IMAGE_KEYS = [
  "tabFriendIcon",
  "tabFriendIconSelected",
  "tabChatIcon",
  "tabChatIconSelected",
  "tabOpenChatIcon",
  "tabOpenChatIconSelected",
  "tabShoppingIcon",
  "tabShoppingIconSelected",
  "tabMoreIcon",
  "tabMoreIconSelected",
];

export const ADDITIONAL_IMAGE_KEYS = [
  "addFriendButton",
  "addFriendButtonPressed",
  "profileFullImage",
  "themeIconBackground",
  "themeIconForeground",
  "themeIconRound",
];

function bubbleTarget({ label, size, ios2x, ios3x, android = [] }) {
  return {
    label,
    displaySize: size,
    previewIos: ios3x,
    previewScale: 3,
    ios: [ios2x, ios3x],
    android,
    ...(android.length ? { androidRequiresNinePatch: true } : {}),
  };
}

function tabIconTarget({ label, ios2x, ios3x, android = [] }) {
  return {
    label,
    displaySize: [114, 114],
    ...(ios3x ? { previewIos: ios3x, previewScale: 3 } : {}),
    ios: [ios2x, ios3x].filter(Boolean),
    android,
  };
}

function androidMipmapTargets(name) {
  return [
    `src/main/res/mipmap-mdpi/${name}`,
    `src/main/res/mipmap-hdpi/${name}`,
    `src/main/res/mipmap-xhdpi/${name}`,
    `src/main/res/mipmap-xxhdpi/${name}`,
    `src/main/res/mipmap-xxxhdpi/${name}`,
  ];
}

export const IMAGE_TARGETS = {
  mainBackground: {
    label: "메인 배경",
    displaySizes: {
      ios: [1125, 2250],
      android: [1440, 2880],
    },
    ios: ["Images/mainBgImage@3x.png"],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_background_image.png",
      "src/main/theme/drawable-sw600dp/theme_background_image.png",
    ],
  },
  chatBackground: {
    label: "채팅방 배경",
    displaySizes: {
      ios: [1125, 2250],
      android: [1440, 2880],
    },
    ios: ["Images/chatroomBgImage@3x.png"],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_chatroom_background_image.png",
      "src/main/theme/drawable-sw600dp/theme_chatroom_background_image.png",
    ],
  },
  tabBackground: {
    label: "탭 배경",
    displaySize: [1410, 147],
    ios: ["Images/maintabBgImage@2x.png", "Images/maintabBgImage@3x.png"],
    android: ["src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png"],
    androidRequiresNinePatch: true,
  },
  tabFriendIcon: tabIconTarget({
    label: "친구 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoFriends@2x.png",
    ios3x: "Images/maintabIcoFriends@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_friends_image.png",
    ],
  }),
  tabFriendIconSelected: tabIconTarget({
    label: "친구 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoFriendsSelected@2x.png",
    ios3x: "Images/maintabIcoFriendsSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_friends_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_friends_focused_image.png",
    ],
  }),
  tabChatIcon: tabIconTarget({
    label: "대화 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoChats@2x.png",
    ios3x: "Images/maintabIcoChats@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_chats_image.png",
    ],
  }),
  tabChatIconSelected: tabIconTarget({
    label: "대화 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoChatsSelected@2x.png",
    ios3x: "Images/maintabIcoChatsSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_chats_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_chats_focused_image.png",
    ],
  }),
  tabOpenChatIcon: tabIconTarget({
    label: "오픈채팅 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoNow@2x.png",
    ios3x: "Images/maintabIcoNow@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_now_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_openchat_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_openchat_image.png",
    ],
  }),
  tabOpenChatIconSelected: tabIconTarget({
    label: "오픈채팅 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoNowSelected@2x.png",
    ios3x: "Images/maintabIcoNowSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_now_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_now_focused_image.png",
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_openchat_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_openchat_focused_image.png",
    ],
  }),
  tabShoppingIcon: tabIconTarget({
    label: "쇼핑 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoShopping@2x.png",
    ios3x: "Images/maintabIcoShopping@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_shopping_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_shopping_image.png",
    ],
  }),
  tabShoppingIconSelected: tabIconTarget({
    label: "쇼핑 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoShoppingSelected@2x.png",
    ios3x: "Images/maintabIcoShoppingSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_shopping_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_shopping_focused_image.png",
    ],
  }),
  tabMoreIcon: tabIconTarget({
    label: "더보기 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoMore@2x.png",
    ios3x: "Images/maintabIcoMore@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_more_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_more_image.png",
    ],
  }),
  tabMoreIconSelected: tabIconTarget({
    label: "더보기 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoMoreSelected@2x.png",
    ios3x: "Images/maintabIcoMoreSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_more_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_more_focused_image.png",
    ],
  }),
  tabCallIcon: tabIconTarget({
    label: "통화 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoCall@2x.png",
    ios3x: "Images/maintabIcoCall@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_call_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_call_image.png",
    ],
  }),
  tabCallIconSelected: tabIconTarget({
    label: "통화 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoCallSelected@2x.png",
    ios3x: "Images/maintabIcoCallSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_call_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_call_focused_image.png",
    ],
  }),
  tabPiccomaIcon: tabIconTarget({
    label: "피코마 탭 아이콘 - 기본",
    ios2x: "Images/maintabIcoPiccoma@2x.png",
    ios3x: "Images/maintabIcoPiccoma@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_piccoma_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_piccoma_image.png",
    ],
  }),
  tabPiccomaIconSelected: tabIconTarget({
    label: "피코마 탭 아이콘 - 선택",
    ios2x: "Images/maintabIcoPiccomaSelected@2x.png",
    ios3x: "Images/maintabIcoPiccomaSelected@3x.png",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_piccoma_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_piccoma_focused_image.png",
    ],
  }),
  tabFindIcon: tabIconTarget({
    label: "찾기 탭 아이콘 - 기본",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_find_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_find_image.png",
    ],
  }),
  tabFindIconSelected: tabIconTarget({
    label: "찾기 탭 아이콘 - 선택",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_find_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_find_focused_image.png",
    ],
  }),
  tabGameIcon: tabIconTarget({
    label: "게임 탭 아이콘 - 기본",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_game_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_game_image.png",
    ],
  }),
  tabGameIconSelected: tabIconTarget({
    label: "게임 탭 아이콘 - 선택",
    android: [
      "src/main/theme/drawable-xxhdpi/theme_maintab_ico_game_focused_image.png",
      "src/main/theme/drawable-sw600dp/theme_maintab_ico_game_focused_image.png",
    ],
  }),
  profileImage: {
    label: "기본 프로필",
    displaySize: [360, 360],
    ios: ["Images/profileImg01@3x.png"],
    android: ["src/main/theme/drawable-xxhdpi/theme_profile_01_image.png"],
  },
  profileFullImage: {
    label: "기본 프로필 전체 이미지",
    android: ["src/main/theme/drawable-nodpi/theme_profile_01_image_full.png"],
  },
  addFriendButton: {
    label: "친구 추가 버튼 - 기본",
    displaySize: [126, 102],
    previewIos: "Images/findBtnAddFriend@3x.png",
    previewScale: 3,
    ios: ["Images/findBtnAddFriend@2x.png", "Images/findBtnAddFriend@3x.png"],
    android: ["src/main/theme/drawable-xxhdpi/theme_find_add_friend_button_image.png"],
  },
  addFriendButtonPressed: {
    label: "친구 추가 버튼 - 선택",
    displaySize: [126, 102],
    android: ["src/main/theme/drawable-xxhdpi/theme_find_add_friend_button_pressed_image.png"],
  },
  themeIcon: {
    label: "테마 아이콘",
    displaySize: [162, 162],
    ios: ["Images/commonIcoTheme.png"],
    android: [
      "src/main/res/mipmap-mdpi/ic_launcher.png",
      "src/main/res/mipmap-hdpi/ic_launcher.png",
      "src/main/res/mipmap-xhdpi/ic_launcher.png",
      "src/main/res/mipmap-xxhdpi/ic_launcher.png",
      "src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    ],
  },
  themeIconBackground: {
    label: "Android 런처 배경",
    android: androidMipmapTargets("ic_launcher_background.png"),
  },
  themeIconForeground: {
    label: "Android 런처 전경",
    android: androidMipmapTargets("ic_launcher_foreground.png"),
  },
  themeIconRound: {
    label: "Android 런처 라운드",
    android: androidMipmapTargets("ic_launcher_round.png"),
  },
  splashImage: {
    label: "로딩 배경",
    displaySize: [1440, 2560],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_splash_image.png",
      "src/main/theme/drawable-xhdpi/theme_splash_image.png",
      "src/main/theme/drawable-sw600dp/theme_splash_image.png",
      "src/main/theme/drawable-land-xxhdpi/theme_splash_image.png",
      "src/main/theme/drawable-land-xhdpi/theme_splash_image.png",
      "src/main/theme/drawable-sw600dp-land/theme_splash_image.png",
    ],
  },
  sendBubbleNormal: bubbleTarget({
    label: "나의 말풍선 - 기본",
    size: [120, 105],
    ios2x: "Images/chatroomBubbleSend01@2x.png",
    ios3x: "Images/chatroomBubbleSend01@3x.png",
    android: ["src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_01_image.9.png"],
  }),
  sendBubbleSelected: bubbleTarget({
    label: "나의 말풍선 - 기본+선택",
    size: [120, 105],
    ios2x: "Images/chatroomBubbleSend01Selected@2x.png",
    ios3x: "Images/chatroomBubbleSend01Selected@3x.png",
  }),
  sendBubbleTailless: bubbleTarget({
    label: "나의 말풍선 - 추가",
    size: [120, 105],
    ios2x: "Images/chatroomBubbleSend02@2x.png",
    ios3x: "Images/chatroomBubbleSend02@3x.png",
    android: ["src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_me_02_image.9.png"],
  }),
  sendBubbleTaillessSelected: bubbleTarget({
    label: "나의 말풍선 - 추가+선택",
    size: [120, 105],
    ios2x: "Images/chatroomBubbleSend02Selected@2x.png",
    ios3x: "Images/chatroomBubbleSend02Selected@3x.png",
  }),
  receiveBubbleNormal: bubbleTarget({
    label: "상대 말풍선 - 기본",
    size: [120, 105],
    ios2x: "Images/chatroomBubbleReceive01@2x.png",
    ios3x: "Images/chatroomBubbleReceive01@3x.png",
    android: ["src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_01_image.9.png"],
  }),
  receiveBubbleSelected: bubbleTarget({
    label: "상대 말풍선 - 기본+선택",
    size: [121, 105],
    ios2x: "Images/chatroomBubbleReceive01Selected@2x.png",
    ios3x: "Images/chatroomBubbleReceive01Selected@3x.png",
  }),
  receiveBubbleTailless: bubbleTarget({
    label: "상대 말풍선 - 추가",
    size: [120, 105],
    ios2x: "Images/chatroomBubbleReceive02@2x.png",
    ios3x: "Images/chatroomBubbleReceive02@3x.png",
    android: ["src/main/theme/drawable-xxhdpi/theme_chatroom_bubble_you_02_image.9.png"],
  }),
  receiveBubbleTaillessSelected: bubbleTarget({
    label: "상대 말풍선 - 추가+선택",
    size: [121, 105],
    ios2x: "Images/chatroomBubbleReceive02Selected@2x.png",
    ios3x: "Images/chatroomBubbleReceive02Selected@3x.png",
  }),
  passcodeBackgroundImage: {
    label: "암호 화면 배경",
    displaySizes: {
      ios: [1200, 1200],
      android: [1440, 1440],
    },
    ios: ["Images/passcodeBgImage@3x.png"],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_passcode_background_image.png",
      "src/main/theme/drawable-sw600dp/theme_passcode_background_image.png",
    ],
  },
  passcodeDot: {
    label: "암호 기본 이미지",
    displaySize: [132, 132],
    ios: [
      "Images/passcodeImgCode01@3x.png",
      "Images/passcodeImgCode02@3x.png",
      "Images/passcodeImgCode03@3x.png",
      "Images/passcodeImgCode04@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_passcode_01_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_02_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_03_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_04_image.png",
    ],
  },
  passcodeDotSelected: {
    label: "암호 입력 이미지",
    displaySize: [132, 132],
    ios: [
      "Images/passcodeImgCode01Selected@3x.png",
      "Images/passcodeImgCode02Selected@3x.png",
      "Images/passcodeImgCode03Selected@3x.png",
      "Images/passcodeImgCode04Selected@3x.png",
    ],
    android: [
      "src/main/theme/drawable-xxhdpi/theme_passcode_01_checked_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_02_checked_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_03_checked_image.png",
      "src/main/theme/drawable-xxhdpi/theme_passcode_04_checked_image.png",
    ],
  },
};

const cssString = (value) => `'${String(value ?? "").replaceAll("'", "")}'`;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toTransparentAndroidColor(value) {
  const color = String(value ?? "").trim().toUpperCase();
  const hex = color.match(/^#(?:[0-9A-F]{2})?([0-9A-F]{6})$/);
  return hex ? `#00${hex[1]}` : color;
}

export function getActiveColors(state) {
  return state?.colors ?? defaultThemeState.colors;
}

const colorFor = (state, key) => getActiveColors(state)?.[key] ?? defaultThemeState.colors[key];

export function setActiveColor(state, key, value) {
  const normalizedValue = String(value).toUpperCase();

  if (!state.colors) {
    state.colors = { ...defaultThemeState.colors };
  }

  state.colors[key] = normalizedValue;
}

export function sanitizeThemeIdSegment(value) {
  const sanitized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (!sanitized) {
    return "example";
  }

  return sanitized;
}

export function normalizeThemeVersion(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\d.]+/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .split(".")
    .slice(0, 3)
    .join(".");
}

export function isValidThemeVersion(value) {
  return /^\d+\.\d+\.\d+$/.test(String(value ?? "").trim());
}

export function getThemeId(state) {
  if (state.themeIdSegment !== undefined) {
    return `com.${sanitizeThemeIdSegment(state.themeIdSegment)}.kakaotalk.theme`;
  }

  return state.themeId || `com.${defaultThemeState.themeIdSegment}.kakaotalk.theme`;
}

export function getAuthorName(state) {
  if (state.baseAuthorName !== undefined || state.additionalAuthorName !== undefined) {
    const baseAuthor = String(state.baseAuthorName || defaultThemeState.baseAuthorName).trim();
    const additionalAuthor = String(state.additionalAuthorName || "").trim();
    return additionalAuthor ? `${baseAuthor}, ${additionalAuthor}` : baseAuthor;
  }

  return state.authorName || defaultThemeState.baseAuthorName;
}

function replaceInCssBlock(css, blockName, property, value) {
  const blockPattern = new RegExp(`${escapeRegex(blockName)}\\s*\\{[\\s\\S]*?\\}`, "m");
  const blockMatch = css.match(blockPattern);
  const declarationPattern = new RegExp(`(${escapeRegex(property)}\\s*:\\s*)[^;]*(;)`);

  if (!blockMatch) {
    return `${css.trimEnd()}\n\n${blockName}\n{\n    ${property}: ${value};\n}\n`;
  }

  const block = blockMatch[0];
  const nextBlock = declarationPattern.test(block)
    ? block.replace(declarationPattern, `$1${value}$2`)
    : block.replace(/\n?\}$/, `\n    ${property}: ${value};\n}`);

  return css.replace(block, nextBlock);
}

function replaceManifestValue(css, property, value) {
  return replaceInCssBlock(css, "ManifestStyle", property, cssString(value));
}

export function patchIosThemeCss(css, state) {
  let nextCss = css;
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-theme-name", state.appName);
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-theme-version", state.version);
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-author-name", getAuthorName(state));
  nextCss = replaceManifestValue(nextCss, "-kakaotalk-theme-id", getThemeId(state));

  nextCss = nextCss.replace(/\n\s*-kakaotalk-theme-style\s*:\s*'[^']*';/g, "");

  for (const [blockName, property, colorKey] of IOS_COLOR_BINDINGS) {
    nextCss = replaceInCssBlock(nextCss, blockName, property, colorFor(state, colorKey));
  }

  for (const [blockName, property] of IOS_MAIN_BACKGROUND_IMAGE_BINDINGS) {
    nextCss = replaceInCssBlock(nextCss, blockName, property, cssString("mainBgImage.png"));
  }

  for (const [blockName, property] of IOS_BUBBLE_EDGE_INSET_BINDINGS) {
    nextCss = replaceInCssBlock(nextCss, blockName, property, IOS_BUBBLE_EQUAL_EDGE_INSETS);
  }

  for (const [blockName, property, value] of IOS_FIXED_DECLARATIONS) {
    nextCss = replaceInCssBlock(nextCss, blockName, property, value);
  }

  return nextCss;
}

function replaceXmlResource(xml, tagName, resourceName, value) {
  const safeName = escapeRegex(resourceName);
  const pattern = new RegExp(`(<${tagName}\\s+name="${safeName}">)[\\s\\S]*?(<\\/${tagName}>)`);

  if (pattern.test(xml)) {
    return xml.replace(pattern, `$1${value}$2`);
  }

  return xml.replace(
    /<\/resources>\s*$/,
    `    <${tagName} name="${resourceName}">${value}</${tagName}>\n</resources>`,
  );
}

export function patchAndroidColorsXml(xml, state, { transparentMainBackgroundCells = false } = {}) {
  let nextXml = xml;

  for (const [resourceName, colorKey] of Object.entries(ANDROID_COLOR_BINDINGS)) {
    const value = colorFor(state, colorKey);
    if (value) {
      nextXml = replaceXmlResource(nextXml, "color", resourceName, value);
    }
  }

  if (transparentMainBackgroundCells) {
    const transparentMainBackground = toTransparentAndroidColor(colorFor(state, "mainBackground"));
    for (const resourceName of ANDROID_MAIN_BACKGROUND_CELL_RESOURCES) {
      nextXml = replaceXmlResource(nextXml, "color", resourceName, transparentMainBackground);
    }
  }

  return nextXml;
}

export function patchAndroidStringsXml(xml, state) {
  const name = escapeXml(state.appName || defaultThemeState.appName);
  let nextXml = replaceXmlResource(xml, "string", "theme_title", name);
  nextXml = replaceXmlResource(nextXml, "string", "app_name", name);
  return nextXml;
}

export function patchAndroidBuildGradle(gradle, state) {
  const themeId = getThemeId(state);
  return gradle
    .replace(/namespace\s*=\s*"[^"]*"/, `namespace = "${themeId}"`)
    .replace(/applicationId\s*=\s*"[^"]*"/, `applicationId = "${themeId}"`);
}

export function patchAndroidManifestXml(manifest, state) {
  return manifest.replace(/package="[^"]*"/, `package="${getThemeId(state)}"`);
}

export function cloneDefaultThemeState() {
  const colors = { ...defaultThemeState.colors };

  return {
    ...defaultThemeState,
    colors,
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
