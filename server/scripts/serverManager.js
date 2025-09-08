#!/usr/bin/env node

const MiniAreaServer = require('../app');
const { getConfig, getServerIP } = require('../config/serverConfig');

class ServerManager {
  constructor() {
    this.server = null;
    this.command = process.argv[2];
    this.options = this.parseOptions();
  }

  // 명령행 옵션 파싱
  parseOptions() {
    const options = {};
    const args = process.argv.slice(3);
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          options[key] = value;
          i++;
        } else {
          options[key] = true;
        }
      }
    }
    
    return options;
  }

  // 서버 시작
  async start() {
    try {
      console.log('🚀 Mini Area Metaverse 서버 시작 중...');
      
      this.server = new MiniAreaServer();
      await this.server.start();
      
      console.log('✅ 서버가 성공적으로 시작되었습니다.');
      
      // 상태 모니터링 (옵션)
      if (this.options.monitor) {
        this.startMonitoring();
      }
      
    } catch (error) {
      console.error('❌ 서버 시작 실패:', error);
      process.exit(1);
    }
  }

  // 서버 중지
  async stop() {
    try {
      console.log('🛑 서버 중지 중...');
      
      if (this.server) {
        await this.server.stop();
      }
      
      console.log('✅ 서버가 성공적으로 중지되었습니다.');
      process.exit(0);
    } catch (error) {
      console.error('❌ 서버 중지 실패:', error);
      process.exit(1);
    }
  }

  // 서버 재시작
  async restart() {
    try {
      console.log('🔄 서버 재시작 중...');
      
      if (this.server) {
        await this.server.stop();
      }
      
      await this.start();
      
    } catch (error) {
      console.error('❌ 서버 재시작 실패:', error);
      process.exit(1);
    }
  }

  // 서버 상태 확인
  async status() {
    try {
      if (!this.server) {
        this.server = new MiniAreaServer();
      }
      
      const status = this.server.getServerStatus();
      const stats = await this.server.getServerStats();
      
      console.log('\n📊 Mini Area Metaverse 서버 상태');
      console.log('=====================================');
      console.log(`상태: ${status.isRunning ? '🟢 실행 중' : '🔴 중지됨'}`);
      
      // 서버 시작 관리자 상태
      if (status.startup) {
        const startup = status.startup;
        console.log(`업타임: ${startup.uptime || 'N/A'}`);
        console.log(`메모리 사용량: ${startup.memoryUsage ? JSON.stringify(startup.memoryUsage) : 'N/A'}`);
        console.log(`시작 로그: ${startup.startupLog ? startup.startupLog.length : 0}개 항목`);
      }
      
      // 사용자 관리자 상태
      if (status.user) {
        const user = status.user;
        console.log('\n👥 사용자 관리 상태');
        console.log('-'.repeat(30));
        
        if (user.loginManager) {
          console.log('🔐 로그인 관리:');
          console.log(`   활성 세션: ${user.loginManager.activeSessions}`);
          console.log(`   사용자 세션: ${user.loginManager.userSessions}`);
          console.log(`   세션 토큰: ${user.loginManager.sessionTokens}`);
          console.log(`   로그인 히스토리: ${user.loginManager.loginHistory}`);
        }
        
        if (user.infoManager) {
          console.log('📋 사용자 정보:');
          console.log(`   사용자 프로필: ${user.infoManager.userProfiles}`);
          console.log(`   사용자 설정: ${user.infoManager.userPreferences}`);
          console.log(`   사용자 활동: ${user.infoManager.userActivity}`);
          console.log(`   사용자 통계: ${user.infoManager.userStatistics}`);
          console.log(`   사용자 관계: ${user.infoManager.userRelationships}`);
        }
        
        if (user.socketManager) {
          console.log('📡 WebSocket 연결:');
          console.log(`   사용자 소켓: ${user.socketManager.userSockets}`);
          console.log(`   소켓 사용자: ${user.socketManager.socketUsers}`);
        }
        
        if (user.flowManager) {
          console.log('🔄 플로우 관리:');
          console.log(`   플로우 매니저:`);
          console.log(`     총 사용자: ${user.flowManager.flowManager.totalUsers}`);
          console.log(`     활성 사용자: ${user.flowManager.flowManager.activeUsers}`);
          console.log(`     플로우 히스토리: ${user.flowManager.flowManager.flowHistory}`);
          console.log(`   채널 매니저:`);
          console.log(`     비디오 채널: ${user.flowManager.channelManager.videoChannels}`);
          console.log(`     채팅 채널: ${user.flowManager.channelManager.chatChannels}`);
          console.log(`     사용자 채널: ${user.flowManager.channelManager.userChannels}`);
          console.log(`     채널 히스토리: ${user.flowManager.channelManager.channelHistory}`);
          console.log(`   통신 매니저:`);
          console.log(`     활성 통신: ${user.flowManager.communicationManager.activeCommunications}`);
          console.log(`     사용자 통신: ${user.flowManager.communicationManager.userCommunications}`);
          console.log(`     통신 히스토리: ${user.flowManager.communicationManager.communicationHistory}`);
          console.log(`   위치 매니저:`);
          console.log(`     사용자 위치: ${user.flowManager.locationManager.userLocations}`);
          console.log(`     위치별 사용자: ${user.flowManager.locationManager.locationUsers}`);
          console.log(`     채널 위치: ${user.flowManager.locationManager.channelLocations}`);
          console.log(`     위치 히스토리: ${user.flowManager.locationManager.locationHistory}`);
          console.log(`   통계:`);
          console.log(`     총 메시지: ${user.flowManager.statistics.totalMessages}`);
          console.log(`     활성 비디오 채널: ${user.flowManager.statistics.activeVideoChannels}`);
          console.log(`     활성 채팅 채널: ${user.flowManager.statistics.activeChatChannels}`);
        }
        
        if (user.spaceManager) {
          console.log('🏠 가상공간 관리:');
          console.log(`   모드 매니저:`);
          console.log(`     총 공간: ${user.spaceManager.modeManager.spaceModes}`);
          console.log(`     사용자 모드: ${user.spaceManager.modeManager.userModes}`);
          console.log(`     모드 히스토리: ${user.spaceManager.modeManager.modeHistory}`);
          console.log(`   정보 매니저:`);
          console.log(`     공간 정보: ${user.spaceManager.infoManager.spaceInfo}`);
          console.log(`     공간 요소: ${user.spaceManager.infoManager.spaceElements}`);
          console.log(`     공간 설정: ${user.spaceManager.infoManager.spaceSettings}`);
          console.log(`     공간 접근: ${user.spaceManager.infoManager.spaceAccess}`);
          console.log(`     공간 분석: ${user.spaceManager.infoManager.spaceAnalytics}`);
          console.log(`     공간 백업: ${user.spaceManager.infoManager.spaceBackups}`);
          console.log(`   통계:`);
          console.log(`     총 공간: ${user.spaceManager.statistics.totalSpaces}`);
          console.log(`     생성 중: ${user.spaceManager.statistics.spacesInCreation}`);
          console.log(`     편집 중: ${user.spaceManager.statistics.spacesInEdit}`);
          console.log(`     사용 중: ${user.spaceManager.statistics.spacesInUse}`);
          console.log(`     공개 공간: ${user.spaceManager.statistics.publicSpaces}`);
          console.log(`     비공개 공간: ${user.spaceManager.statistics.privateSpaces}`);
          console.log(`     총 요소: ${user.spaceManager.statistics.totalElements}`);
          console.log(`     총 백업: ${user.spaceManager.statistics.totalBackups}`);
        }
        
        if (user.globalStatistics) {
          console.log('📊 전체 통계:');
          console.log(`   총 사용자: ${user.globalStatistics.totalUsers}`);
          console.log(`   활성 사용자: ${user.globalStatistics.activeUsers}`);
          console.log(`   총 캐릭터: ${user.globalStatistics.totalCharacters}`);
          console.log(`   총 맵: ${user.globalStatistics.totalMaps}`);
        }
      }
      
      // 상세 통계
      if (stats && this.options.detailed) {
        console.log('\n📈 상세 통계');
        console.log('-'.repeat(30));
        
        if (stats.startup) {
          console.log('🚀 서버 시작 통계:');
          console.log(`   시작 시간: ${stats.startup.startTime || 'N/A'}`);
          console.log(`   실행 시간: ${stats.startup.uptime || 'N/A'}`);
        }
        
        if (stats.user) {
          console.log('👥 사용자 통계:');
          console.log(`   전체 통계: ${JSON.stringify(stats.user.globalStatistics)}`);
        }
      }
      
    } catch (error) {
      console.error('❌ 상태 확인 실패:', error);
      process.exit(1);
    }
  }

  // 서버 모니터링 시작
  startMonitoring() {
    console.log('📊 서버 모니터링 시작 (Ctrl+C로 종료)');
    
    const interval = setInterval(async () => {
      try {
        const status = this.server.getServerStatus();
        const timestamp = new Date().toLocaleTimeString();
        
        let connectionCount = 0;
        let memoryUsage = 'N/A';
        
        if (status.user && status.user.socketManager) {
          connectionCount = status.user.socketManager.socketUsers;
        }
        
        if (status.startup && status.startup.memoryUsage) {
          memoryUsage = this.formatBytes(status.startup.memoryUsage.heapUsed);
        }
        
        console.log(`[${timestamp}] 상태: ${status.isRunning ? '🟢' : '🔴'} | 연결: ${connectionCount} | 메모리: ${memoryUsage}`);
      } catch (error) {
        console.error('모니터링 오류:', error);
      }
    }, 5000);
    
    // Ctrl+C 처리
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n📊 모니터링 종료');
      process.exit(0);
    });
  }

  // 업타임 포맷팅
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${secs}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${secs}초`;
    } else {
      return `${secs}초`;
    }
  }

  // 바이트 포맷팅
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 도움말 표시
  showHelp() {
    console.log(`
