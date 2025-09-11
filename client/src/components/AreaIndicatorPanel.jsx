import React from 'react';
import './AreaIndicatorPanel.css';

/**
 * 현재 사용자가 속한 영역을 표시하는 패널
 * 
 * @param {Object} props
 * @param {number} props.currentAreaIndex - 현재 영역 인덱스 (0: 퍼블릭, 1~n: 프라이빗)
 * @param {string} props.currentAreaType - 현재 영역 타입 ('public' | 'private')
 * @param {Object} props.currentAreaInfo - 현재 영역 상세 정보
 * @param {Object} props.userPosition - 사용자 현재 위치 {x, y}
 * @param {boolean} props.isVisible - 패널 표시 여부 (기본: true)
 */
const AreaIndicatorPanel = ({ 
  currentAreaIndex = 0,
  currentAreaType = 'public',
  currentAreaInfo = null,
  userPosition = { x: 0, y: 0 },
  isVisible = true 
}) => {
  
  if (!isVisible) {
    return null;
  }

  // 영역 타입에 따른 스타일 및 아이콘 설정
  const getAreaStyle = () => {
    if (currentAreaType === 'private') {
      return {
        backgroundColor: 'rgba(33, 150, 243, 0.9)', // 파란색
        borderColor: '#1976D2',
        icon: '🔒',
        textColor: '#ffffff'
      };
    } else {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.9)', // 초록색
        borderColor: '#388E3C',
        icon: '🌍',
        textColor: '#ffffff'
      };
    }
  };

  const areaStyle = getAreaStyle();

  // 영역 이름 결정
  const getAreaName = () => {
    if (currentAreaType === 'private' && currentAreaInfo?.name) {
      return currentAreaInfo.name;
    } else if (currentAreaType === 'private') {
      return `프라이빗 영역 ${currentAreaIndex}`;
    } else {
      return '퍼블릭 영역';
    }
  };

  // 영역 상세 정보
  const getAreaDetails = () => {
    if (currentAreaType === 'private' && currentAreaInfo?.area) {
      const area = currentAreaInfo.area;
      return {
        size: area.size ? `${area.size.width} × ${area.size.height}` : 
              (area.width && area.height) ? `${area.width} × ${area.height}` : '알 수 없음',
        bounds: area.position ? 
          `(${area.position.x}, ${area.position.y})` : 
          (area.x !== undefined && area.y !== undefined) ? 
            `(${area.x}, ${area.y})` : '알 수 없음'
      };
    }
    return null;
  };

  const areaDetails = getAreaDetails();

  return (
    <div 
      className="area-indicator-panel"
      style={{
        backgroundColor: areaStyle.backgroundColor,
        borderColor: areaStyle.borderColor,
        color: areaStyle.textColor
      }}
    >
      {/* 메인 영역 정보 */}
      <div className="area-main-info">
        <span className="area-icon" role="img" aria-label="area-icon">
          {areaStyle.icon}
        </span>
        <div className="area-text">
          <div className="area-name">{getAreaName()}</div>
          <div className="area-index">영역 #{currentAreaIndex}</div>
        </div>
      </div>

      {/* 상세 정보 (프라이빗 영역인 경우) */}
      {currentAreaType === 'private' && areaDetails && (
        <div className="area-details">
          <div className="area-detail-item">
            <span className="detail-label">크기:</span>
            <span className="detail-value">{areaDetails.size}</span>
          </div>
          <div className="area-detail-item">
            <span className="detail-label">위치:</span>
            <span className="detail-value">{areaDetails.bounds}</span>
          </div>
        </div>
      )}

      {/* 사용자 위치 정보 */}
      <div className="user-position">
        <span className="position-label">내 위치:</span>
        <span className="position-value">
          ({Math.round(userPosition.x)}, {Math.round(userPosition.y)})
        </span>
      </div>

      {/* 영역 전환 애니메이션을 위한 인디케이터 */}
      <div className="area-transition-indicator">
        <div 
          className={`transition-dot ${currentAreaType}`}
          style={{ backgroundColor: areaStyle.borderColor }}
        ></div>
      </div>
    </div>
  );
};

export default AreaIndicatorPanel;