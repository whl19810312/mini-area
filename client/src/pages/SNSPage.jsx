import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SNSBoard from '../components/SNSBoard';
import '../styles/SNSPage.css';

const SNSPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);

  // 샘플 게시글 데이터
  const samplePosts = [
    {
      id: 1,
      content: '안녕하세요! 미니 에어리어 SNS에 오신 걸 환영합니다! 🎉 #첫게시글 #환영합니다',
      author: 'admin',
      authorId: 'admin',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1시간 전
      likes: 5,
      comments: [
        {
          author: 'user1',
          content: '안녕하세요! 반갑습니다 ^^',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        }
      ],
      hashtags: ['#첫게시글', '#환영합니다'],
      location: {
        mapId: 'lobby',
        mapName: '대기실',
        area: '🌍 공용영역',
        position: { x: 100, y: 100 }
      },
      metaverseActivity: ['📍 🌍 공용영역에서 작성', '👤 관리자 캐릭터로 활동']
    },
    {
      id: 2,
      content: '메타버스에서 새로운 친구들을 만나니까 정말 재밌어요! 다들 어떤 캐릭터 사용하시나요? 🤖 #메타버스모험 #친구만들기',
      author: 'explorer',
      authorId: 'explorer',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2시간 전
      likes: 3,
      comments: [],
      hashtags: ['#메타버스모험', '#친구만들기'],
      location: {
        mapId: 'world1',
        mapName: 'New World',
        area: '🔒 프라이빗 영역 1',
        position: { x: 200, y: 150 }
      },
      metaverseActivity: ['📍 🔒 프라이빗 영역 1에서 작성', '👤 탐험가 캐릭터로 활동']
    }
  ];

  useEffect(() => {
    // 로컬 스토리지에서 게시글 불러오기
    const savedPosts = localStorage.getItem('sns_posts');
    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
    } else {
      setPosts(samplePosts);
      localStorage.setItem('sns_posts', JSON.stringify(samplePosts));
    }
  }, []);

  const handlePostCreate = (newPost) => {
    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    localStorage.setItem('sns_posts', JSON.stringify(updatedPosts));
  };

  const handlePostLike = (postId) => {
    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, likes: post.likes + 1 }
        : post
    );
    setPosts(updatedPosts);
    localStorage.setItem('sns_posts', JSON.stringify(updatedPosts));
  };

  const handlePostComment = (postId, commentContent) => {
    const newComment = {
      author: user?.username || '익명',
      content: commentContent,
      timestamp: new Date().toISOString()
    };

    const updatedPosts = posts.map(post =>
      post.id === postId
        ? { ...post, comments: [...(post.comments || []), newComment] }
        : post
    );
    setPosts(updatedPosts);
    localStorage.setItem('sns_posts', JSON.stringify(updatedPosts));
  };

  return (
    <div className="sns-page">
      <div className="sns-page-header">
        <div className="header-content">
          <h1>🌟 미니 에어리어 SNS</h1>
          <p>메타버스에서의 특별한 순간을 공유하는 공간</p>
        </div>
        <button 
          className="close-page-btn"
          onClick={() => window.close()}
          title="창 닫기"
        >
          ✕
        </button>
      </div>
      
      <SNSBoard
        posts={posts}
        onPostCreate={handlePostCreate}
        onPostLike={handlePostLike}
        onPostComment={handlePostComment}
        currentMap={{ id: 'sns-page', name: 'SNS 페이지' }}
        userPosition={{ x: 0, y: 0 }}
        currentCharacter={{ name: user?.username || '익명' }}
      />
    </div>
  );
};

export default SNSPage;