import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactionButton from './ReactionButton';
import '../styles/CommentSystem.css';

const CommentSystem = ({ comments = [], onCommentAdd, onCommentUpdate, onCommentReaction, postId }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      content: newComment,
      author: user?.username || '익명',
      authorId: user?.id,
      timestamp: new Date().toISOString(),
      reactions: {},
      replies: []
    };

    onCommentAdd(postId, comment);
    setNewComment('');
  };

  const handleAddReply = (parentCommentId) => {
    if (!replyContent.trim()) return;

    const reply = {
      id: Date.now(),
      content: replyContent,
      author: user?.username || '익명',
      authorId: user?.id,
      timestamp: new Date().toISOString(),
      reactions: {},
      parentId: parentCommentId
    };

    onCommentAdd(postId, reply, parentCommentId);
    setReplyContent('');
    setReplyTo(null);
  };

  const handleEditComment = (commentId) => {
    if (!editContent.trim()) return;

    onCommentUpdate(postId, commentId, editContent);
    setEditingComment(null);
    setEditContent('');
  };

  const startEdit = (comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const toggleReplies = (commentId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
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

  const renderComment = (comment, isReply = false) => {
    const isOwnComment = comment.authorId === user?.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedComments.has(comment.id);

    return (
      <div key={comment.id} className={`comment-item ${isReply ? 'reply-comment' : ''}`}>
        <div className="comment-content">
          <div className="comment-header">
            <div className="comment-author-info">
              <div className="comment-avatar">
                {comment.author?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="comment-meta">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-time">{formatTimestamp(comment.timestamp)}</span>
              </div>
            </div>
            
            {isOwnComment && (
              <div className="comment-actions">
                <button
                  className="comment-action-btn"
                  onClick={() => startEdit(comment)}
                  title="댓글 수정"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>

          <div className="comment-body">
            {editingComment === comment.id ? (
              <div className="comment-edit">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="edit-textarea"
                  rows={2}
                />
                <div className="edit-actions">
                  <button
                    className="save-btn"
                    onClick={() => handleEditComment(comment.id)}
                  >
                    저장
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setEditingComment(null)}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="comment-text">{comment.content}</p>
                
                <div className="comment-interactions">
                  <ReactionButton
                    reactions={comment.reactions || {}}
                    currentUserReaction={comment.userReaction}
                    onReactionChange={(_, reaction) => onCommentReaction(postId, comment.id, reaction)}
                    postId={`${postId}-comment-${comment.id}`}
                  />
                  
                  {!isReply && (
                    <button
                      className="reply-btn"
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    >
                      💬 답글
                    </button>
                  )}
                  
                  {hasReplies && (
                    <button
                      className="toggle-replies-btn"
                      onClick={() => toggleReplies(comment.id)}
                    >
                      {isExpanded ? '⬆️' : '⬇️'} 답글 {comment.replies.length}개
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 답글 작성 폼 */}
        {replyTo === comment.id && !isReply && (
          <div className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`${comment.author}님에게 답글...`}
              rows={2}
              className="reply-textarea"
            />
            <div className="reply-actions">
              <button
                className="reply-submit-btn"
                onClick={() => handleAddReply(comment.id)}
                disabled={!replyContent.trim()}
              >
                답글 작성
              </button>
              <button
                className="reply-cancel-btn"
                onClick={() => setReplyTo(null)}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 답글 목록 */}
        {hasReplies && isExpanded && (
          <div className="replies-container">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="comment-system">
      <div className="comments-header">
        <h4>💬 댓글 {comments.length}개</h4>
      </div>

      {/* 새 댓글 작성 */}
      <div className="new-comment">
        <div className="comment-avatar">
          {user?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="comment-input-container">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={2}
            className="comment-textarea"
          />
          <button
            className="comment-submit-btn"
            onClick={handleAddComment}
            disabled={!newComment.trim()}
          >
            댓글 작성
          </button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};

export default CommentSystem;