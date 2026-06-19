export const PREVIEW_IMAGE_FOLDERS = {
  iosImages: "assets/templates/ios/Images",
  androidDrawableXxhdpi: "assets/templates/android-source/src/main/theme/drawable-xxhdpi",
};

const iosImage = (name) => `${PREVIEW_IMAGE_FOLDERS.iosImages}/${name}`;
const androidDrawableXxhdpi = (name) => `${PREVIEW_IMAGE_FOLDERS.androidDrawableXxhdpi}/${name}`;

export const PREVIEW_DEFAULT_IMAGE_PATHS = {
  mainBackground: iosImage("mainBgImage@3x.png"),
  chatBackground: iosImage("chatroomBgImage@3x.png"),
  tabBackground: iosImage("maintabBgImage@3x.png"),
  tabFriendIcon: iosImage("maintabIcoFriends@3x.png"),
  tabFriendIconSelected: iosImage("maintabIcoFriendsSelected@3x.png"),
  tabChatIcon: iosImage("maintabIcoChats@3x.png"),
  tabChatIconSelected: iosImage("maintabIcoChatsSelected@3x.png"),
  tabOpenChatIcon: iosImage("maintabIcoNow@3x.png"),
  tabOpenChatIconSelected: iosImage("maintabIcoNowSelected@3x.png"),
  tabShoppingIcon: iosImage("maintabIcoShopping@3x.png"),
  tabShoppingIconSelected: iosImage("maintabIcoShoppingSelected@3x.png"),
  tabMoreIcon: iosImage("maintabIcoMore@3x.png"),
  tabMoreIconSelected: iosImage("maintabIcoMoreSelected@3x.png"),
  tabCallIcon: iosImage("maintabIcoCall@3x.png"),
  tabCallIconSelected: iosImage("maintabIcoCallSelected@3x.png"),
  tabPiccomaIcon: iosImage("maintabIcoPiccoma@3x.png"),
  tabPiccomaIconSelected: iosImage("maintabIcoPiccomaSelected@3x.png"),
  profileImage: iosImage("profileImg01@3x.png"),
  addFriendButton: iosImage("findBtnAddFriend@3x.png"),
  themeIcon: iosImage("commonIcoTheme.png"),
  splashImage: androidDrawableXxhdpi("theme_splash_image.png"),
  sendBubbleNormal: iosImage("chatroomBubbleSend01@3x.png"),
  sendBubbleSelected: iosImage("chatroomBubbleSend01Selected@3x.png"),
  sendBubbleTailless: iosImage("chatroomBubbleSend02@3x.png"),
  sendBubbleTaillessSelected: iosImage("chatroomBubbleSend02Selected@3x.png"),
  receiveBubbleNormal: iosImage("chatroomBubbleReceive01@3x.png"),
  receiveBubbleSelected: iosImage("chatroomBubbleReceive01Selected@3x.png"),
  receiveBubbleTailless: iosImage("chatroomBubbleReceive02@3x.png"),
  receiveBubbleTaillessSelected: iosImage("chatroomBubbleReceive02Selected@3x.png"),
  passcodeBackgroundImage: iosImage("passcodeBgImage@3x.png"),
  passcodeDot: [
    iosImage("passcodeImgCode01@3x.png"),
    iosImage("passcodeImgCode02@3x.png"),
    iosImage("passcodeImgCode03@3x.png"),
    iosImage("passcodeImgCode04@3x.png"),
  ],
  passcodeDotSelected: [
    iosImage("passcodeImgCode01Selected@3x.png"),
    iosImage("passcodeImgCode02Selected@3x.png"),
    iosImage("passcodeImgCode03Selected@3x.png"),
    iosImage("passcodeImgCode04Selected@3x.png"),
  ],
};

const cssUrl = (path) => `url("./${path}")`;
const cssImageSet = (path, scale = 3) => `image-set(${cssUrl(path)} ${scale}x)`;

export const PREVIEW_IMAGE_CSS_VARIABLES_BY_KEY = {
  mainBackground: ["--preview-main-image"],
  chatBackground: ["--preview-chat-image"],
  tabBackground: ["--preview-tab-image"],
  tabFriendIcon: ["--preview-tab-friends-icon"],
  tabFriendIconSelected: ["--preview-tab-friends-icon-selected"],
  tabChatIcon: ["--preview-tab-chat-icon"],
  tabChatIconSelected: ["--preview-tab-chat-icon-selected"],
  tabOpenChatIcon: ["--preview-tab-openchat-icon"],
  tabOpenChatIconSelected: ["--preview-tab-openchat-icon-selected"],
  tabShoppingIcon: ["--preview-tab-shopping-icon"],
  tabShoppingIconSelected: ["--preview-tab-shopping-icon-selected"],
  tabMoreIcon: ["--preview-tab-more-icon"],
  tabMoreIconSelected: ["--preview-tab-more-icon-selected"],
  profileImage: ["--preview-profile-image"],
  themeIcon: ["--preview-theme-icon"],
  splashImage: ["--preview-splash-image"],
  passcodeBackgroundImage: ["--preview-passcode-image"],
};

export const PREVIEW_CSS_IMAGE_VARIABLES = {
  "--preview-main-image": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.mainBackground),
  "--preview-chat-image": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.chatBackground),
  "--preview-tab-image": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabBackground),
  "--preview-tab-friends-icon": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabFriendIcon),
  "--preview-tab-friends-icon-selected": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabFriendIconSelected),
  "--preview-tab-chat-icon": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabChatIcon),
  "--preview-tab-chat-icon-selected": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabChatIconSelected),
  "--preview-tab-openchat-icon": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabOpenChatIcon),
  "--preview-tab-openchat-icon-selected": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabOpenChatIconSelected),
  "--preview-tab-shopping-icon": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabShoppingIcon),
  "--preview-tab-shopping-icon-selected": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabShoppingIconSelected),
  "--preview-tab-more-icon": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabMoreIcon),
  "--preview-tab-more-icon-selected": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.tabMoreIconSelected),
  "--preview-profile-image": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.profileImage),
  "--preview-theme-icon": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.themeIcon),
  "--preview-splash-image": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.splashImage),
  "--preview-passcode-image": cssUrl(PREVIEW_DEFAULT_IMAGE_PATHS.passcodeBackgroundImage),
  "--preview-send-image": cssImageSet(PREVIEW_DEFAULT_IMAGE_PATHS.sendBubbleNormal),
  "--preview-receive-image": cssImageSet(PREVIEW_DEFAULT_IMAGE_PATHS.receiveBubbleNormal),
  "--preview-send-additional-image": cssImageSet(PREVIEW_DEFAULT_IMAGE_PATHS.sendBubbleTailless),
  "--preview-receive-additional-image": cssImageSet(PREVIEW_DEFAULT_IMAGE_PATHS.receiveBubbleTailless),
};

export function getPreviewDefaultImagePath(key, index = 0) {
  const value = PREVIEW_DEFAULT_IMAGE_PATHS[key];

  if (Array.isArray(value)) {
    return value[index] ?? value[0] ?? "";
  }

  return value ?? "";
}

export function getPreviewDefaultCssUrl(key, index = 0) {
  const path = getPreviewDefaultImagePath(key, index);
  return path ? cssUrl(path) : "";
}

export function getPreviewDefaultCssVariableValue(variableName) {
  return PREVIEW_CSS_IMAGE_VARIABLES[variableName] ?? "";
}

export function applyPreviewDefaultImages(root) {
  Object.entries(PREVIEW_CSS_IMAGE_VARIABLES).forEach(([variableName, value]) => {
    root.style.setProperty(variableName, value);
  });
}
