const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');

class LoginUserManager {
  constructor() {
    this.activeSessions = new Map(); // sessionId -> userInfo
    this.userSessions = new Map();   // userId -> Set of sessionIds
    this.sessionTokens = new Map();  // token -> sessionId
    this.loginHistory = [];          // 로그인 히스토리
    this.maxSessionsPerUser = 3;     // 사용자당 최대 세션 수
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24시간 (ms)
    
    // 세션 정리 타이머
    this.startSessionCleanup();
  }

  // 사용자 로그인 처리
  async loginUser(email, password, clientInfo = {}) {
    try {
      // 사용자 조회
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      // 이메일 인증 확인
      if (!user.isEmailVerified) {
        throw new Error('이메일 인증이 필요합니다.');
      }

      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('비밀번호가 올바르지 않습니다.');
      }

      // 기존 세션 확인 및 정리
      await this.cleanupUserSessions(user.id);

      // 새 세션 생성
      const sessionId = this.generateSessionId();
      const token = this.generateToken(user.id);
      
      const sessionInfo = {
        sessionId,
        userId: user.id,
        email: user.email,
        username: user.username,
        loginTime: new Date(),
        lastActivity: new Date(),
        clientInfo: {
          ip: clientInfo.ip || 'unknown',
          userAgent: clientInfo.userAgent || 'unknown',
          device: clientInfo.device || 'unknown'
        },
        isActive: true
      };

      // 세션 저장
      this.activeSessions.set(sessionId, sessionInfo);
      this.sessionTokens.set(token, sessionId);
      
      if (!this.userSessions.has(user.id)) {
        this.userSessions.set(user.id, new Set());
      }
      this.userSessions.get(user.id).add(sessionId);

      // 로그인 히스토리 기록
      this.recordLoginHistory(user.id, sessionInfo);

      // 사용자 정보 업데이트
      await this.updateUserLoginInfo(user.id, sessionInfo);

      console.log(`✅ 사용자 로그인 성공: ${user.email} (세션: ${sessionId})`);

      return {
        success: true,
        token,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified
        },
        sessionInfo
      };

    } catch (error) {
      console.error('❌ 로그인 실패:', error.message);
      throw error;
    }
  }

  // 사용자 로그아웃 처리
  async logoutUser(token, sessionId = null) {
    try {
      let targetSessionId = sessionId;
      
      if (!targetSessionId && token) {
        targetSessionId = this.sessionTokens.get(token);
      }

      if (!targetSessionId) {
        throw new Error('유효하지 않은 세션입니다.');
      }

      const sessionInfo = this.activeSessions.get(targetSessionId);
      if (!sessionInfo) {
        throw new Error('세션을 찾을 수 없습니다.');
      }

      // 세션 정리
      this.removeSession(targetSessionId);
      
      // 사용자 정보 업데이트
      await this.updateUserLogoutInfo(sessionInfo.userId);

      console.log(`✅ 사용자 로그아웃 성공: ${sessionInfo.email} (세션: ${targetSessionId})`);

      return { success: true };

    } catch (error) {
      console.error('❌ 로그아웃 실패:', error.message);
      throw error;
    }
  }

  // 토큰 검증
  async verifyToken(token) {
    try {
      if (!token) {
        throw new Error('토큰이 제공되지 않았습니다.');
      }

      const sessionId = this.sessionTokens.get(token);
      if (!sessionId) {
        throw new Error('유효하지 않은 토큰입니다.');
      }

      const sessionInfo = this.activeSessions.get(sessionId);
      if (!sessionInfo || !sessionInfo.isActive) {
        throw new Error('세션이 만료되었습니다.');
      }

      // 세션 타임아웃 확인
      if (Date.now() - sessionInfo.lastActivity.getTime() > this.sessionTimeout) {
        this.removeSession(sessionId);
        throw new Error('세션이 만료되었습니다.');
      }

      // 마지막 활동 시간 업데이트
      sessionInfo.lastActivity = new Date();

      return {
        valid: true,
        sessionInfo,
        user: {
          id: sessionInfo.userId,
          email: sessionInfo.email,
          username: sessionInfo.username
        }
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // 사용자 세션 정리
  async cleanupUserSessions(userId) {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) return;

    const sessionsToRemove = [];
    
    for (const sessionId of userSessions) {
      const sessionInfo = this.activeSessions.get(sessionId);
      if (sessionInfo) {
        sessionsToRemove.push(sessionId);
      }
    }

    // 세션 수 제한 확인
    if (sessionsToRemove.length >= this.maxSessionsPerUser) {
      // 가장 오래된 세션부터 제거
      const sortedSessions = sessionsToRemove
        .map(sessionId => ({
          sessionId,
          loginTime: this.activeSessions.get(sessionId).loginTime
        }))
        .sort((a, b) => a.loginTime - b.loginTime);

      const sessionsToKeep = sortedSessions.slice(-(this.maxSessionsPerUser - 1));
      const sessionsToRemove = sortedSessions
        .slice(0, sortedSessions.length - sessionsToKeep.length)
        .map(s => s.sessionId);

      sessionsToRemove.forEach(sessionId => {
        this.removeSession(sessionId);
      });
    }
  }

  // 세션 제거
  removeSession(sessionId) {
    const sessionInfo = this.activeSessions.get(sessionId);
    if (!sessionInfo) return;

    // 토큰 제거
    for (const [token, sid] of this.sessionTokens.entries()) {
      if (sid === sessionId) {
        this.sessionTokens.delete(token);
        break;
      }
    }

    // 사용자 세션에서 제거
    const userSessions = this.userSessions.get(sessionInfo.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(sessionInfo.userId);
      }
    }

    // 활성 세션에서 제거
    this.activeSessions.delete(sessionId);
  }

  // 사용자 로그인 정보 업데이트
  async updateUserLoginInfo(userId, sessionInfo) {
    try {
      await User.update({
        lastLoginAt: new Date(),
        lastLoginIp: sessionInfo.clientInfo.ip,
        loginCount: require('sequelize').literal('login_count + 1')
      }, {
        where: { id: userId }
      });
    } catch (error) {
      console.error('사용자 로그인 정보 업데이트 실패:', error);
    }
  }

  // 사용자 로그아웃 정보 업데이트
  async updateUserLogoutInfo(userId) {
    try {
      await User.update({
        lastLogoutAt: new Date()
      }, {
        where: { id: userId }
      });
    } catch (error) {
      console.error('사용자 로그아웃 정보 업데이트 실패:', error);
    }
  }

  // 로그인 히스토리 기록
  recordLoginHistory(userId, sessionInfo) {
    const historyEntry = {
      userId,
      sessionId: sessionInfo.sessionId,
      loginTime: sessionInfo.loginTime,
      clientInfo: sessionInfo.clientInfo,
      timestamp: new Date()
    };

    this.loginHistory.push(historyEntry);

    // 히스토리 크기 제한 (최근 1000개만 유지)
    if (this.loginHistory.length > 1000) {
      this.loginHistory = this.loginHistory.slice(-1000);
    }
  }

  // 세션 정리 타이머 시작
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 5분마다 실행
  }

  // 만료된 세션 정리
  cleanupExpiredSessions() {
    const now = Date.now();
    const sessionsToRemove = [];

    for (const [sessionId, sessionInfo] of this.activeSessions.entries()) {
      if (now - sessionInfo.lastActivity.getTime() > this.sessionTimeout) {
        sessionsToRemove.push(sessionId);
      }
    }

    sessionsToRemove.forEach(sessionId => {
      console.log(`🕐 세션 만료 정리: ${sessionId}`);
      this.removeSession(sessionId);
    });

    if (sessionsToRemove.length > 0) {
      console.log(`🧹 ${sessionsToRemove.length}개의 만료된 세션 정리 완료`);
    }
  }

  // 세션 ID 생성
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // JWT 토큰 생성
  generateToken(userId) {
    return jwt.sign(
      { userId, timestamp: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // 사용자 세션 정보 가져오기
  getUserSessions(userId) {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) return [];

    return Array.from(userSessions)
      .map(sessionId => this.activeSessions.get(sessionId))
      .filter(session => session && session.isActive);
  }

  // 활성 세션 수 가져오기
  getActiveSessionCount() {
    return this.activeSessions.size;
  }

  // 사용자별 세션 수 가져오기
  getUserSessionCount(userId) {
    const userSessions = this.userSessions.get(userId);
    return userSessions ? userSessions.size : 0;
  }

  // 로그인 히스토리 가져오기
  getLoginHistory(userId = null, limit = 100) {
    let history = this.loginHistory;
    
    if (userId) {
      history = history.filter(entry => entry.userId === userId);
    }
    
    return history.slice(-limit);
  }

  // 사용자 통계 가져오기
  getUserStats(userId) {
    const userSessions = this.getUserSessions(userId);
    const loginHistory = this.getLoginHistory(userId);
    
    return {
      activeSessions: userSessions.length,
      totalLogins: loginHistory.length,
      lastLogin: loginHistory.length > 0 ? loginHistory[loginHistory.length - 1].loginTime : null,
      sessionLimit: this.maxSessionsPerUser
    };
  }

  // 전체 통계 가져오기
  getOverallStats() {
    return {
      totalActiveSessions: this.activeSessions.size,
      totalUsers: this.userSessions.size,
      totalTokens: this.sessionTokens.size,
      loginHistorySize: this.loginHistory.length,
      sessionTimeout: this.sessionTimeout,
      maxSessionsPerUser: this.maxSessionsPerUser
    };
  }

  // 모든 세션 정보 가져오기 (관리자용)
  getAllSessions() {
    return Array.from(this.activeSessions.values());
  }

  // 특정 세션 강제 종료
  forceLogoutSession(sessionId) {
    const sessionInfo = this.activeSessions.get(sessionId);
    if (!sessionInfo) {
      throw new Error('세션을 찾을 수 없습니다.');
    }

    this.removeSession(sessionId);
    console.log(`🛑 세션 강제 종료: ${sessionId} (사용자: ${sessionInfo.email})`);
    
    return { success: true };
  }

  // 사용자 모든 세션 강제 종료
  forceLogoutUser(userId) {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      throw new Error('사용자의 활성 세션이 없습니다.');
    }

    const sessionIds = Array.from(userSessions);
    sessionIds.forEach(sessionId => {
      this.removeSession(sessionId);
    });

    console.log(`🛑 사용자 모든 세션 강제 종료: ${userId} (${sessionIds.length}개 세션)`);
    
    return { success: true, terminatedSessions: sessionIds.length };
  }

  // 설정 업데이트
  updateSettings(settings) {
    if (settings.maxSessionsPerUser !== undefined) {
      this.maxSessionsPerUser = settings.maxSessionsPerUser;
    }
    if (settings.sessionTimeout !== undefined) {
      this.sessionTimeout = settings.sessionTimeout;
    }
    
    console.log('✅ 로그인 사용자 관리자 설정 업데이트:', settings);
  }

  // 모든 데이터 정리
  clear() {
    this.activeSessions.clear();
    this.userSessions.clear();
    this.sessionTokens.clear();
    this.loginHistory = [];
    console.log('🧹 로그인 사용자 관리자 데이터 정리 완료');
  }
}

module.exports = LoginUserManager;

