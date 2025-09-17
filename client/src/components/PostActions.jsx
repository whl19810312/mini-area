import React, { useState } from 'react';
import '../styles/PostActions.css';

const PostActions = ({ 
  post, 
  currentUser, 
  onEdit, 
  onDelete, 
  onShare, 
  onReport,
  onBookmark 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwnPost = post.authorId === currentUser?.id;

  const handleEdit = () => {
    onEdit(post.id);
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete(post.id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${post.author}님의 게시글`,
        text: post.content.substring(0, 100) + '...',
        url: window.location.href
      });
    } else {
      // 클립보드에 복사
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다!');
    }
    onShare?.(post.id);
    setShowMenu(false);
  };

  const handleReport = () => {
    onReport?.(post.id);
    setShowMenu(false);
  };

  const handleBookmark = () => {
    onBookmark?.(post.id);
    setShowMenu(false);
  };

  return (
    <div className="post-actions-container">
      <button 
        className="post-menu-btn"
        onClick={() => setShowMenu(!showMenu)}
        title="더보기"
      >
        ⋯
      </button>

      {showMenu && (
        <>
          <div 
            className="menu-overlay" 
            onClick={() => setShowMenu(false)}
          />
          <div className="post-actions-menu">
            {isOwnPost ? (
              <>
                <button className="menu-item edit-btn" onClick={handleEdit}>
                  ✏️ 수정하기
                </button>
                <button 
                  className="menu-item delete-btn" 
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ 삭제하기
                </button>
              </>
            ) : (
              <>
                <button className="menu-item" onClick={handleBookmark}>
                  🔖 북마크
                </button>
                <button className="menu-item report-btn" onClick={handleReport}>
                  🚨 신고하기
                </button>
              </>
            )}
            
            <div className="menu-divider" />
            
            <button className="menu-item" onClick={handleShare}>
              🔗 공유하기
            </button>
            
            <button 
              className="menu-item cancel-btn" 
              onClick={() => setShowMenu(false)}
            >
              ❌ 취소
            </button>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <>
          <div 
            className="menu-overlay" 
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="delete-confirm-dialog">
            <div className="dialog-header">
              <h3>게시글 삭제</h3>
            </div>
            <div className="dialog-content">
              <p>정말로 이 게시글을 삭제하시겠습니까?</p>
              <p className="warning-text">삭제된 게시글은 복구할 수 없습니다.</p>
            </div>
            <div className="dialog-actions">
              <button 
                className="cancel-delete-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                취소
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={handleDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PostActions;