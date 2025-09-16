import React, { useState, useEffect, useRef } from 'react';

const MetaverseViewport = ({ 
  children, 
  mapImage, 
  sceneSize, 
  onSceneClick,
  backgroundLoaded,
  setBackgroundLoaded 
}) => {
  // 줌 및 패닝 상태
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasDraggedEnough, setHasDraggedEnough] = useState(false);

  const viewportRef = useRef(null);
  const sceneContainerRef = useRef(null);

  // 줌 이벤트 핸들러
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.2, zoomScale * scaleFactor), 3);

    if (newScale !== zoomScale) {
      const scaleRatio = newScale / zoomScale;
      
      setPanOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio
      }));
      
      setZoomScale(newScale);
    }
  };

  // 마우스 드래그 이벤트
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart(panOffset);
    setHasDraggedEnough(false);
    
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dragDistance > 5) {
      setHasDraggedEnough(true);
    }
    
    setPanOffset({
      x: panStart.x + deltaX,
      y: panStart.y + deltaY
    });
  };

  const handleMouseUp = (e) => {
    const wasClick = !hasDraggedEnough;
    
    setIsDragging(false);
    setHasDraggedEnough(false);
    
    if (wasClick && onSceneClick) {
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panOffset.x) / zoomScale;
        const y = (e.clientY - rect.top - panOffset.y) / zoomScale;
        onSceneClick({ x, y });
      }
    }
  };

  // 글로벌 마우스 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => handleMouseMove(e);
      const handleGlobalMouseUp = (e) => handleMouseUp(e);
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, panStart, panOffset, zoomScale, hasDraggedEnough]);

  // 더블클릭으로 줌 리셋
  const handleDoubleClick = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setPanStart(panOffset);
      setHasDraggedEnough(false);
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dragDistance > 5) {
      setHasDraggedEnough(true);
    }
    
    setPanOffset({
      x: panStart.x + deltaX,
      y: panStart.y + deltaY
    });
    
    e.preventDefault();
  };

  const handleTouchEnd = (e) => {
    const wasClick = !hasDraggedEnough;
    
    setIsDragging(false);
    setHasDraggedEnough(false);
    
    if (wasClick && onSceneClick && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (touch.clientX - rect.left - panOffset.x) / zoomScale;
        const y = (touch.clientY - rect.top - panOffset.y) / zoomScale;
        console.log(`👆 터치 클릭: (${x}, ${y})`);
        onSceneClick({ x, y });
      }
    }
    
    e.preventDefault();
  };

  return (
    <div 
      className="metaverse-viewport"
      ref={viewportRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'visible', // 캐릭터 머리와 이름표가 잘리지 않도록 변경
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        touchAction: 'none' // 브라우저의 기본 터치 동작 방지
      }}
    >
      <div 
        ref={sceneContainerRef}
        className="scene-container"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
          transformOrigin: '0 0',
          width: sceneSize.width ? `${sceneSize.width + 100}px` : 'calc(100vw + 100px)', // 좌우 50px씩 여백 추가
          height: sceneSize.height ? `${sceneSize.height + 100}px` : 'calc(100vh - 60px + 100px)', // 상하 50px씩 여백 추가
          minWidth: 'calc(100vw + 100px)',
          minHeight: 'calc(100vh - 60px + 100px)',
          position: 'relative',
          backgroundImage: mapImage ? `url(${mapImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a1a1a',
          padding: '50px' // 모든 방향에 50px 패딩 추가
        }}
        onLoad={() => setBackgroundLoaded(true)}
      >
        {children}
      </div>
    </div>
  );
};

export default MetaverseViewport;