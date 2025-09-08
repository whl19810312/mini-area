import React from 'react';

const PermissionDialog = ({ isVisible, onAccept, onDecline, currentArea }) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        textAlign: 'center',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>
          {currentArea?.type === 'private' ? '프라이빗 영역 화상통화' : '화상통화'}
        </h3>
        <p style={{ marginBottom: '15px', color: '#666', lineHeight: '1.5' }}>
          {currentArea?.type === 'private' 
            ? '프라이빗 영역에서 다른 사용자들과 화상통화를 하시겠습니까?'
            : '다른 사용자들과 화상통화를 하시겠습니까?'
          }
        </p>
        <div style={{ 
          marginBottom: '25px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <p style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px', fontWeight: 'bold' }}>
            📋 권한 요청 안내
          </p>
          <p style={{ margin: '0', color: '#6c757d', fontSize: '13px', lineHeight: '1.4' }}>
            • "허용" 버튼을 클릭하면 브라우저에서 카메라와 마이크 권한을 요청합니다<br/>
            • 권한 요청 창이 나타나면 "허용"을 선택해주세요<br/>
            • 권한을 거부하면 화상통화를 사용할 수 없습니다<br/>
            • 권한은 방을 나갈 때까지 유지됩니다
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={onAccept}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
          >
            📹 권한 허용
          </button>
          <button
            onClick={onDecline}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#da190b'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f44336'}
          >
            ❌ 거절
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDialog;
