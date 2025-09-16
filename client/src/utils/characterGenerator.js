// 문자 기반 캐릭터 생성기
const createCharacterImages = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 32;
  canvas.height = 48;

  const characters = {
    up: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    },
    down: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    },
    left: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    },
    right: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    }
  };

  const images = {};

  // 각 방향별로 캐릭터 이미지 생성
  Object.keys(characters).forEach(direction => {
    ctx.clearRect(0, 0, 32, 48);
    
    // 투명 배경 설정 (완전 투명)
    ctx.clearRect(0, 0, 32, 48);

    const char = characters[direction];
    
    // 머리 (상단) - Y 위치를 더 아래로 이동하여 잘림 방지
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(char.head, 16, 16);

    // 몸 (중간)
    ctx.font = '10px Arial';
    ctx.fillText(char.body, 16, 28);

    // 팔 (양쪽)
    ctx.font = '8px Arial';
    if (direction === 'left') {
      ctx.fillText(char.arms, 8, 28);
    } else if (direction === 'right') {
      ctx.fillText(char.arms, 24, 28);
    } else {
      ctx.fillText(char.arms, 12, 28);
      ctx.fillText(char.arms, 20, 28);
    }

    // 다리 (하단)
    ctx.font = '8px Arial';
    ctx.fillText(char.legs, 16, 40);

    images[direction] = canvas.toDataURL('image/png');
  });

  return images;
};

// 기본 캐릭터 생성
export const createDefaultCharacter = (name = '기본 캐릭터') => {
  const images = createCharacterImages();
  
  return {
    name: name,
    images: images,
    size: 48,
    position: { x: 0, y: 0 }
  };
};

// 향상된 문자 기반 캐릭터 생성기 (각 방향마다 다른 모습)
export const createAdvancedCharacter = (name = '향상된 캐릭터') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 32;
  canvas.height = 48;

  const characters = {
    up: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    },
    down: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    },
    left: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    },
    right: {
      head: '😊',
      body: '👕',
      arms: '👐',
      legs: '👖'
    }
  };

  const images = {};

  // 각 방향별로 캐릭터 이미지 생성
  Object.keys(characters).forEach(direction => {
    ctx.clearRect(0, 0, 32, 48);
    
    // 투명 배경 설정 (완전 투명)
    ctx.clearRect(0, 0, 32, 48);

    const char = characters[direction];
    
    // 머리 (상단) - Y 위치를 더 아래로 이동하여 잘림 방지
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(char.head, 16, 16);

    // 몸 (중간)
    ctx.font = '10px Arial';
    ctx.fillText(char.body, 16, 28);

    // 팔 (양쪽)
    ctx.font = '8px Arial';
    if (direction === 'left') {
      ctx.fillText(char.arms, 8, 28);
    } else if (direction === 'right') {
      ctx.fillText(char.arms, 24, 28);
    } else {
      ctx.fillText(char.arms, 12, 28);
      ctx.fillText(char.arms, 20, 28);
    }

    // 다리 (하단)
    ctx.font = '8px Arial';
    ctx.fillText(char.legs, 16, 40);

    images[direction] = canvas.toDataURL('image/png');
  });

  return {
    name: name,
    images: images,
    size: 48,
    position: { x: 0, y: 0 }
  };
};

// 커스텀 캐릭터 생성
export const createCustomCharacter = (name, customChars) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 32;
  canvas.height = 48;

  const images = {};

  // 각 방향별로 커스텀 캐릭터 이미지 생성
  Object.keys(customChars).forEach(direction => {
    ctx.clearRect(0, 0, 32, 48);
    
    // 투명 배경 설정 (완전 투명)
    ctx.clearRect(0, 0, 32, 48);

    const char = customChars[direction];
    
    // 머리 - Y 위치를 더 아래로 이동하여 잘림 방지
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(char.head || '😊', 16, 16);

    // 몸
    ctx.font = '10px Arial';
    ctx.fillText(char.body || '👕', 16, 28);

    // 팔
    ctx.font = '8px Arial';
    if (direction === 'left') {
      ctx.fillText(char.arms || '👐', 8, 28);
    } else if (direction === 'right') {
      ctx.fillText(char.arms || '👐', 24, 28);
    } else {
      ctx.fillText(char.arms || '👐', 12, 28);
      ctx.fillText(char.arms || '👐', 20, 28);
    }

    // 다리
    ctx.font = '8px Arial';
    ctx.fillText(char.legs || '👖', 16, 40);

    images[direction] = canvas.toDataURL('image/png');
  });

  return {
    name: name,
    images: images,
    size: 48,
    position: { x: 0, y: 0 }
  };
};

// 캐릭터 이미지 생성 (기존 함수 유지)
export const generateCharacterImages = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 32;
  canvas.height = 32;

  const colors = {
    head: '#FFB6C1', // 연한 분홍색
    body: '#87CEEB', // 하늘색
    feet: '#8B4513'  // 갈색
  };

  const images = {};

  // 각 방향별로 캐릭터 생성
  ['up', 'down', 'left', 'right'].forEach(direction => {
    ctx.clearRect(0, 0, 32, 32);
    
    // 배경
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 32, 32);

    // 머리 (원형)
    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.arc(16, 8, 6, 0, 2 * Math.PI);
    ctx.fill();

    // 몸 (사각형)
    ctx.fillStyle = colors.body;
    ctx.fillRect(12, 14, 8, 12);

    // 다리
    ctx.fillStyle = colors.feet;
    ctx.fillRect(10, 26, 3, 6);
    ctx.fillRect(19, 26, 3, 6);

    images[direction] = canvas.toDataURL('image/png');
  });

  return images;
};