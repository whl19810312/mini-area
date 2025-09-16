import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/SNSBoard.css';

const SNSBoard = ({ posts, onPostCreate, onPostLike, onPostComment, currentMap, userPosition, currentCharacter }) => {
  const { user } = useAuth();
  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState({});
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'area', 'trending'

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    
    // 현재 위치와 영역 정보 추가
    const currentArea = getCurrentAreaInfo();
    
    const post = {
      id: Date.now(),
      content: newPostContent,
      author: user?.username || '익명',
      authorId: user?.id,
      authorCharacter: currentCharacter,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: [],
      hashtags: extractHashtags(newPostContent),
      location: {
        mapId: currentMap?.id,
        mapName: currentMap?.name,
        area: currentArea,
        position: userPosition
      },
      metaverseActivity: generateMetaverseActivity()
    };
    
    onPostCreate(post);
    setNewPostContent('');
  };

  const getCurrentAreaInfo = () => {
    if (!currentMap || !userPosition) return '메타버스';
    
    // 개인 영역 확인
    if (currentMap.privateAreas) {
      const area = currentMap.privateAreas.find(area => {
        const normalizedArea = {
          position: area.position || area.start,
          size: area.size || {
            width: area.end.x - area.start.x,
            height: area.end.y - area.start.y
          }
        };
        return userPosition.x >= normalizedArea.position.x && 
               userPosition.x <= normalizedArea.position.x + normalizedArea.size.width &&
               userPosition.y >= normalizedArea.position.y && 
               userPosition.y <= normalizedArea.position.y + normalizedArea.size.height;
      });
      
      if (area) return `🔒 ${area.name || '개인영역'}`;
    }
    
    return '🌍 공용영역';
  };

  const generateMetaverseActivity = () => {
    const activities = [];
    
    if (currentCharacter) {
      activities.push(`👤 ${currentCharacter.name} 캐릭터로 활동`);
    }
    
    const area = getCurrentAreaInfo();
    activities.push(`📍 ${area}에서 작성`);
    
    return activities;
  };

  const handleLike = (postId) => {
    onPostLike(postId);
  };

  const handleComment = (postId) => {
    const comment = newCommentContent[postId];
    if (!comment?.trim()) return;
    
    onPostComment(postId, comment);
    setNewCommentContent(prev => ({ ...prev, [postId]: '' }));
  };

  const extractHashtags = (text) => {
    const hashtagRegex = /#[\w가-힣]+/g;
    return text.match(hashtagRegex) || [];
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString();
  };

  const filteredPosts = posts.filter(post => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'area') {
      return post.location?.mapId === currentMap?.id;
    }
    if (selectedFilter === 'trending') {
      return post.likes >= 2; // 좋아요 2개 이상인 게시글
    }
    return true;
  });

  return (
    <div className="sns-board">
      <div className="sns-header">
        <div className="header-content">
          <h2>🌟 미니 에어리어 SNS</h2>
          <p>메타버스에서의 특별한 순간을 공유하세요!</p>
        </div>
        
        {/* 현재 위치 정보 */}
        <div className="current-status">
          <div className="status-item">
            <span className="status-icon">🗺️</span>
            <span>{currentMap?.name || '메타버스'}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">📍</span>
            <span>{getCurrentAreaInfo()}</span>
          </div>
          {currentCharacter && (
            <div className="status-item">
              <span className="status-icon">👤</span>
              <span>{currentCharacter.name}</span>
            </div>
          )}
        </div>

        {/* 필터 버튼 */}
        <div className="filter-tabs">
          <button 
            className={`filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            🌍 전체 피드
          </button>
          <button 
            className={`filter-btn ${selectedFilter === 'area' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('area')}
          >
            📍 현재 맵
          </button>
          <button 
            className={`filter-btn ${selectedFilter === 'trending' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('trending')}
          >
            🔥 인기 게시글
          </button>
        </div>
      </div>

      {/* 새 게시글 작성 */}
      <div className="post-create">
        <div className="post-author-preview">
          <div className="author-avatar">
            {currentCharacter?.images?.down ? (
              <img src={currentCharacter.images.down} alt="캐릭터" />
            ) : (
              '👤'
            )}
          </div>
          <div className="author-info">
            <div className="author-name">{user?.username || '익명'}</div>
            <div className="post-location">📍 {getCurrentAreaInfo()}</div>
          </div>
        </div>
        
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="메타버스에서의 경험을 공유해보세요! #해시태그로 더 많은 사람들과 소통하세요 ✨"
          rows={3}
        />
        <div className="post-create-footer">
          <div className="hashtag-suggestions">
            <span className="hashtag-hint">추천: </span>
            <button onClick={() => setNewPostContent(prev => prev + ' #메타버스모험')}>#메타버스모험</button>
            <button onClick={() => setNewPostContent(prev => prev + ' #화상만남')}>#화상만남</button>
            <button onClick={() => setNewPostContent(prev => prev + ' #캐릭터꾸미기')}>#캐릭터꾸미기</button>
            <button onClick={() => setNewPostContent(prev => prev + ' #미니쇼핑')}>#미니쇼핑</button>
          </div>
          <button 
            className="post-submit-btn"
            onClick={handleCreatePost}
            disabled={!newPostContent.trim()}
          >
            ✨ 경험 공유하기
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="posts-list">
        {filteredPosts.length === 0 ? (
          <div className="empty-posts">
            <div className="empty-icon">🌟</div>
            <p>아직 {selectedFilter === 'all' ? '게시글' : selectedFilter === 'area' ? '이 맵의 게시글' : '인기 게시글'}이 없어요!</p>
            <p>메타버스에서의 첫 번째 경험을 공유해보세요!</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="post-item">
              <div className="post-header">
                <div className="post-author">
                  <div className="author-avatar">
                    {post.authorCharacter?.images?.down ? (
                      <img src={post.authorCharacter.images.down} alt="캐릭터" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="author-info">
                    <div className="author-name">{post.author}</div>
                    <div className="post-time">{formatTimestamp(post.timestamp)}</div>
                    {post.location && (
                      <div className="post-location">
                        📍 {post.location.mapName} - {post.location.area}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 메타버스 활동 정보 */}
              {post.metaverseActivity && post.metaverseActivity.length > 0 && (
                <div className="metaverse-activity">
                  {post.metaverseActivity.map((activity, index) => (
                    <span key={index} className="activity-tag">
                      {activity}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="post-content">
                {post.content.split(' ').map((word, index) => {
                  if (word.startsWith('#')) {
                    return (
                      <span key={index} className="hashtag">
                        {word}
                      </span>
                    );
                  }
                  return word + ' ';
                })}
              </div>
              
              <div className="post-actions">
                <button 
                  className="action-btn like-btn"
                  onClick={() => handleLike(post.id)}
                >
                  ❤️ 좋아요 ({post.likes})
                </button>
                <button className="action-btn">
                  💬 댓글 ({post.comments?.length || 0})
                </button>
                <button className="action-btn">
                  🔄 공유
                </button>
              </div>
              
              {/* 댓글 섹션 */}
              <div className="comments-section">
                {post.comments?.map((comment, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-author">{comment.author}</div>
                    <div className="comment-content">{comment.content}</div>
                    <div className="comment-time">{formatTimestamp(comment.timestamp)}</div>
                  </div>
                ))}
                
                <div className="comment-input">
                  <input
                    type="text"
                    value={newCommentContent[post.id] || ''}
                    onChange={(e) => setNewCommentContent(prev => ({ 
                      ...prev, 
                      [post.id]: e.target.value 
                    }))}
                    placeholder="댓글을 입력하세요..."
                    onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                  />
                  <button 
                    onClick={() => handleComment(post.id)}
                    disabled={!newCommentContent[post.id]?.trim()}
                  >
                    댓글
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SNSBoard;





