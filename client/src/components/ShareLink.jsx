import React from 'react';
import toast from 'react-hot-toast';

const ShareLink = ({ map }) => {
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/join/${map.publicLink}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('방 링크가 클립보드에 복사되었습니다! 🔗');
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  if (!map || !map.publicLink) {
    return null;
  }

  return (
    <button 
      className="share-link-btn"
      onClick={copyToClipboard}
      title="공개 링크 복사"
    >
      🔗 공유하기
    </button>
  );
};

export default ShareLink;
