import React, { useState } from 'react';
import '../styles/VideoAutoStartSettings.css';

const VideoAutoStartSettings = ({ 
  autoStartSettings, 
  onUpdateSettings, 
  onToggleEnabled,
  isAutoStarting,
  lastAutoStartResult,
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSettingChange = (key, value) => {
    onUpdateSettings({ [key]: value });
  };

  const handleToggleEnabled = () => {
    onToggleEnabled(!autoStartSettings.autoStartEnabled);
  };

  const getStatusIcon = () => {
    if (isAutoStarting) return '🔄';
    if (lastAutoStartResult?.success) return '✅';
    if (lastAutoStartResult?.success === false) return '❌';
    return autoStartSettings.autoStartEnabled ? '🟢' : '🔴';
  };

  const getStatusText = () => {
    if (isAutoStarting) return '자동 시작 중...';
    if (lastAutoStartResult?.success) return '자동 시작 성공';
    if (lastAutoStartResult?.success === false) return '자동 시작 실패';
    return autoStartSettings.autoStartEnabled ? '활성화됨' : '비활성화됨';
  };

  return (
    <div className={`video-auto-start-settings ${className}`}>
      <div className="settings-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <span className="status-icon">{getStatusIcon()}</span>
          <h4>📹 화상통신 자동 시작</h4>
          <span className="status-text">{getStatusText()}</span>
        </div>
        <div className="header-right">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={autoStartSettings.autoStartEnabled}
              onChange={handleToggleEnabled}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="toggle-slider"></span>
          </label>
          <button className="expand-btn">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="settings-content">
          <div className="settings-section">
            <h5>영역별 자동 시작</h5>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={autoStartSettings.settings.privateAreas}
                  onChange={(e) => handleSettingChange('privateAreas', e.target.checked)}
                />
                프라이빗 영역
              </label>
              <span className="setting-description">프라이빗 영역 진입 시 자동 시작</span>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={autoStartSettings.settings.publicAreas}
                  onChange={(e) => handleSettingChange('publicAreas', e.target.checked)}
                />
                퍼블릭 영역
              </label>
              <span className="setting-description">퍼블릭 영역 진입 시 자동 시작</span>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={autoStartSettings.settings.lobby}
                  onChange={(e) => handleSettingChange('lobby', e.target.checked)}
                />
                대기실
              </label>
              <span className="setting-description">대기실 진입 시 자동 시작</span>
            </div>
          </div>

          <div className="settings-section">
            <h5>고급 설정</h5>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={autoStartSettings.settings.requirePermission}
                  onChange={(e) => handleSettingChange('requirePermission', e.target.checked)}
                />
                권한 확인 필요
              </label>
              <span className="setting-description">카메라/마이크 권한 확인 후 시작</span>
            </div>

            <div className="setting-item">
              <label>
                시작 지연 시간:
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="500"
                  value={autoStartSettings.settings.delay}
                  onChange={(e) => handleSettingChange('delay', parseInt(e.target.value))}
                />
                <span className="delay-value">{autoStartSettings.settings.delay}ms</span>
              </label>
              <span className="setting-description">자동 시작 전 대기 시간</span>
            </div>
          </div>

          {lastAutoStartResult && (
            <div className="result-section">
              <h5>마지막 실행 결과</h5>
              <div className={`result-item ${lastAutoStartResult.success ? 'success' : 'error'}`}>
                <span className="result-icon">
                  {lastAutoStartResult.success ? '✅' : '❌'}
                </span>
                <div className="result-details">
                  <div className="result-status">
                    {lastAutoStartResult.success ? '성공' : '실패'}
                  </div>
                  <div className="result-info">
                    {lastAutoStartResult.areaType} 영역 {lastAutoStartResult.areaId}
                  </div>
                  <div className="result-time">
                    {new Date(lastAutoStartResult.timestamp).toLocaleTimeString()}
                  </div>
                  {lastAutoStartResult.error && (
                    <div className="result-error">{lastAutoStartResult.error}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoAutoStartSettings;
