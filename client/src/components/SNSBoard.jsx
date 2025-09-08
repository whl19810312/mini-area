import React, { useState } from 'react';
import '../styles/SNSBoard.css';

const SNSBoard = ({ posts, onPostCreate, onPostLike, onPostComment }) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState({});

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    
    const post = {
      id: Date.now(),
      content: newPostContent,
      author: '사용자',
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: [],
      hashtags: extractHashtags(newPostContent)
    };
    
    onPostCreate(post);
    setNewPostContent('');
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

  return (
    <div className="sns-board">
      <div className="sns-header">
        <h2>📱 SNS 게시판</h2>
        <p>mini area에서의 경험을 공유해보세요!</p>
      </div>

      {/* 새 게시글 작성 */}
      <div className="post-create">
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="무엇을 공유하고 싶으신가요? #해시태그도 사용할 수 있어요!"
          rows={3}
        />
        <div className="post-create-footer">
          <div className="hashtag-suggestions">
            <span className="hashtag-hint">추천 해시태그: </span>
            <button onClick={() => setNewPostContent(prev => prev + ' #miniarea')}>#miniarea</button>
            <button onClick={() => setNewPostContent(prev => prev + ' #화상통화')}>#화상통화</button>
            <button onClick={() => setNewPostContent(prev => prev + ' #캐릭터')}>#캐릭터</button>
          </div>
          <button 
            className="post-submit-btn"
            onClick={handleCreatePost}
            disabled={!newPostContent.trim()}
          >
            게시하기
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="empty-posts">
            <div className="empty-icon">📝</div>
            <p>아직 게시글이 없어요!</p>
            <p>첫 번째 게시글을 작성해보세요.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-item">
              <div className="post-header">
                <div className="post-author">
                  <div className="author-avatar">👤</div>
                  <div className="author-info">
                    <div className="author-name">{post.author}</div>
                    <div className="post-time">{formatTimestamp(post.timestamp)}</div>
                  </div>
                </div>
              </div>
              
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





