import React, { useState } from 'react';
import { normalizePrivateAreas } from '../utils/privateAreaUtils';

const AreaDebugOverlay = ({ currentMap, currentPosition, currentArea, mapScale = 1 }) => {
  const [showDebug, setShowDebug] = useState(true);
  
  // 맵의 privateAreas를 정규화하여 사용
  const areas = normalizePrivateAreas(currentMap?.privateAreas || []);
  
  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        style={{
          position: 'fixed',
          top: '60px',
          right: '20px',
          zIndex: 10000,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        🔍 영역 디버그 보기
      </button>
    );
  }
  
  return (
    <>
      {/* 영역 시각화 오버레이 - 맵 캔버스 위에 고정 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 999
        }}
      >
        {areas.map((area, index) => {
          // 각 영역마다 다른 색상 지정
          const colors = [
            'rgba(255, 0, 0, 0.3)',
            'rgba(0, 255, 0, 0.3)',
            'rgba(0, 0, 255, 0.3)',
            'rgba(128, 0, 128, 0.3)',
            'rgba(255, 165, 0, 0.3)'
          ];
          const borderColors = [
            'rgba(255, 0, 0, 0.8)',
            'rgba(0, 255, 0, 0.8)',
            'rgba(0, 0, 255, 0.8)',
            'rgba(128, 0, 128, 0.8)',
            'rgba(255, 165, 0, 0.8)'
          ];
          
          return (
            <div
              key={area.id || index}
              style={{
                position: 'absolute',
                left: `${(area.position?.x || 0) * mapScale}px`,
                top: `${(area.position?.y || 0) * mapScale}px`,
                width: `${(area.size?.width || 0) * mapScale}px`,
                height: `${(area.size?.height || 0) * mapScale}px`,
                backgroundColor: colors[index % colors.length],
                border: `2px solid ${borderColors[index % borderColors.length]}`,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 0 4px rgba(0,0,0,0.8)'
              }}
            >
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {area.name || `영역 ${index + 1}`}
              </div>
            </div>
          );
        })}
        
        {/* 현재 위치 표시 */}
        {currentPosition && (
          <div
            style={{
              position: 'absolute',
              left: `${(currentPosition.x - 5) * mapScale}px`,
              top: `${(currentPosition.y - 5) * mapScale}px`,
              width: '10px',
              height: '10px',
              backgroundColor: 'yellow',
              border: '2px solid black',
              borderRadius: '50%',
              zIndex: 1000
            }}
          />
        )}
      </div>
      
      {/* 디버그 정보 패널 */}
      <div style={{
        position: 'fixed',
        top: '60px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        minWidth: '250px',
        maxWidth: '350px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>🔍 영역 디버그</h3>
          <button
            onClick={() => setShowDebug(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>현재 맵:</strong> {currentMap?.name || '알 수 없음'}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>현재 위치:</strong><br/>
          X: {currentPosition?.x?.toFixed(0) || '0'}, 
          Y: {currentPosition?.y?.toFixed(0) || '0'}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>현재 영역:</strong><br/>
          <span style={{
            color: currentArea?.type === 'private' ? '#ff6b6b' : '#51cf66',
            fontWeight: 'bold'
          }}>
            {currentArea?.type === 'private' ? '🔒' : '🌍'} {currentArea?.name || '알 수 없음'}
          </span>
        </div>
        
        <div style={{ 
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <strong>프라이빗 영역 목록:</strong>
          {areas.length === 0 ? (
            <div style={{ marginTop: '5px', color: '#888', fontSize: '11px' }}>
              이 맵에는 프라이빗 영역이 없습니다
            </div>
          ) : (
            areas.map((area, index) => {
              const borderColors = [
                'rgba(255, 0, 0, 0.8)',
                'rgba(0, 255, 0, 0.8)',
                'rgba(0, 0, 255, 0.8)',
                'rgba(128, 0, 128, 0.8)',
                'rgba(255, 165, 0, 0.8)'
              ];
              
              return (
                <div key={area.id || index} style={{ 
                  marginTop: '5px',
                  padding: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  <div style={{ color: borderColors[index % borderColors.length] }}>
                    🔒 {area.name || `영역 ${index + 1}`}
                  </div>
                  <div style={{ color: '#888', marginTop: '2px' }}>
                    {area.start && area.end ? (
                      <>
                        시작점: ({area.start.x}, {area.start.y})<br/>
                        끝점: ({area.end.x}, {area.end.y})<br/>
                      </>
                    ) : null}
                    위치: ({area.position?.x || 0}, {area.position?.y || 0})<br/>
                    크기: {area.size?.width || 0}×{area.size?.height || 0}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default AreaDebugOverlay;