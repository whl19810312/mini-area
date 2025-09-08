const { User } = require('../models/User');
const { Character } = require('../models/Character');
const MapModel = require('../models/Map');
const bcrypt = require('bcryptjs');

class UserInfoManager {
  constructor() {
    this.userProfiles = new Map(); // userId -> userProfile
    this.userPreferences = new Map(); // userId -> preferences
    this.userActivity = new Map(); // userId -> activityData
    this.userRelationships = new Map(); // userId -> Set of relatedUserIds
    this.userStatistics = new Map(); // userId -> statistics
    this.globalStatistics = {
      totalUsers: 0,
      activeUsers: 0,
      totalCharacters: 0,
      totalMaps: 0,
      lastUpdated: new Date()
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 사용자 프로필 초기화
  async initializeUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          { model: Character, as: 'characters' },
          { model: MapModel, as: 'maps' }
        ]
      });

      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const profile = {
        userId: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        lastLogoutAt: user.lastLogoutAt,
        loginCount: user.loginCount || 0,
        lastLoginIp: user.lastLoginIp,
        characters: user.characters || [],
        maps: user.maps || [],
        profile: {
          avatar: user.avatar || null,
          bio: user.bio || '',
          location: user.location || '',
          website: user.website || '',
          socialLinks: user.socialLinks || {}
        },
        preferences: {
          theme: 'dark',
          language: 'ko',
          notifications: {
            email: true,
            push: true,
            sound: true
          },
          privacy: {
            profileVisibility: 'public',
            showOnlineStatus: true,
            allowFriendRequests: true
          },
          autoStartVideo: {
            enabled: true,
            privateAreas: true,
            publicAreas: false,
            lobby: false
          }
        },
        activity: {
          lastSeen: new Date(),
          totalPlayTime: 0,
          favoriteMaps: [],
          recentMaps: [],
          achievements: []
        },
        statistics: {
          totalPlayTime: 0,
          mapsCreated: user.maps?.length || 0,
          charactersCreated: user.characters?.length || 0,
          friendsCount: 0,
          visitCount: 0
        }
      };

      this.userProfiles.set(userId, profile);
      this.userPreferences.set(userId, profile.preferences);
      this.userActivity.set(userId, profile.activity);
      this.userStatistics.set(userId, profile.statistics);

      console.log(`✅ 사용자 프로필 초기화 완료: ${user.username}`);
      return profile;

    } catch (error) {
      console.error('❌ 사용자 프로필 초기화 실패:', error);
      throw error;
    }
  }

  // 사용자 프로필 업데이트
  async updateUserProfile(userId, profileData) {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }

      // 프로필 데이터 업데이트
      if (profileData.username) {
        profile.username = profileData.username;
      }
      if (profileData.bio !== undefined) {
        profile.profile.bio = profileData.bio;
      }
      if (profileData.location !== undefined) {
        profile.profile.location = profileData.location;
      }
      if (profileData.website !== undefined) {
        profile.profile.website = profileData.website;
      }
      if (profileData.socialLinks) {
        profile.profile.socialLinks = { ...profile.profile.socialLinks, ...profileData.socialLinks };
      }
      if (profileData.avatar !== undefined) {
        profile.profile.avatar = profileData.avatar;
      }

      // 데이터베이스 업데이트
      await User.update({
        username: profile.username,
        bio: profile.profile.bio,
        location: profile.profile.location,
        website: profile.profile.website,
        socialLinks: profile.profile.socialLinks,
        avatar: profile.profile.avatar
      }, {
        where: { id: userId }
      });

      this.userProfiles.set(userId, profile);
      console.log(`✅ 사용자 프로필 업데이트 완료: ${profile.username}`);

      return profile;

    } catch (error) {
      console.error('❌ 사용자 프로필 업데이트 실패:', error);
      throw error;
    }
  }

  // 사용자 설정 업데이트
  updateUserPreferences(userId, preferences) {
    try {
      const userPrefs = this.userPreferences.get(userId);
      if (!userPrefs) {
        throw new Error('사용자 설정을 찾을 수 없습니다.');
      }

      // 설정 병합
      const updatedPrefs = this.mergePreferences(userPrefs, preferences);
      this.userPreferences.set(userId, updatedPrefs);

      // 프로필도 업데이트
      const profile = this.userProfiles.get(userId);
      if (profile) {
        profile.preferences = updatedPrefs;
        this.userProfiles.set(userId, profile);
      }

      console.log(`✅ 사용자 설정 업데이트 완료: ${userId}`);
      return updatedPrefs;

    } catch (error) {
      console.error('❌ 사용자 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // 사용자 활동 업데이트
  updateUserActivity(userId, activityData) {
    try {
      const activity = this.userActivity.get(userId);
      if (!activity) {
        throw new Error('사용자 활동 데이터를 찾을 수 없습니다.');
      }

      // 활동 데이터 업데이트
      if (activityData.lastSeen) {
        activity.lastSeen = activityData.lastSeen;
      }
      if (activityData.totalPlayTime !== undefined) {
        activity.totalPlayTime += activityData.totalPlayTime;
      }
      if (activityData.favoriteMaps) {
        activity.favoriteMaps = activityData.favoriteMaps;
      }
      if (activityData.recentMaps) {
        activity.recentMaps = activityData.recentMaps;
      }
      if (activityData.achievements) {
        activity.achievements = [...activity.achievements, ...activityData.achievements];
      }

      this.userActivity.set(userId, activity);

      // 프로필도 업데이트
      const profile = this.userProfiles.get(userId);
      if (profile) {
        profile.activity = activity;
        this.userProfiles.set(userId, profile);
      }

      console.log(`✅ 사용자 활동 업데이트 완료: ${userId}`);

    } catch (error) {
      console.error('❌ 사용자 활동 업데이트 실패:', error);
      throw error;
    }
  }

  // 사용자 통계 업데이트
  updateUserStatistics(userId, statisticsData) {
    try {
      const statistics = this.userStatistics.get(userId);
      if (!statistics) {
        throw new Error('사용자 통계를 찾을 수 없습니다.');
      }

      // 통계 데이터 업데이트
      if (statisticsData.totalPlayTime !== undefined) {
        statistics.totalPlayTime = statisticsData.totalPlayTime;
      }
      if (statisticsData.mapsCreated !== undefined) {
        statistics.mapsCreated = statisticsData.mapsCreated;
      }
      if (statisticsData.charactersCreated !== undefined) {
        statistics.charactersCreated = statisticsData.charactersCreated;
      }
      if (statisticsData.friendsCount !== undefined) {
        statistics.friendsCount = statisticsData.friendsCount;
      }
      if (statisticsData.visitCount !== undefined) {
        statistics.visitCount = statisticsData.visitCount;
      }

      this.userStatistics.set(userId, statistics);

      // 프로필도 업데이트
      const profile = this.userProfiles.get(userId);
      if (profile) {
        profile.statistics = statistics;
        this.userProfiles.set(userId, profile);
      }

      console.log(`✅ 사용자 통계 업데이트 완료: ${userId}`);

    } catch (error) {
      console.error('❌ 사용자 통계 업데이트 실패:', error);
      throw error;
    }
  }

  // 사용자 관계 관리
  addUserRelationship(userId, relatedUserId, relationshipType = 'friend') {
    try {
      if (!this.userRelationships.has(userId)) {
        this.userRelationships.set(userId, new Map());
      }

      const relationships = this.userRelationships.get(userId);
      relationships.set(relatedUserId, {
        type: relationshipType,
        addedAt: new Date(),
        isActive: true
      });

      console.log(`✅ 사용자 관계 추가: ${userId} -> ${relatedUserId} (${relationshipType})`);

    } catch (error) {
      console.error('❌ 사용자 관계 추가 실패:', error);
      throw error;
    }
  }

  removeUserRelationship(userId, relatedUserId) {
    try {
      const relationships = this.userRelationships.get(userId);
      if (relationships) {
        relationships.delete(relatedUserId);
        console.log(`✅ 사용자 관계 제거: ${userId} -> ${relatedUserId}`);
      }

    } catch (error) {
      console.error('❌ 사용자 관계 제거 실패:', error);
      throw error;
    }
  }

  // 사용자 프로필 가져오기
  getUserProfile(userId) {
    return this.userProfiles.get(userId);
  }

  // 사용자 설정 가져오기
  getUserPreferences(userId) {
    return this.userPreferences.get(userId);
  }

  // 사용자 활동 가져오기
  getUserActivity(userId) {
    return this.userActivity.get(userId);
  }

  // 사용자 통계 가져오기
  getUserStatistics(userId) {
    return this.userStatistics.get(userId);
  }

  // 사용자 관계 가져오기
  getUserRelationships(userId) {
    const relationships = this.userRelationships.get(userId);
    return relationships ? Array.from(relationships.entries()) : [];
  }

  // 모든 사용자 프로필 가져오기
  getAllUserProfiles() {
    return Array.from(this.userProfiles.values());
  }

  // 사용자 검색
  searchUsers(query, limit = 20) {
    const results = [];
    const searchTerm = query.toLowerCase();

    for (const profile of this.userProfiles.values()) {
      if (profile.username.toLowerCase().includes(searchTerm) ||
          profile.email.toLowerCase().includes(searchTerm) ||
          (profile.profile.bio && profile.profile.bio.toLowerCase().includes(searchTerm))) {
        results.push(profile);
        
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  // 사용자 통계 생성
  async generateUserStatistics(userId) {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }

      const statistics = {
        totalPlayTime: profile.activity.totalPlayTime,
        mapsCreated: profile.maps.length,
        charactersCreated: profile.characters.length,
        friendsCount: this.getUserRelationships(userId).length,
        visitCount: profile.loginCount || 0,
        lastActive: profile.activity.lastSeen,
        achievements: profile.activity.achievements.length
      };

      this.updateUserStatistics(userId, statistics);
      return statistics;

    } catch (error) {
      console.error('❌ 사용자 통계 생성 실패:', error);
      throw error;
    }
  }

  // 전체 통계 업데이트
  async updateGlobalStatistics() {
    try {
      const totalUsers = this.userProfiles.size;
      const activeUsers = Array.from(this.userActivity.values())
        .filter(activity => Date.now() - activity.lastSeen.getTime() < 24 * 60 * 60 * 1000).length;

      let totalCharacters = 0;
      let totalMaps = 0;

      for (const profile of this.userProfiles.values()) {
        totalCharacters += profile.characters.length;
        totalMaps += profile.maps.length;
      }

      this.globalStatistics = {
        totalUsers,
        activeUsers,
        totalCharacters,
        totalMaps,
        lastUpdated: new Date()
      };

      console.log('✅ 전체 통계 업데이트 완료');

    } catch (error) {
      console.error('❌ 전체 통계 업데이트 실패:', error);
    }
  }

  // 통계 업데이트 타이머 시작
  startStatisticsUpdate() {
    setInterval(() => {
      this.updateGlobalStatistics();
    }, 10 * 60 * 1000); // 10분마다 실행
  }

  // 설정 병합 헬퍼
  mergePreferences(current, updates) {
    const merged = JSON.parse(JSON.stringify(current));
    
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergePreferences(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  // 사용자 제거
  removeUser(userId) {
    this.userProfiles.delete(userId);
    this.userPreferences.delete(userId);
    this.userActivity.delete(userId);
    this.userStatistics.delete(userId);
    this.userRelationships.delete(userId);
    
    console.log(`✅ 사용자 정보 제거 완료: ${userId}`);
  }

  // 모든 데이터 정리
  clear() {
    this.userProfiles.clear();
    this.userPreferences.clear();
    this.userActivity.clear();
    this.userStatistics.clear();
    this.userRelationships.clear();
    this.globalStatistics = {
      totalUsers: 0,
      activeUsers: 0,
      totalCharacters: 0,
      totalMaps: 0,
      lastUpdated: new Date()
    };
    
    console.log('🧹 사용자 정보 관리자 데이터 정리 완료');
  }

  // 전체 통계 가져오기
  getGlobalStatistics() {
    return { ...this.globalStatistics };
  }

  // 사용자 요약 정보 가져오기
  getUserSummary(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    return {
      userId: profile.userId,
      username: profile.username,
      email: profile.email,
      isEmailVerified: profile.isEmailVerified,
      lastSeen: profile.activity.lastSeen,
      statistics: profile.statistics,
      preferences: {
        theme: profile.preferences.theme,
        privacy: profile.preferences.privacy.profileVisibility
      }
    };
  }
}

module.exports = UserInfoManager;

