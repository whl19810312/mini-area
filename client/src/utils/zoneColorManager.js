/**
 * 영역별 색상 관리자
 * 영역 정보를 기반으로 고유한 색상을 할당하고 관리합니다.
 */

// 프라이빗 영역별 고정 색상 팔레트 (영역 번호 순서)
const ZONE_COLOR_PALETTE = [
  '#FF6B6B', // 1번 프라이빗 영역: 빨강
  '#4CAF50', // 2번 프라이빗 영역: 녹색  
  '#2196F3', // 3번 프라이빗 영역: 청색
  '#FFEB3B', // 4번 프라이빗 영역: 노랑
  '#9C27B0', // 5번 프라이빗 영역: 보라
  '#8BC34A', // 6번 프라이빗 영역: 연두색
  '#FF9800', // 7번 프라이빗 영역: 주황색
  '#3F51B5', // 8번 프라이빗 영역: 남색
  '#E91E63', // 9번 프라이빗 영역: 분홍
  '#00BCD4', // 10번 프라이빗 영역: 시안
  '#795548', // 11번 프라이빗 영역: 갈색
  '#607D8B'  // 12번 프라이빗 영역: 청회색
];

// 퍼블릭 영역 기본 색상
const PUBLIC_ZONE_COLOR = '#E8E8E8'; // 회색 계열

class ZoneColorManager {
  constructor() {
    // 영역별 색상 매핑: areaId -> color
    this.zoneColors = new Map();
    // 색상별 영역 목록: color -> Set<areaId>
    this.colorZones = new Map();
    // 현재 사용 중인 색상 인덱스
    this.currentColorIndex = 0;
  }

  /**
   * 영역 ID에 기반한 해시 함수
   * 같은 영역 ID는 항상 같은 색상을 가지도록 보장
   */
  hashAreaId(areaId) {
    if (!areaId) return 0;
    let hash = 0;
    for (let i = 0; i < areaId.length; i++) {
      const char = areaId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash);
  }

  /**
   * 영역에 대한 색상을 할당하거나 조회
   * @param {string} areaType - 'public' | 'private'
   * @param {string} areaId - 영역 ID
   * @param {string} areaName - 영역 이름 (선택사항)
   * @returns {string} 할당된 색상 (HEX 코드)
   */
  getZoneColor(areaType, areaId, areaName = null) {
    // 퍼블릭 영역은 항상 고정 색상
    if (areaType === 'public') {
      return PUBLIC_ZONE_COLOR;
    }

    // 이미 할당된 색상이 있는지 확인
    if (this.zoneColors.has(areaId)) {
      return this.zoneColors.get(areaId);
    }

    let selectedColor;
    let colorIndex;

    // 프라이빗 영역의 경우 영역 번호에 따라 고정 색상 할당
    if (areaType === 'private') {
      // areaId에서 숫자 추출 (예: "private-1" -> 1, "1" -> 1)
      const areaNumber = this.extractAreaNumber(areaId);
      
      if (areaNumber !== null && areaNumber >= 1) {
        // 영역 번호에 따라 색상 인덱스 결정 (1번 영역 = 0번 인덱스)
        colorIndex = (areaNumber - 1) % ZONE_COLOR_PALETTE.length;
        selectedColor = ZONE_COLOR_PALETTE[colorIndex];
      } else {
        // 영역 번호를 추출할 수 없는 경우 해시 사용
        const hash = this.hashAreaId(areaId);
        colorIndex = hash % ZONE_COLOR_PALETTE.length;
        selectedColor = ZONE_COLOR_PALETTE[colorIndex];
      }
    } else {
      // 기타 영역 타입의 경우 해시 사용
      const hash = this.hashAreaId(areaId);
      colorIndex = hash % ZONE_COLOR_PALETTE.length;
      selectedColor = ZONE_COLOR_PALETTE[colorIndex];
    }

    // 색상 매핑 저장
    this.zoneColors.set(areaId, selectedColor);
    
    // 해당 색상을 사용하는 영역 목록에 추가
    if (!this.colorZones.has(selectedColor)) {
      this.colorZones.set(selectedColor, new Set());
    }
    this.colorZones.get(selectedColor).add(areaId);

    console.log('🎨 [색상할당]', {
      areaType,
      areaId,
      areaName,
      selectedColor,
      colorIndex,
      areaNumber: areaType === 'private' ? this.extractAreaNumber(areaId) : 'N/A'
    });

    return selectedColor;
  }

