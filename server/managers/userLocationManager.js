class UserLocationManager {
  constructor() {
    this.userLocations = new Map(); // userId -> locationInfo
    this.locationUsers = new Map(); // locationId -> Set<userId>
    this.channelLocations = new Map(); // channelName -> locationInfo
    this.locationChannels = new Map(); // locationId -> channelName
    this.locationHistory = new Map(); // userId -> locationHistory[]
    
    this.locationTypes = {
      LOBBY: 'lobby',
      VIRTUAL_SPACE: 'virtual_space',
      AREA: 'area',
      CHANNEL: 'channel'
    };
  }

  // 사용자 위치 설정
  setUserLocation(userId, locationInfo) {
    const {
      type,
      spaceId = null,
      spaceName = null,
      areaId = null,
      areaName = null,
      areaType = null,
      channelId = null,
      channelName = null,
      x = 0,
      y = 0
    } = locationInfo;

    // 이전 위치에서 제거
    this.removeUserFromLocation(userId);

    // 위치 ID 생성
    const locationId = this.generateLocationId(type, spaceId, areaId, channelId);

    // 새 위치 정보
    const newLocation = {
      userId,
      locationId,
      type,
      spaceId,
      spaceName,
      areaId,
      areaName,
      areaType,
      channelId,
      channelName,
      x,
      y,
      enteredAt: new Date(),
      lastActivity: new Date()
    };

    // 사용자 위치 저장
    this.userLocations.set(userId, newLocation);

    // 위치별 사용자 목록에 추가
    if (!this.locationUsers.has(locationId)) {
      this.locationUsers.set(locationId, new Set());
    }
    this.locationUsers.get(locationId).add(userId);

    // 위치 히스토리에 추가
    this.addToLocationHistory(userId, newLocation);

    // 채널 위치 매핑 (채널인 경우)
    if (type === this.locationTypes.CHANNEL && channelName) {
      this.channelLocations.set(channelName, newLocation);
      this.locationChannels.set(locationId, channelName);
    }

    console.log(`📍 사용자 위치 설정: ${userId} → ${type} (${locationId})`);
    return newLocation;
  }

  // 사용자 위치 가져오기
  getUserLocation(userId) {
    return this.userLocations.get(userId);
  }

  // 위치별 사용자 목록 가져오기
  getUsersAtLocation(locationId) {
    const userIds = this.locationUsers.get(locationId);
    return userIds ? Array.from(userIds) : [];
  }

  // 사용자 위치에서 제거
  removeUserFromLocation(userId) {
    const currentLocation = this.userLocations.get(userId);
    if (!currentLocation) return;

    const locationId = currentLocation.locationId;
    
    // 위치별 사용자 목록에서 제거
    const usersAtLocation = this.locationUsers.get(locationId);
    if (usersAtLocation) {
      usersAtLocation.delete(userId);
      if (usersAtLocation.size === 0) {
        this.locationUsers.delete(locationId);
      }
    }

    // 채널 위치 매핑에서 제거 (채널인 경우)
    if (currentLocation.type === this.locationTypes.CHANNEL) {
      this.locationChannels.delete(locationId);
    }

    console.log(`📍 사용자 위치 제거: ${userId} ← ${currentLocation.type} (${locationId})`);
  }

  // 사용자 위치 이동
  moveUserToLocation(userId, newLocationInfo) {
    const currentLocation = this.getUserLocation(userId);
    if (currentLocation) {
      // 이전 위치 정보 저장
      currentLocation.leftAt = new Date();
      currentLocation.duration = currentLocation.leftAt.getTime() - currentLocation.enteredAt.getTime();
    }

    // 새 위치로 이동
    return this.setUserLocation(userId, newLocationInfo);
  }

  // 사용자 위치 업데이트 (좌표 등)
  updateUserLocation(userId, updates) {
    const location = this.userLocations.get(userId);
    if (!location) return null;

    Object.assign(location, updates, { lastActivity: new Date() });
    return location;
  }

  // 위치 ID 생성
  generateLocationId(type, spaceId, areaId, channelId) {
    switch (type) {
      case this.locationTypes.LOBBY:
        return 'lobby';
      case this.locationTypes.VIRTUAL_SPACE:
        return `space_${spaceId}`;
      case this.locationTypes.AREA:
        return `area_${spaceId}_${areaId}`;
      case this.locationTypes.CHANNEL:
        return `channel_${spaceId}_${areaId}_${channelId}`;
      default:
        return `unknown_${Date.now()}`;
    }
  }

  // 채널 이름 생성
  generateChannelName(spaceName, areaType, areaId, channelId) {
    return `${spaceName}_${areaType}_${areaId}_${channelId}`;
  }

  // 사용자 현재 채널 가져오기
  getUserCurrentChannel(userId) {
    const location = this.getUserLocation(userId);
    if (location && location.type === this.locationTypes.CHANNEL) {
      return location.channelName;
    }
    return null;
  }

  // 채널의 모든 사용자 가져오기
  getChannelUsers(channelName) {
    const location = this.channelLocations.get(channelName);
    if (!location) return [];

    const locationId = location.locationId;
    return this.getUsersAtLocation(locationId);
  }

  // 영역의 모든 채널 가져오기
  getAreaChannels(spaceId, areaId) {
    const channels = [];
    for (const [channelName, location] of this.channelLocations.entries()) {
      if (location.spaceId === spaceId && location.areaId === areaId) {
        channels.push({
          channelName,
          channelId: location.channelId,
          userCount: this.getUsersAtLocation(location.locationId).length,
          location: location
        });
      }
    }
    return channels;
  }

  // 가상공간의 모든 영역 가져오기
  getSpaceAreas(spaceId) {
    const areas = new Map();
    for (const location of this.userLocations.values()) {
      if (location.spaceId === spaceId && location.type === this.locationTypes.AREA) {
        if (!areas.has(location.areaId)) {
          areas.set(location.areaId, {
            areaId: location.areaId,
            areaName: location.areaName,
            areaType: location.areaType,
            userCount: this.getUsersAtLocation(location.locationId).length,
            channels: this.getAreaChannels(spaceId, location.areaId)
          });
        }
      }
    }
    return Array.from(areas.values());
  }

  // 위치 히스토리에 추가
  addToLocationHistory(userId, location) {
    if (!this.locationHistory.has(userId)) {
      this.locationHistory.set(userId, []);
    }

    const history = this.locationHistory.get(userId);
    history.push({
      ...location,
      timestamp: new Date()
    });

    // 히스토리 크기 제한 (최근 50개만 유지)
    if (history.length > 50) {
      this.locationHistory.set(userId, history.slice(-50));
    }
  }

  // 사용자 위치 히스토리 가져오기
  getUserLocationHistory(userId, limit = 20) {
    const history = this.locationHistory.get(userId) || [];
    return history.slice(-limit);
  }

  // 사용자 활동 업데이트
  updateUserActivity(userId) {
    const location = this.userLocations.get(userId);
    if (location) {
      location.lastActivity = new Date();
    }
  }

  // 비활성 사용자 정리 (마지막 활동 후 30분 이상)
  cleanupInactiveUsers() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30분

    for (const [userId, location] of this.userLocations.entries()) {
      const timeSinceActivity = now.getTime() - location.lastActivity.getTime();
      if (timeSinceActivity > inactiveThreshold) {
        console.log(`🧹 비활성 사용자 정리: ${userId} (${timeSinceActivity / 1000 / 60}분 비활성)`);
        this.removeUserFromLocation(userId);
        this.userLocations.delete(userId);
      }
    }
  }

  // 사용자 제거
  removeUser(userId) {
    this.removeUserFromLocation(userId);
    this.userLocations.delete(userId);
    this.locationHistory.delete(userId);
  }

  // 모든 데이터 정리
  clear() {
    this.userLocations.clear();
    this.locationUsers.clear();
    this.channelLocations.clear();
    this.locationChannels.clear();
    this.locationHistory.clear();
    console.log('🧹 사용자 위치 관리자 데이터 정리 완료');
  }

  // 디버그 정보 가져오기
  getDebugInfo() {
    return {
      userLocations: this.userLocations.size,
      locationUsers: this.locationUsers.size,
      channelLocations: this.channelLocations.size,
      locationChannels: this.locationChannels.size,
      locationHistory: this.locationHistory.size
    };
  }

  // 통계 정보 가져오기
  getStatistics() {
    const stats = {
      totalUsers: this.userLocations.size,
      usersInLobby: 0,
      usersInVirtualSpaces: 0,
      usersInAreas: 0,
      usersInChannels: 0,
      totalLocations: this.locationUsers.size,
      totalChannels: this.channelLocations.size
    };

    for (const location of this.userLocations.values()) {
      switch (location.type) {
        case this.locationTypes.LOBBY:
          stats.usersInLobby++;
          break;
        case this.locationTypes.VIRTUAL_SPACE:
          stats.usersInVirtualSpaces++;
          break;
        case this.locationTypes.AREA:
          stats.usersInAreas++;
          break;
        case this.locationTypes.CHANNEL:
          stats.usersInChannels++;
          break;
      }
    }

    return stats;
  }
}

module.exports = UserLocationManager;
