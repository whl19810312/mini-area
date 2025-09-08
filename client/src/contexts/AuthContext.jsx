import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { configureAxios } from '../utils/apiConfig'
import { getWebSocketURL } from '../utils/apiConfig'
import { io } from 'socket.io-client'

// axios 기본 설정
configureAxios();

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef(null)
  
  // 미디어 권한 상태 관리
  const [hasMediaPermission, setHasMediaPermission] = useState(false)
  const [localStream, setLocalStream] = useState(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false)
  const [isRequestingMedia, setIsRequestingMedia] = useState(false) // 중복 요청 방지

  // 미디어 권한 요청 함수
  const requestMediaPermission = async () => {
    // 이미 요청 중이면 스킵
    if (isRequestingMedia) {
      console.log('⏳ 이미 미디어 권한 요청 중...');
      return false;
    }
    
    try {
      setIsRequestingMedia(true);
      console.log('🎥 미디어 권한 요청');
      
      // 이미 권한이 있고 스트림이 활성 상태면 재사용
      if (hasMediaPermission && localStream) {
        const videoTracks = localStream.getVideoTracks();
        const audioTracks = localStream.getAudioTracks();
        
        if (videoTracks.length > 0 && audioTracks.length > 0) {
          // 트랙이 활성화되어 있는지 확인
          const videoActive = videoTracks.some(track => track.readyState === 'live');
          const audioActive = audioTracks.some(track => track.readyState === 'live');
          
          if (videoActive && audioActive) {
            console.log('✅ 이미 미디어 권한이 있음 - 스트림 재사용');
            setIsRequestingMedia(false);
            return true;
          }
        }
      }
      
      // 기존 스트림이 있으면 정리
      if (localStream) {
        console.log('🧹 기존 스트림 정리');
        localStream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        setLocalStream(null);
        // 잠시 대기하여 리소스가 해제되도록 함
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ 미디어 권한 획득 성공');
      console.log('비디오 트랙:', stream.getVideoTracks().length);
      console.log('오디오 트랙:', stream.getAudioTracks().length);
      
      setLocalStream(stream);
      setIsCameraOn(true);
      setIsMicrophoneOn(true);
      setHasMediaPermission(true);
      
      toast.success('카메라와 마이크 권한이 허용되었습니다.');
      return true;
    } catch (error) {
      console.error('❌ 앱 시작 시 미디어 권한 요청 실패:', error);
      
      let errorMessage = '카메라/마이크 권한이 필요합니다.';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = '카메라/마이크 권한이 거부되었습니다.';
          break;
        case 'NotFoundError':
          errorMessage = '카메라 또는 마이크 장치를 찾을 수 없습니다.';
          break;
        case 'NotReadableError':
          errorMessage = '카메라 또는 마이크가 다른 애플리케이션에서 사용 중입니다.';
          break;
        default:
          errorMessage = `미디어 접근 오류: ${error.message}`;
      }
      
      toast.error(errorMessage);
      setHasMediaPermission(false);
      return false;
    } finally {
      setIsRequestingMedia(false);
    }
  };

  // 미디어 권한 상태 확인
  const checkMediaPermission = async () => {
    if (navigator.permissions) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
        
        const hasPermission = cameraPermission.state === 'granted' && microphonePermission.state === 'granted';
        setHasMediaPermission(hasPermission);
        
        if (hasPermission && !localStream) {
          // 권한이 있지만 스트림이 없으면 스트림 생성
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          setLocalStream(stream);
          setIsCameraOn(true);
          setIsMicrophoneOn(true);
        }
        
        return hasPermission;
      } catch (error) {
        console.log('권한 상태 확인 실패:', error);
        return false;
      }
    }
    return false;
  };

  // Socket.IO 연결 관리
  const connectSocket = () => {
    // 이미 연결되어 있으면 재연결하지 않음
    if (socketRef.current?.connected) {
      console.log('✅ Socket.IO 이미 연결됨 - 재사용')
      return socketRef.current
    }
    
    // 연결 중인 소켓이 있으면 재사용
    if (socketRef.current && socketRef.current.connecting) {
      console.log('⏳ Socket.IO 연결 중 - 대기')
      return socketRef.current
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.log('토큰이 없어 Socket.IO 연결하지 않음')
      return null
    }

    console.log('🔗 Socket.IO 신규 연결 시작')
    const wsUrl = getWebSocketURL()
    console.log('🔗 WebSocket URL:', wsUrl)
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'], // WebSocket과 polling 모두 허용
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity, // 무한 재연결 시도
      reconnectionDelay: 1000, // 재연결 간격 (1초)
      reconnectionDelayMax: 5000, // 최대 재연결 간격 (5초)
      timeout: 20000, // 타임아웃
      forceNew: false, // 기존 연결 재사용
      upgrade: true, // 업그레이드 허용
      rememberUpgrade: true, // 업그레이드 기억
      pingTimeout: 60000, // 핑 타임아웃
      pingInterval: 25000, // 핑 간격
      autoConnect: true, // 자동 연결
      // HTTPS/WSS 환경에서 자체 서명 인증서 허용
      rejectUnauthorized: false,
      secure: true
    })

    socketRef.current.on('connect', () => {
      console.log('✅ Socket.IO 연결 성공:', socketRef.current.id)
      setSocketConnected(true)
      try {
        const latestToken = localStorage.getItem('token')
        if (latestToken) {
          socketRef.current.emit('authenticate', { token: latestToken })
        }
      } catch (e) {
        console.error('소켓 인증 이벤트 전송 실패:', e)
      }
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('⚠️ Socket.IO 연결 종료:', reason)
      setSocketConnected(false)
      
      // 서버 측에서 끊긴 경우에만 재연결 (클라이언트가 의도적으로 끊은 경우 제외)
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        console.log('🔄 Socket.IO 자동 재연결 활성화')
        // Socket.IO가 자동으로 재연결을 시도함 (reconnection: true 설정으로)
      } else if (reason === 'io client disconnect') {
        console.log('📴 클라이언트가 의도적으로 연결 종료함')
      }
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket.IO 연결 오류:', error)
      setSocketConnected(false)
    })

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO 재연결 성공:', attemptNumber)
      setSocketConnected(true)
    })

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO 재연결 시도:', attemptNumber)
    })

    socketRef.current.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO 재연결 오류:', error)
    })

    socketRef.current.on('reconnect_failed', () => {
      console.error('❌ Socket.IO 재연결 실패')
      toast.error('서버 연결에 실패했습니다. 페이지를 새로고침해주세요.')
    })

    socketRef.current.on('authenticated', () => {
      console.log('✅ Socket.IO 인증 완료')
      // 서버 상태 요청
      socketRef.current.emit('request-server-state')
    })
    
    // Ping/Pong 시스템 처리
    socketRef.current.on('ping', (data) => {
      // 서버로부터 ping을 받으면 즉시 pong 응답
      socketRef.current.emit('pong', data)
      console.log('🏓 Ping 수신 → Pong 응답')
    })
    
    socketRef.current.on('connection-timeout', (data) => {
      console.error('⏱️ 연결 타임아웃:', data.message)
      alert('서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.')
      // 필요시 자동 새로고침
      // window.location.reload()
    })

    socketRef.current.on('auto-rejoin', (data) => {
      console.log('🔄 자동 재입장 알림:', data)
      toast(data.message || '이전 입실 상태가 복원되었습니다.')
      
      // 메타버스 페이지로 자동 이동
      if (window.location.pathname !== `/metaverse/${data.mapId}`) {
        window.location.href = `/metaverse/${data.mapId}`
      }
    })

    return socketRef.current
  }

  const disconnectSocket = () => {
    if (socketRef.current) {
      console.log('Socket.IO 연결 종료')
      socketRef.current.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      checkAuth(token)
    } else {
      setLoading(false)
    }
  }, [])

  // 사용자가 로그인되면 Socket.IO 연결 (한 번만 연결하고 유지)
  useEffect(() => {
    if (user) {
      // 로그인된 경우 소켓 연결 (이미 연결되어 있으면 스킵)
      connectSocket()
    }
    // 경로 변경 시에는 소켓 연결을 끊지 않음
  }, [user]) // location.pathname 제거 - 경로 변경 시 재연결하지 않음

  const checkAuth = async (token) => {
    try {
      console.log('checkAuth 호출 - token:', token ? '존재' : '없음')
      const response = await axios.get('/api/auth/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('checkAuth 응답:', response.data)
      setUser(response.data.user)
    } catch (error) {
      console.error('checkAuth 오류:', error.response?.status, error.response?.data)
      // 자동 로그아웃 비활성화 - 토큰과 사용자 상태 유지
      // localStorage.removeItem('token')
      // setUser(null)
      
      // 토큰이 있으면 사용자 정보를 유지 (세션 만료 방지)
      if (token) {
        // 기존 사용자 정보 유지하거나 기본값 설정
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser))
          } catch {
            // 파싱 실패 시 무시
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      console.log('로그인 시도 - email:', email, 'password:', password ? '제공됨' : '없음')
      console.log('API URL:', axios.defaults.baseURL)
      
      const response = await axios.post('/api/auth/login', { email, password })
      console.log('로그인 응답:', response.data)
      
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user)) // 사용자 정보도 저장
      setUser(user)
      toast.success('로그인되었습니다.')
      return true
    } catch (error) {
      console.error('로그인 오류:', error.response?.status, error.response?.data)
      console.error('로그인 오류 상세:', error)
      
      // 이메일 인증이 필요한 경우
      if (error.response?.data?.needsEmailVerification) {
        toast.error('이메일 인증이 필요합니다. 이메일을 확인하여 인증을 완료해주세요.');
        return { needsEmailVerification: true, email };
      }
      
      toast.error(error.response?.data?.message || '로그인에 실패했습니다.')
      return false
    }
  }

  const register = async (username, email, password) => {
    try {
      console.log('회원가입 시도 - API URL:', axios.defaults.baseURL)
      const response = await axios.post('/api/auth/register', { username, email, password })
      
      if (response.data.success) {
        toast.success('회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.')
        return { success: true, needsEmailVerification: true, email };
      } else {
        return false
      }
    } catch (error) {
      console.error('회원가입 오류:', error.response?.data)
      
      // 서버에서 받은 오류 메시지 표시
      const errorMessage = error.response?.data?.message || '회원가입에 실패했습니다.'
      toast.error(errorMessage)
      
      // 오류 정보를 반환하여 컴포넌트에서 처리할 수 있도록 함
      return { 
        success: false, 
        error: errorMessage,
        errorDetails: error.response?.data 
      }
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('로그아웃 오류:', error)
    } finally {
      localStorage.removeItem('token')
      setUser(null)
      disconnectSocket() // 로그아웃 시 Socket.IO 연결 종료
      toast.success('로그아웃되었습니다.')
    }
  }

  const deleteAccount = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('로그인이 필요합니다.')
        return false
      }

      // 사용자 확인
      const confirmed = window.confirm(
        '정말로 계정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.'
      )

      if (!confirmed) {
        return false
      }

      const response = await axios.delete('/api/auth/delete-account', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        localStorage.removeItem('token')
        setUser(null)
        disconnectSocket()
        toast.success('계정이 성공적으로 삭제되었습니다.')
        return true
      } else {
        toast.error(response.data.message || '계정 삭제에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error)
      toast.error(error.response?.data?.message || '계정 삭제 중 오류가 발생했습니다.')
      return false
    }
  }

  const resendVerification = async (email) => {
    try {
      console.log('📧 이메일 인증 재전송 요청:', email)
      
      const response = await axios.post('/api/auth/resend-verification', { email })
      
      if (response.data.success) {
        toast.success('인증 이메일이 재전송되었습니다. 이메일을 확인해주세요.')
        return { success: true }
      } else {
        toast.error(response.data.message || '이메일 재전송에 실패했습니다.')
        return { success: false, error: response.data.message }
      }
    } catch (error) {
      console.error('이메일 재전송 오류:', error)
      const errorMessage = error.response?.data?.message || '이메일 재전송 중 오류가 발생했습니다.'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const googleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  const value = {
    user,
    loading,
    token: localStorage.getItem('token'), // token 추가
    login,
    register,
    logout,
    deleteAccount,
    resendVerification,
    googleLogin,
    socket: socketRef.current,
    socketConnected,
    connectSocket,
    // 미디어 관련 상태와 함수들
    hasMediaPermission,
    localStream,
    isCameraOn,
    isMicrophoneOn,
    requestMediaPermission,
    checkMediaPermission,
    setLocalStream,
    setIsCameraOn,
    setIsMicrophoneOn
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 