  /**
   * 영역 ID에서 영역 번호 추출
   * @param {string} areaId - 영역 ID (예: "private-1", "1", "area-2" 등)
   * @returns {number|null} 추출된 숫자 또는 null
   */
  extractAreaNumber(areaId) {
    if (!areaId) return null;
    
    // 숫자만 추출하는 정규식
    const match = areaId.toString().match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  /**
   * 특정 색상을 사용하는 모든 영역 ID 조회
   * @param {string} color - HEX 색상 코드
   * @returns {Array<string>} 해당 색상을 사용하는 영역 ID 목록
   */
  getZonesByColor(color) {
    const zones = this.colorZones.get(color);
    return zones ? Array.from(zones) : [];
  }

  /**
   * 영역 정보로부터 색상 조회
   * @param {Object} area - { type, id, name }
   * @returns {string} 색상 코드
   */
  getColorFromArea(area) {
    if (!area || !area.id) {
      return PUBLIC_ZONE_COLOR;
    }
    return this.getZoneColor(area.type, area.id, area.name);
  }

  /**
   * 같은 색상을 가진 영역들의 그룹 정보 조회
   * @param {string} areaId - 기준 영역 ID
   * @returns {Object} { color, zones: [...] }
   */
  getColorGroup(areaId) {
    const color = this.zoneColors.get(areaId);
    if (!color) {
      return { color: PUBLIC_ZONE_COLOR, zones: [] };
    }

    return {
      color,
      zones: this.getZonesByColor(color)
    };
  }

  /**
   * 영역별 색상 매핑 전체 조회
   * @returns {Object} { areaId: color, ... }
   */
  getAllZoneColors() {
    const result = {};
    this.zoneColors.forEach((color, areaId) => {
      result[areaId] = color;
    });
    return result;
  }

  /**
   * 색상별 영역 그룹 전체 조회
   * @returns {Object} { color: [areaId, ...], ... }
   */
  getAllColorGroups() {
    const result = {};
    this.colorZones.forEach((zones, color) => {
      result[color] = Array.from(zones);
    });
    return result;
  }

  /**
   * 영역 색상 정보 제거
   * @param {string} areaId - 제거할 영역 ID
   */
  removeZone(areaId) {
    const color = this.zoneColors.get(areaId);
    if (color) {
      // 영역별 색상 매핑에서 제거
      this.zoneColors.delete(areaId);
      
      // 색상별 영역 목록에서 제거
      const zones = this.colorZones.get(color);
      if (zones) {
        zones.delete(areaId);
        // 해당 색상을 사용하는 영역이 없으면 색상 그룹도 제거
        if (zones.size === 0) {
          this.colorZones.delete(color);
        }
      }

      console.log('🎨 [색상제거]', { areaId, color });
    }
  }

  /**
   * 모든 색상 매핑 초기화
   */
  clear() {
    this.zoneColors.clear();
    this.colorZones.clear();
    this.currentColorIndex = 0;
    console.log('🎨 [색상매핑] 전체 초기화');
  }

  /**
   * 색상의 밝기 조정 (캐릭터 가독성을 위해)
   * @param {string} color - 기본 색상
   * @param {number} alpha - 투명도 (0-1)
   * @returns {string} rgba 색상
   */
  getColorWithAlpha(color, alpha = 0.8) {
    // HEX를 RGB로 변환
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 색상의 대비색 (텍스트용)
   * @param {string} color - 배경 색상
   * @returns {string} 대비되는 텍스트 색상
   */
  getContrastColor(color) {
    // HEX를 RGB로 변환
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 밝기 계산 (0-255)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 밝으면 검은색, 어두우면 흰색
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }
}

// 싱글톤 인스턴스 생성
const zoneColorManager = new ZoneColorManager();

export default zoneColorManager;

// 개별 함수들도 export
export {
  ZONE_COLOR_PALETTE,
  PUBLIC_ZONE_COLOR
};