🎮 Mini Area Metaverse 서버 관리자

사용법: node serverManager.js <명령> [옵션]

명령:
  start     서버 시작
  stop      서버 중지
  restart   서버 재시작
  status    서버 상태 확인

옵션:
  --monitor     서버 모니터링 시작 (start 명령과 함께 사용)
  --port <포트>  포트 번호 지정
  --env <환경>   환경 설정 (development, production, test)

예시:
  node serverManager.js start
  node serverManager.js start --monitor
  node serverManager.js status
  node serverManager.js restart

환경 변수:
  NODE_ENV        서버 환경 (development, production, test)
  PORT           서버 포트 (기본값: 7000)
  DB_HOST        데이터베이스 호스트
  DB_PORT        데이터베이스 포트
  DB_NAME        데이터베이스 이름
  DB_USER        데이터베이스 사용자
  DB_PASSWORD    데이터베이스 비밀번호
    `);
  }

  // 메인 실행
  async run() {
    switch (this.command) {
      case 'start':
        await this.start();
        break;
      case 'stop':
        await this.stop();
        break;
      case 'restart':
        await this.restart();
        break;
      case 'status':
        await this.status();
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        console.error('❌ 알 수 없는 명령:', this.command);
        console.log('도움말을 보려면: node serverManager.js help');
        process.exit(1);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const manager = new ServerManager();
  manager.run().catch(error => {
    console.error('❌ 서버 관리자 오류:', error);
    process.exit(1);
  });
}

module.exports = ServerManager;
