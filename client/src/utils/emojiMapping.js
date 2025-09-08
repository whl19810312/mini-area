// 이모지 매핑 유틸리티
export const emojiMapping = {
  head: {
    'head_1': '😊',
    'head_2': '😄',
    'head_3': '😃',
    'head_4': '😀',
    'head_5': '😉',
    'head_6': '😋',
    'head_7': '😎',
    'head_8': '🤔',
    'head_9': '😴',
    'head_10': '😍',
    'head_11': '🥰',
    'head_12': '😇',
    'head_13': '🤠',
    'head_14': '👻',
    'head_15': '🤖',
    'head_16': '👽',
    'head_17': '🙂',
    'head_18': '😐',
    'head_19': '😑',
    'head_20': '😶'
  },
  top: {
    'top_1': '👕',
    'top_2': '👔',
    'top_4': '🥋',
    'top_5': '🦺',
    'top_6': '👚',
    'top_7': '🎽',
    'top_13': '🧥',
    'top_14': '🥼',
    'top_15': '👘'
  },
  bottom: {
    'bottom_1': '👖',
    'bottom_2': '🩳',
  }
};

// ID를 이모지로 변환하는 함수
export const getEmojiById = (part, id) => {
  // 이미 이모지인 경우 그대로 반환
  if (!id || id.length <= 3) return id;
  
  // ID에서 이모지 찾기
  if (emojiMapping[part] && emojiMapping[part][id]) {
    return emojiMapping[part][id];
  }
  
  // 기본값 반환
  const defaults = {
    head: '😊',
    top: '👕',
    bottom: '👖'
  };
  
  return defaults[part] || id;
};

// appearance 객체의 모든 ID를 이모지로 변환
export const convertAppearanceToEmojis = (appearance) => {
  if (!appearance) return null;
  
  return {
    ...appearance,
    head: getEmojiById('head', appearance.head) || appearance.emoji || '😊',
    top: getEmojiById('top', appearance.top) || '👕',
    bottom: getEmojiById('bottom', appearance.bottom) || '👖'
  };
};
