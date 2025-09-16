import React, { useState, useEffect } from 'react';
import './MetaverseSocialFeed.css';

const MetaverseSocialFeed = ({ isOpen, onClose, userId, username, avatarEmoji }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    content: '',
    location: '',
    postType: 'thought',
    virtualAsset: null,
    mood: '😊'
  });
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(false);

  // 메타버스 특화 게시물 타입
  const postTypes = {
    thought: { icon: '💭', name: '생각', color: '#667eea' },
    discovery: { icon: '🔍', name: '발견', color: '#f093fb' },
    achievement: { icon: '🏆', name: '성취', color: '#ffd89b' },
    nft: { icon: '💎', name: 'NFT', color: '#a8edea' },
    world: { icon: '🌍', name: '세계', color: '#ffecd2' },
    event: { icon: '🎉', name: '이벤트', color: '#ff9a9e' }
  };

  // 가상 위치들 (ID와 메타데이터 포함)
  const virtualWorlds = [
    {
      id: 'neo-city',
      name: '🏙️ 네오 시티',
      description: '사이버펑크 감성의 미래 도시',
      participants: Math.floor(Math.random() * 100) + 20,
      category: 'urban',
      featured: true
    },
    {
      id: 'stardust-plaza',
      name: '🌌 스타더스트 플라자',
      description: '별빛이 흐르는 우주 광장',
      participants: Math.floor(Math.random() * 80) + 15,
      category: 'space',
      featured: true
    },
    {
      id: 'crystal-castle',
      name: '🏰 크리스탈 캐슬',
      description: '신비로운 수정 궁전',
      participants: Math.floor(Math.random() * 60) + 10,
      category: 'fantasy',
      featured: false
    },
    {
      id: 'cyber-beach',
      name: '🌊 사이버 비치',
      description: '디지털 파도가 치는 해변',
      participants: Math.floor(Math.random() * 90) + 25,
      category: 'nature',
      featured: true
    },
    {
      id: 'digital-mountain',
      name: '🏔️ 디지털 마운틴',
      description: '픽셀 눈이 내리는 가상 산맥',
      participants: Math.floor(Math.random() * 40) + 8,
      category: 'nature',
      featured: false
    },
    {
      id: 'holo-garden',
      name: '🌸 홀로 가든',
      description: '홀로그램 꽃이 피는 정원',
      participants: Math.floor(Math.random() * 70) + 12,
      category: 'nature',
      featured: false
    },
    {
      id: 'meta-arena',
      name: '🎭 메타 아레나',
      description: '가상 공연과 이벤트 공간',
      participants: Math.floor(Math.random() * 150) + 50,
      category: 'entertainment',
      featured: true
    },
    {
      id: 'space-station',
      name: '🛸 스페이스 스테이션',
      description: '궤도를 도는 우주 정거장',
      participants: Math.floor(Math.random() * 85) + 18,
      category: 'space',
      featured: false
    },
    {
      id: 'magic-forest',
      name: '🔮 마법의 숲',
      description: '신비한 마법이 가득한 숲',
      participants: Math.floor(Math.random() * 55) + 12,
      category: 'fantasy',
      featured: false
    },
    {
      id: 'electro-club',
      name: '⚡ 일렉트로 클럽',
      description: '전자음악이 울려퍼지는 클럽',
      participants: Math.floor(Math.random() * 120) + 30,
      category: 'entertainment',
      featured: true
    }
  ];

  // 가상 위치 이름만 추출 (기존 코드 호환성을 위해)
  const virtualLocations = virtualWorlds.map(world => world.name);

  // 메타버스 반응 이모지
  const metaReactions = [
    { emoji: '⚡', name: '에너지', count: 0 },
    { emoji: '🌟', name: '스타', count: 0 },
    { emoji: '🔥', name: '핫', count: 0 },
    { emoji: '💎', name: '레어', count: 0 },
    { emoji: '🚀', name: '로켓', count: 0 },
    { emoji: '👾', name: '픽셀', count: 0 }
  ];

  // 샘플 게시물 데이터
  const samplePosts = [
    {
      id: 1,
      username: 'CyberNinja',
      avatarEmoji: '🥷',
      content: '방금 새로운 NFT 아트워크를 완성했어! 홀로그래픽 효과가 정말 멋져 ✨',
      postType: 'nft',
      location: '🎭 메타 아레나',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      reactions: [
        { emoji: '⚡', name: '에너지', count: 12 },
        { emoji: '💎', name: '레어', count: 8 },
        { emoji: '🌟', name: '스타', count: 15 }
      ],
      comments: 4,
      shares: 2,
      virtualAsset: {
        type: 'nft',
        name: '홀로그래픽 드래곤',
        rarity: 'Epic',
        image: '🐉'
      }
    },
    {
      id: 2,
      username: 'QuantumExplorer',
      avatarEmoji: '🚀',
      content: '디지털 마운틴 정상에 도달! 이 뷰는 정말 숨막혀... 여러분도 한번 와보세요!',
      postType: 'discovery',
      location: '🏔️ 디지털 마운틴',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      reactions: [
        { emoji: '🚀', name: '로켓', count: 20 },
        { emoji: '🌟', name: '스타', count: 18 },
        { emoji: '⚡', name: '에너지', count: 5 }
      ],
      comments: 12,
      shares: 8,
      media: '🌄'
    },
    {
      id: 3,
      username: 'NeonDancer',
      avatarEmoji: '💃',
      content: '오늘 일렉트로 클럽에서 새로운 댄스 무브를 배웠어! VR 댄스의 매력에 푹 빠졌다 💫',
      postType: 'event',
      location: '⚡ 일렉트로 클럽',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      reactions: [
        { emoji: '🔥', name: '핫', count: 25 },
        { emoji: '⚡', name: '에너지', count: 30 },
        { emoji: '🌟', name: '스타', count: 22 }
      ],
      comments: 8,
      shares: 5
    }
  ];

  useEffect(() => {
    if (isOpen) {
      loadSocialData();
      checkUrlParams();
    }
  }, [isOpen, userId]);

  // URL 파라미터 확인하여 직접 세계 접근
  const checkUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const worldId = urlParams.get('world');
    const inviteId = urlParams.get('invite');
    
    if (worldId && worldId !== userId) {
      const world = virtualWorlds.find(w => w.id === worldId);
      if (world) {
        // 초대받은 경우 특별 알림
        if (inviteId) {
          showNotification(
            `🎉 초대받은 ${world.name.split(' ')[1]}로 이동합니다!`, 
            'success'
          );
        }
        
        // 세계 탭으로 이동하고 해당 세계 하이라이트
        setActiveTab('worlds');
        
        // 3초 후 자동 입장 여부 확인
        setTimeout(() => {
          const autoJoin = window.confirm(
            `${world.name}에 입장하시겠습니까?\n\n"${world.description}"\n\n현재 ${world.participants}명이 접속 중입니다.`
          );
          
          if (autoJoin) {
            visitWorld(worldId, world.name);
          }
        }, 1000);
      }
    }
  };

  const loadSocialData = async () => {
    setIsLoading(true);
    try {
      // 저장된 게시물 로드
      const savedPosts = localStorage.getItem(`metaverse_posts_${userId}`) || '[]';
      const userPosts = JSON.parse(savedPosts);
      
      // 샘플 게시물과 사용자 게시물 합치기
      const allPosts = [...samplePosts, ...userPosts].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setPosts(allPosts);
    } catch (error) {
      console.error('소셜 데이터 로드 실패:', error);
      setPosts(samplePosts);
    } finally {
      setIsLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.content.trim()) {
      alert('내용을 입력해주세요!');
      return;
    }

    setIsLoading(true);
    try {
      const post = {
        id: Date.now(),
        username: username || 'Anonymous',
        avatarEmoji: avatarEmoji || '👤',
        content: newPost.content,
        postType: newPost.postType,
        location: newPost.location || '🌌 메타버스',
        timestamp: new Date().toISOString(),
        reactions: metaReactions.map(r => ({ ...r })),
        comments: 0,
        shares: 0,
        virtualAsset: newPost.virtualAsset
      };

      const updatedPosts = [post, ...posts];
      setPosts(updatedPosts);

      // 사용자 게시물만 저장
      const userPosts = updatedPosts.filter(p => p.username === username);
      localStorage.setItem(`metaverse_posts_${userId}`, JSON.stringify(userPosts));

      // 폼 리셋
      setNewPost({
        content: '',
        location: '',
        postType: 'thought',
        virtualAsset: null,
        mood: '😊'
      });

      // 성공 알림
      showNotification('게시물이 메타버스에 발행되었습니다! ✨', 'success');

    } catch (error) {
      console.error('게시물 작성 실패:', error);
      alert('게시물 작성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const reactToPost = (postId, reactionIndex) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const updatedReactions = [...post.reactions];
        updatedReactions[reactionIndex].count += 1;
        return { ...post, reactions: updatedReactions };
      }
      return post;
    });
    setPosts(updatedPosts);
    
    // 리액션 애니메이션 효과
    showNotification(`${posts.find(p => p.id === postId).reactions[reactionIndex].emoji} 리액션 추가!`, 'reaction');
  };

  const sharePost = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const shareText = `"${post.content}" - ${post.username} (@MetaverseSocial)`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Metaverse Social Post',
          text: shareText
        });
      } else {
        navigator.clipboard.writeText(shareText);
        showNotification('링크가 클립보드에 복사되었습니다! 📋', 'success');
      }
      
      // 공유 카운트 증가
      const updatedPosts = posts.map(p => 
        p.id === postId ? { ...p, shares: p.shares + 1 } : p
      );
      setPosts(updatedPosts);
    }
  };

  // URL 생성 및 복사 기능
  const generateWorldUrl = (worldId) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?world=${worldId}&invite=${userId}`;
  };

  const copyWorldUrl = async (worldId, worldName) => {
    try {
      const url = generateWorldUrl(worldId);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // 폴백: 텍스트 영역을 사용한 복사
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      showNotification(`${worldName.split(' ')[1]} 초대 링크가 복사되었습니다! 🔗`, 'success');
    } catch (error) {
      console.error('URL 복사 실패:', error);
      showNotification('링크 복사에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const shareWorld = async (worldId, worldName) => {
    const url = generateWorldUrl(worldId);
    const shareText = `🌐 ${worldName}에서 만나요!\n\n메타버스 세계로 바로 입장: ${url}\n\n#메타버스 #가상현실`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `메타버스 초대: ${worldName}`,
          text: shareText,
          url: url
        });
        showNotification('성공적으로 공유되었습니다! 🚀', 'success');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyWorldUrl(worldId, worldName);
        }
      }
    } else {
      copyWorldUrl(worldId, worldName);
    }
  };

  const visitWorld = (worldId, worldName) => {
    // 실제 구현에서는 해당 세계로 이동하는 로직
    const url = generateWorldUrl(worldId);
    showNotification(`🚀 ${worldName.split(' ')[1]}으로 이동 중...`, 'info');
    
    // URL을 히스토리에 추가 (실제로는 라우팅 처리)
    window.history.pushState({ worldId }, worldName, url);
    
    setTimeout(() => {
      showNotification(`✨ ${worldName.split(' ')[1]} 도착! 즐거운 시간 보내세요!`, 'success');
      onClose(); // 소셜 피드 닫기
    }, 2000);
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #4CAF50, #45a049)' :
                   type === 'reaction' ? 'linear-gradient(135deg, #ff9a9e, #fecfef)' :
                   type === 'error' ? 'linear-gradient(135deg, #f56565, #e53e3e)' :
                   'linear-gradient(135deg, #667eea, #764ba2)'};
      color: white;
      padding: 15px 25px;
      border-radius: 30px;
      z-index: 4000;
      font-weight: 600;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.5s ease-out;
      backdrop-filter: blur(10px);
      max-width: 350px;
      word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="metaverse-social-overlay">
      <div className="metaverse-social-modal">
        {/* 헤더 */}
        <div className="social-header">
          <div className="header-info">
            <h2>🌐 메타버스 소셜</h2>
            <p>디지털 세계의 소통 공간</p>
          </div>
          <div className="header-actions">
            <div className="user-avatar">
              <span className="avatar-emoji">{avatarEmoji || '👤'}</span>
              <span className="username">{username}</span>
            </div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="social-tabs">
          <button 
            className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            🌌 피드
          </button>
          <button 
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            ✨ 작성
          </button>
          <button 
            className={`tab ${activeTab === 'worlds' ? 'active' : ''}`}
            onClick={() => setActiveTab('worlds')}
          >
            🌍 세계
          </button>
          <button 
            className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            🔥 트렌드
          </button>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="social-content">
          {activeTab === 'feed' && (
            <div className="feed-tab">
              <div className="feed-header">
                <h3>✨ 메타버스 타임라인</h3>
                <div className="feed-stats">
                  <span>📡 실시간 연결됨</span>
                  <span>👥 {posts.length}개 게시물</span>
                </div>
              </div>
              
              <div className="posts-container">
                {posts.map(post => (
                  <div key={post.id} className="post-card">
                    <div className="post-header">
                      <div className="post-author">
                        <span className="author-avatar">{post.avatarEmoji}</span>
                        <div className="author-info">
                          <span className="author-name">{post.username}</span>
                          <div className="post-meta">
                            <span className="post-type" style={{color: postTypes[post.postType].color}}>
                              {postTypes[post.postType].icon} {postTypes[post.postType].name}
                            </span>
                            <span className="post-location">📍 {post.location}</span>
                            <span className="post-time">{formatTimeAgo(post.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="post-content">
                      <p>{post.content}</p>
                      
                      {post.virtualAsset && (
                        <div className="virtual-asset">
                          <div className="asset-preview">
                            <span className="asset-icon">{post.virtualAsset.image}</span>
                            <div className="asset-info">
                              <h4>{post.virtualAsset.name}</h4>
                              <span className="asset-rarity">{post.virtualAsset.rarity}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {post.media && (
                        <div className="post-media">
                          <span className="media-preview">{post.media}</span>
                        </div>
                      )}
                    </div>

                    <div className="post-actions">
                      <div className="reactions">
                        {post.reactions.map((reaction, index) => (
                          <button 
                            key={index}
                            className="reaction-btn"
                            onClick={() => reactToPost(post.id, index)}
                            title={reaction.name}
                          >
                            {reaction.emoji} {reaction.count > 0 && reaction.count}
                          </button>
                        ))}
                      </div>
                      
                      <div className="action-buttons">
                        <button className="action-btn comment-btn">
                          💬 {post.comments}
                        </button>
                        <button 
                          className="action-btn share-btn"
                          onClick={() => sharePost(post.id)}
                        >
                          🚀 {post.shares}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="create-tab">
              <div className="create-header">
                <h3>✨ 새 게시물 작성</h3>
                <p>메타버스에 당신의 이야기를 공유해보세요</p>
              </div>

              <div className="create-form">
                <div className="post-type-selector">
                  <h4>📝 게시물 타입</h4>
                  <div className="type-buttons">
                    {Object.entries(postTypes).map(([key, type]) => (
                      <button
                        key={key}
                        className={`type-btn ${newPost.postType === key ? 'active' : ''}`}
                        onClick={() => setNewPost({...newPost, postType: key})}
                        style={{borderColor: newPost.postType === key ? type.color : ''}}
                      >
                        {type.icon} {type.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="content-input">
                  <h4>💭 내용</h4>
                  <textarea
                    placeholder="메타버스에서 무슨 일이 일어나고 있나요?"
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    rows="4"
                  />
                </div>

                <div className="location-selector">
                  <h4>📍 가상 위치</h4>
                  <select
                    value={newPost.location}
                    onChange={(e) => setNewPost({...newPost, location: e.target.value})}
                  >
                    <option value="">위치 선택 (선택사항)</option>
                    {virtualLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <div className="post-actions-create">
                  <button 
                    className="create-post-btn"
                    onClick={createPost}
                    disabled={isLoading || !newPost.content.trim()}
                  >
                    {isLoading ? '발행 중...' : '🚀 메타버스에 발행'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'worlds' && (
            <div className="worlds-tab">
              <div className="worlds-header">
                <h3>🌍 가상 세계 탐험</h3>
                <p>다양한 메타버스 공간을 발견해보세요</p>
              </div>
              
              <div className="worlds-grid">
                {virtualWorlds.map((world) => (
                  <div key={world.id} className={`world-card ${world.featured ? 'featured' : ''}`}>
                    <div className="world-preview">
                      <span className="world-emoji">{world.name.split(' ')[0]}</span>
                      {world.featured && <div className="featured-badge">🌟 인기</div>}
                    </div>
                    <div className="world-info">
                      <h4>{world.name}</h4>
                      <p className="world-description">{world.description}</p>
                      <div className="world-stats">
                        <span className="participants">👥 {world.participants}명</span>
                        <span className="category">{world.category}</span>
                      </div>
                      <div className="world-actions">
                        <button 
                          className="visit-btn"
                          onClick={() => visitWorld(world.id, world.name)}
                        >
                          🚀 방문하기
                        </button>
                        <div className="share-buttons">
                          <button 
                            className="share-btn copy-btn"
                            onClick={() => copyWorldUrl(world.id, world.name)}
                            title="링크 복사"
                          >
                            📋
                          </button>
                          <button 
                            className="share-btn social-share-btn"
                            onClick={() => shareWorld(world.id, world.name)}
                            title="공유하기"
                          >
                            🔗
                          </button>
                        </div>
                      </div>
                      <div className="world-url">
                        <small>🌐 {generateWorldUrl(world.id)}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'trending' && (
            <div className="trending-tab">
              <div className="trending-header">
                <h3>🔥 실시간 트렌드</h3>
                <p>지금 메타버스에서 핫한 주제들</p>
              </div>
              
              <div className="trending-content">
                <div className="trending-topics">
                  <h4>💫 인기 해시태그</h4>
                  <div className="hashtags">
                    {['#메타버스라이프', '#NFT컬렉션', '#가상현실', '#디지털아트', '#사이버패션'].map(tag => (
                      <span key={tag} className="hashtag">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="trending-users">
                  <h4>⭐ 주목받는 유저</h4>
                  <div className="user-list">
                    {[
                      { name: 'CyberArtist', emoji: '🎨', followers: '12.5K' },
                      { name: 'VirtualDJ', emoji: '🎧', followers: '8.9K' },
                      { name: 'MetaBuilder', emoji: '🏗️', followers: '15.2K' }
                    ].map(user => (
                      <div key={user.name} className="trending-user">
                        <span className="user-emoji">{user.emoji}</span>
                        <div className="user-stats">
                          <strong>{user.name}</strong>
                          <span>{user.followers} 팔로워</span>
                        </div>
                        <button className="follow-btn">팔로우</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trending-worlds">
                  <h4>🔥 핫플레이스</h4>
                  <div className="hot-worlds-list">
                    {virtualWorlds
                      .filter(world => world.featured)
                      .sort((a, b) => b.participants - a.participants)
                      .slice(0, 3)
                      .map(world => (
                      <div key={world.id} className="hot-world-item">
                        <span className="world-emoji-small">{world.name.split(' ')[0]}</span>
                        <div className="hot-world-info">
                          <strong>{world.name.split(' ').slice(1).join(' ')}</strong>
                          <span>👥 {world.participants}명 접속</span>
                        </div>
                        <div className="hot-world-actions">
                          <button 
                            className="quick-visit-btn"
                            onClick={() => visitWorld(world.id, world.name)}
                            title="빠른 입장"
                          >
                            🚀
                          </button>
                          <button 
                            className="quick-share-btn"
                            onClick={() => copyWorldUrl(world.id, world.name)}
                            title="링크 복사"
                          >
                            🔗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetaverseSocialFeed;