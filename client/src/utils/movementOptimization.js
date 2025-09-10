// 캐릭터 움직임 최적화를 위한 유틸리티 함수들

// 이징 함수들 (부드러운 애니메이션을 위한)
export const easing = {
  // 부드러운 시작과 끝
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  // 선형 보간
  linear: (t) => t,
  // 부드러운 시작
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3)
};

// 벡터 계산 유틸리티
export const vector = {
  // 두 점 사이의 거리 계산
  distance: (a, b) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)),
  
  // 벡터 정규화
  normalize: (vector) => {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return length > 0 ? { x: vector.x / length, y: vector.y / length } : { x: 0, y: 0 };
  },
  
  // 벡터 곱셈
  multiply: (vector, scalar) => ({ x: vector.x * scalar, y: vector.y * scalar }),
  
  // 벡터 덧셈
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  
  // 선형 보간
  lerp: (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  })
};

// 움직임 예측 함수
export const prediction = {
  // 현재 위치와 속도를 기반으로 미래 위치 예측
  predictPosition: (currentPos, direction, speed, deltaTime) => {
    const directionVectors = {
      'up': { x: 0, y: -1 },
      'down': { x: 0, y: 1 },
      'left': { x: -1, y: 0 },
      'right': { x: 1, y: 0 }
    };
    
    const dirVector = directionVectors[direction] || { x: 0, y: 0 };
    const distance = speed * (deltaTime / 1000); // deltaTime을 초로 변환
    
    return {
      x: currentPos.x + dirVector.x * distance,
      y: currentPos.y + dirVector.y * distance
    };
  },
  
  // 네트워크 지연을 보상한 위치 계산
  compensateNetworkDelay: (serverPosition, direction, speed, networkDelay) => {
    const compensationTime = Math.min(networkDelay, 200); // 최대 200ms까지만 보상
    return prediction.predictPosition(serverPosition, direction, speed, compensationTime);
  }
};

// 보간 상태 관리 클래스
export class InterpolationManager {
  constructor() {
    this.interpolations = new Map();
    this.animationId = null;
  }
  
  // 새로운 보간 시작
  startInterpolation(id, startPos, targetPos, duration = 200, easingFunc = easing.easeOutQuart) {
    this.interpolations.set(id, {
      startPos: { ...startPos },
      targetPos: { ...targetPos },
      startTime: Date.now(),
      duration,
      easingFunc
    });
    
    if (!this.animationId) {
      this.animate();
    }
  }
  
  // 보간 중지
  stopInterpolation(id) {
    this.interpolations.delete(id);
  }
  
  // 현재 보간된 위치 가져오기
  getCurrentPosition(id) {
    const interpolation = this.interpolations.get(id);
    if (!interpolation) return null;
    
    const { startPos, targetPos, startTime, duration, easingFunc } = interpolation;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFunc(progress);
    
    return {
      x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
      y: startPos.y + (targetPos.y - startPos.y) * easedProgress,
      completed: progress >= 1
    };
  }
  
  // 애니메이션 루프
  animate() {
    let hasActiveInterpolations = false;
    
    // 완료된 보간 정리
    this.interpolations.forEach((interpolation, id) => {
      const elapsed = Date.now() - interpolation.startTime;
      if (elapsed >= interpolation.duration) {
        this.interpolations.delete(id);
      } else {
        hasActiveInterpolations = true;
      }
    });
    
    if (hasActiveInterpolations) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
    }
  }
  
  // 정리 함수
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.interpolations.clear();
  }
}

// 스로틀링 함수 (너무 자주 호출되는 것을 방지)
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return (...args) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// 디바운싱 함수 (연속된 호출에서 마지막 것만 실행)
export const debounce = (func, delay) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

// 네트워크 지연 측정
export class NetworkLatencyMeasurer {
  constructor(socket) {
    this.socket = socket;
    this.latency = 0;
    this.samples = [];
    this.maxSamples = 10;
  }
  
  // 핑 측정 시작
  measureLatency() {
    const startTime = Date.now();
    
    this.socket.emit('ping', { timestamp: startTime });
    
    this.socket.once('pong', (data) => {
      const endTime = Date.now();
      const latency = endTime - data.timestamp;
      
      this.addSample(latency);
    });
  }
  
  // 지연 시간 샘플 추가
  addSample(latency) {
    this.samples.push(latency);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    
    // 평균 지연 시간 계산
    this.latency = this.samples.reduce((sum, sample) => sum + sample, 0) / this.samples.length;
  }
  
  // 현재 지연 시간 반환
  getLatency() {
    return this.latency;
  }
  
  // 주기적으로 지연 시간 측정
  startPeriodicMeasurement(interval = 5000) {
    this.measureLatency();
    this.intervalId = setInterval(() => {
      this.measureLatency();
    }, interval);
  }
  
  // 측정 중지
  stopPeriodicMeasurement() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}