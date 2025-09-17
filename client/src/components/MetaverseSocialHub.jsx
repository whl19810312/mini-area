import React, { useState, useEffect } from 'react';
import './MetaverseSocialHub.css';

const MetaverseSocialHub = ({ 
  user, 
  currentLocation, 
  nearbyUsers, 
  metaverseActivity, 
  onActivityCreate, 
  onActivityInteraction,
  socket 
}) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [newActivity, setNewActivity] = useState({
    type: 'thought',
    content: '',
    location: null,
    visibility: 'public'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [virtualInventory, setVirtualInventory] = useState([]);

  // 활동 타입별 설정
  const activityTypes = {
    thought: { icon: '💭', name: '생각 공유', color: '#667eea' },
    location_visit: { icon: '📍', name: '위치 방문', color: '#f093fb' },
    achievement: { icon: '🏆', name: '성취 달성', color: '#ffd89b' },
    social_interaction: { icon: '🤝', name: '소셜 활동', color: '#a8edea' },
    item_discovery: { icon: '💎', name: '아이템 발견', color: '#ffecd2' },
    world_creation: { icon: '🌍', name: '공간 생성', color: '#ff9a9e' },
    live_event: { icon: '🎉', name: '라이브 이벤트', color: '#4facfe' }
  };

  // 가상 아이템 샘플
  const sampleInventory = [
    { id: 1, name: '크리스탈 검', type: 'weapon', rarity: 'epic', icon: '⚔️' },
    { id: 2, name: '마법의 모자', type: 'accessory', rarity: 'rare', icon: '🎩' },
    { id: 3, name: '날개 부츠', type: 'equipment', rarity: 'legendary', icon: '👢' },
    { id: 4, name: '신비한 포션', type: 'consumable', rarity: 'common', icon: '🧪' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('virtual_inventory');
    if (saved) {
      setVirtualInventory(JSON.parse(saved));
    } else {
      setVirtualInventory(sampleInventory);
      localStorage.setItem('virtual_inventory', JSON.stringify(sampleInventory));
    }
  }, []);

  const handleActivitySubmit = () => {
    if (!newActivity.content.trim()) return;

    const activityData = {
      ...newActivity,
      location: currentLocation,
      avatar: user?.avatar || '🧑‍💻',
      metaData: {
        worldId: currentLocation?.worldId || 'main',
        participantCount: nearbyUsers?.length || 0,
        nearbyUsers: nearbyUsers?.map(u => u.username) || []
      }
    };

    onActivityCreate(activityData);
    setNewActivity({ type: 'thought', content: '', location: null, visibility: 'public' });
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  const handleTeleportToLocation = (location) => {
    if (window.opener && window.opener.teleportToLocation) {
      window.opener.teleportToLocation(location.coords);
    }
  };

  const handlePrivateMessage = (username) => {
    if (socket) {
      socket.emit('private_message_request', { target: username, from: user?.username });
    }
  };

  return (
    <div className="metaverse-social-hub">
      {/* 상단 네비게이션 */}
      <div className="hub-navigation">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            🌊 라이브 피드
          </button>
          <button 
            className={`nav-tab ${activeTab === 'nearby' ? 'active' : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            📍 주변 유저 ({nearbyUsers?.length || 0})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'world' ? 'active' : ''}`}
            onClick={() => setActiveTab('world')}
          >
            🌍 월드 맵
          </button>
          <button 
            className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            💎 인벤토리
          </button>
        </div>

        {/* 현재 위치 표시 */}
        <div className="current-location">
          <span className="location-icon">📍</span>
          <span className="location-name">
            {currentLocation?.name || '메타버스 SNS'}
          </span>
          {currentLocation?.coords && (
            <span className="location-coords">
              ({Math.round(currentLocation.coords.x)}, {Math.round(currentLocation.coords.y)})
            </span>
          )}
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="hub-content">
        {/* 라이브 피드 탭 */}
        {activeTab === 'feed' && (
          <div className="feed-tab">
            {/* 새 활동 작성 */}
            <div className="activity-composer">
              <div className="composer-header">
                <div className="user-avatar">{user?.avatar || '🧑‍💻'}</div>
                <div className="composer-info">
                  <div className="username">{user?.username || '익명'}</div>
                  <select 
                    value={newActivity.type}
                    onChange={(e) => setNewActivity(prev => ({...prev, type: e.target.value}))}
                    className="activity-type-select"
                  >
                    {Object.entries(activityTypes).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                value={newActivity.content}
                onChange={(e) => setNewActivity(prev => ({...prev, content: e.target.value}))}
                placeholder="메타버스에서의 경험을 공유해보세요..."
                className="activity-textarea"
                rows="3"
              />
              <div className="composer-actions">
                <select 
                  value={newActivity.visibility}
                  onChange={(e) => setNewActivity(prev => ({...prev, visibility: e.target.value}))}
                  className="visibility-select"
                >
                  <option value="public">🌍 전체 공개</option>
                  <option value="nearby">📍 주변 유저만</option>
                  <option value="friends">👥 친구만</option>
                </select>
                <button 
                  onClick={handleActivitySubmit}
                  className="submit-btn"
                  disabled={!newActivity.content.trim()}
                >
                  공유하기
                </button>
              </div>
            </div>

            {/* 활동 피드 */}
            <div className="activity-feed">
              {metaverseActivity?.map(activity => (
                <div key={activity.id} className="activity-card">
                  <div className="activity-header">
                    <div className="activity-user">
                      <div className="user-avatar">{activity.avatar || '🧑‍💻'}</div>
                      <div className="user-info">
                        <div className="username">{activity.user}</div>
                        <div className="activity-meta">
                          <span className="activity-type">
                            {activityTypes[activity.type]?.icon} {activityTypes[activity.type]?.name}
                          </span>
                          <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    {activity.location && (
                      <button 
                        className="location-btn"
                        onClick={() => handleTeleportToLocation(activity.location)}
                        title="이 위치로 이동"
                      >
                        📍 {activity.location.name}
                      </button>
                    )}
                  </div>
                  
                  <div className="activity-content">
                    {activity.content}
                  </div>

                  {activity.metaData && (
                    <div className="activity-metadata">
                      {activity.metaData.participantCount > 0 && (
                        <span className="participant-count">
                          👥 {activity.metaData.participantCount}명과 함께
                        </span>
                      )}
                      {activity.metaData.achievement && (
                        <span className="achievement-badge">
                          🏆 {activity.metaData.achievement}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="activity-actions">
                    <button 
                      className="action-btn like-btn"
                      onClick={() => onActivityInteraction(activity.id, 'like')}
                    >
                      ❤️ {activity.interactions?.likes || 0}
                    </button>
                    <button 
                      className="action-btn comment-btn"
                      onClick={() => onActivityInteraction(activity.id, 'comment')}
                    >
                      💬 {activity.interactions?.comments || 0}
                    </button>
                    <button className="action-btn share-btn">
                      🔄 공유
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주변 유저 탭 */}
        {activeTab === 'nearby' && (
          <div className="nearby-tab">
            <div className="nearby-header">
              <h3>현재 위치의 다른 유저들</h3>
              <p>같은 공간에서 활동 중인 사용자들과 소통해보세요</p>
            </div>
            <div className="nearby-users">
              {nearbyUsers?.length > 0 ? nearbyUsers.map(nearbyUser => (
                <div key={nearbyUser.id} className="nearby-user-card">
                  <div className="user-avatar">{nearbyUser.avatar || '🧑‍💻'}</div>
                  <div className="user-details">
                    <div className="username">{nearbyUser.username}</div>
                    <div className="user-activity">{nearbyUser.currentActivity || '탐색 중'}</div>
                    <div className="distance">
                      거리: {Math.round(nearbyUser.distance || 0)}m
                    </div>
                  </div>
                  <div className="user-actions">
                    <button 
                      className="action-btn"
                      onClick={() => handlePrivateMessage(nearbyUser.username)}
                    >
                      💬 메시지
                    </button>
                    <button className="action-btn">
                      👥 친구 추가
                    </button>
                  </div>
                </div>
              )) : (
                <div className="no-nearby-users">
                  <div className="empty-icon">🏝️</div>
                  <p>현재 주변에 다른 사용자가 없습니다</p>
                  <p>다른 공간으로 이동해서 사람들을 만나보세요!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 월드 맵 탭 */}
        {activeTab === 'world' && (
          <div className="world-tab">
            <div className="world-header">
              <h3>메타버스 월드 맵</h3>
              <p>다양한 공간을 탐험하고 새로운 경험을 쌓아보세요</p>
            </div>
            <div className="world-map">
              {/* 실제 맵 구현 시 현재 메타버스의 맵 데이터를 사용 */}
              <div className="map-placeholder">
                <div className="map-icon">🗺️</div>
                <p>월드 맵 로딩 중...</p>
                <p>메타버스 공간의 전체 지도가 여기에 표시됩니다</p>
              </div>
            </div>
          </div>
        )}

        {/* 인벤토리 탭 */}
        {activeTab === 'inventory' && (
          <div className="inventory-tab">
            <div className="inventory-header">
              <h3>가상 인벤토리</h3>
              <p>수집한 아이템들과 NFT를 관리하세요</p>
            </div>
            <div className="inventory-grid">
              {virtualInventory.map(item => (
                <div key={item.id} className={`inventory-item ${item.rarity}`}>
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-type">{item.type}</div>
                  <div className={`item-rarity ${item.rarity}`}>
                    {item.rarity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaverseSocialHub;