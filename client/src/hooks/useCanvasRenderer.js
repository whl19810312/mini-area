import { useEffect, useRef } from 'react';
import { getPrivateAreaColor } from '../utils/privateAreaUtils';

// 레이어 투명도 설정
const DEFAULT_LAYER_OPACITY = {
  background: 0.3,    // 레이어 1 (가장 아래)
  walls: 0.7,         // 레이어 2
  privateAreas: 0.5,  // 레이어 3
  spawnPoints: 1.0    // 레이어 4 (가장 위)
};

// 벽 렌더링 함수
const renderWalls = (ctx, walls, opacity) => {
  if (!walls || !Array.isArray(walls)) return;
  
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  
  walls.forEach((wall) => {
    const x1 = wall.start?.x || wall.x1 || 0;
    const y1 = wall.start?.y || wall.y1 || 0;
    const x2 = wall.end?.x || wall.x2 || 100;
    const y2 = wall.end?.y || wall.y2 || 100;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  
  ctx.globalAlpha = 1.0;
};

// 시작점 렌더링 함수
const renderSpawnPoints = (ctx, spawnPoints, opacity) => {
  if (!spawnPoints || !Array.isArray(spawnPoints)) return;
  
  ctx.globalAlpha = opacity;
  
  spawnPoints.forEach((spawnPoint) => {
    const x = spawnPoint.x;
    const y = spawnPoint.y;
    
    // 핀의 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 2, 8, 4, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // 핀의 막대 (회색)
    ctx.fillStyle = '#666666';
    ctx.fillRect(x - 2, y, 4, 25);
    
    // 핀의 막대 테두리 (진한 회색)
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y, 4, 25);
    
    // 붉은 구슬 (핀 끝)
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    // 붉은 구슬 테두리 (진한 붉은색)
    ctx.strokeStyle = '#CC2222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 구슬 내부 하이라이트
    ctx.fillStyle = '#FF6666';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // 텍스트 배경
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px Arial';
    const textWidth = ctx.measureText(spawnPoint.name || '시작점').width;
    ctx.fillRect(x - textWidth/2 - 5, y + 35, textWidth + 10, 18);
    
    // 텍스트
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.fillText(spawnPoint.name || '시작점', x, y + 47);
  });
  
  ctx.globalAlpha = 1.0;
};

// 프라이빗 영역 렌더링 함수
const renderPrivateAreas = (ctx, privateAreas, opacity) => {
  if (!privateAreas || !Array.isArray(privateAreas)) return;
  
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 2;
  
  privateAreas.forEach((area, index) => {
    const x = area.position?.x || area.x1 || area.x || 0;
    const y = area.position?.y || area.y1 || area.y || 0;
    const width = area.size?.width || (area.x2 - area.x1) || 100;
    const height = area.size?.height || (area.y2 - area.y1) || 100;
    
    // 프라이빗 영역별 무지개 색상 적용
    const color = getPrivateAreaColor(index);
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // 영역 번호와 색상명 표시
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const labelText = `영역 ${index + 1}`;
    const colorText = color.name;
    
    // 텍스트 배경
    const textWidth = Math.max(ctx.measureText(labelText).width, ctx.measureText(colorText).width);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(centerX - textWidth/2 - 5, centerY - 15, textWidth + 10, 30);
    
    // 텍스트 그리기
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(labelText, centerX, centerY - 7);
    ctx.font = '12px Arial';
    ctx.fillText(colorText, centerX, centerY + 7);
  });
  
  ctx.globalAlpha = 1.0;
};

// 임시 그리기 요소 렌더링
const renderTemporaryElements = (ctx, isDrawing, drawStart, drawEnd, selectedTool) => {
  if (!isDrawing || !drawStart || !drawEnd) return;
  
  if (selectedTool === 'wall') {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(drawStart.x, drawStart.y);
    ctx.lineTo(drawEnd.x, drawEnd.y);
    ctx.stroke();
  } else if (selectedTool === 'private') {
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)';
    ctx.lineWidth = 2;
    const width = drawEnd.x - drawStart.x;
    const height = drawEnd.y - drawStart.y;
    ctx.fillRect(drawStart.x, drawStart.y, width, height);
    ctx.strokeRect(drawStart.x, drawStart.y, width, height);
  }
};

// 메인 렌더링 함수
const renderLayers = (ctx, mapData, layerOpacity, isDrawing, drawStart, drawEnd, selectedTool) => {
  const canvasWidth = mapData.size?.width || 1000;
  const canvasHeight = mapData.size?.height || 800;
  
  // 캔버스 크기 설정
  ctx.canvas.width = canvasWidth;
  ctx.canvas.height = canvasHeight;
  
  // 캔버스 클리어
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // 배경 이미지 렌더링
  if (mapData.backgroundImage) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      renderOtherLayers(ctx, mapData, layerOpacity, isDrawing, drawStart, drawEnd, selectedTool);
    };
    img.onerror = () => {
      renderOtherLayers(ctx, mapData, layerOpacity, isDrawing, drawStart, drawEnd, selectedTool);
    };
    img.src = mapData.backgroundImage;
  } else {
    renderOtherLayers(ctx, mapData, layerOpacity, isDrawing, drawStart, drawEnd, selectedTool);
  }
};

// 다른 레이어들 렌더링
const renderOtherLayers = (ctx, mapData, layerOpacity, isDrawing, drawStart, drawEnd, selectedTool) => {
  // 레이어 2: 벽 + 시작점
  renderWalls(ctx, mapData.walls, layerOpacity.walls);
  renderSpawnPoints(ctx, mapData.spawnPoints, layerOpacity.spawnPoints);
  
  // 레이어 3: 프라이빗 영역
  renderPrivateAreas(ctx, mapData.privateAreas, layerOpacity.privateAreas);
  
  // 임시 그리기 요소
  renderTemporaryElements(ctx, isDrawing, drawStart, drawEnd, selectedTool);
};

export const useCanvasRenderer = () => {
  const canvasRef = useRef(null);
  
  const renderCanvas = (mapData, layerOpacity = DEFAULT_LAYER_OPACITY, isDrawing = false, drawStart = null, drawEnd = null, selectedTool = 'select') => {
    if (!canvasRef.current || !mapData) return;
    
    const ctx = canvasRef.current.getContext('2d');
    renderLayers(ctx, mapData, layerOpacity, isDrawing, drawStart, drawEnd, selectedTool);
  };
  
  return {
    canvasRef,
    renderCanvas
  };
};


