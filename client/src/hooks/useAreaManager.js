import { useState, useEffect, useRef, useCallback } from 'react';

export const useAreaManager = (userPosition, currentMap, onAreaChange) => {
  const [currentArea, setCurrentArea] = useState({ type: 'public', name: 'Public Area' });
  const areaChangeDebounceRef = useRef(null);

  const checkIfInArea = (position, area) => {
    const charSize = { width: 64, height: 64 }; 
    const charLeft = position.x;
    const charRight = position.x + charSize.width;
    const charTop = position.y;
    const charBottom = position.y + charSize.height;

    const areaLeft = area.x;
    const areaRight = area.x + area.width;
    const areaTop = area.y;
    const areaBottom = area.y + area.height;

    return (
      charRight > areaLeft &&
      charLeft < areaRight &&
      charBottom > areaTop &&
      charTop < areaBottom
    );
  };

  const checkCurrentArea = useCallback(() => {
    if (!currentMap || !currentMap.areas) return;

    let newArea = { type: 'public', name: 'Public Area' };
    for (const area of currentMap.areas) {
      if (checkIfInArea(userPosition, area)) {
        newArea = { type: area.type, name: area.name };
        break;
      }
    }

    if (newArea.name !== currentArea.name) {
      if (areaChangeDebounceRef.current) {
        clearTimeout(areaChangeDebounceRef.current);
      }
      areaChangeDebounceRef.current = setTimeout(() => {
        setCurrentArea(newArea);
        if (onAreaChange) {
          onAreaChange(newArea);
        }
      }, 200); // 200ms 디바운스
    }
  }, [userPosition, currentMap, currentArea.name, onAreaChange]);

  useEffect(() => {
    checkCurrentArea();
  }, [checkCurrentArea]);

  return { currentArea };
};
