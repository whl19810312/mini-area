import { Box } from '@react-three/drei'
import { getPrivateAreaColor } from '../utils/privateAreaUtils'

const PrivateArea = ({ area }) => {
  const { position, size, rotation, type, currentOccupants, maxOccupants, areaNumber } = area

  // 영역 번호에 따른 색상 결정 (1=빨강, 2=주황, 3=노랑, 4=초록, 5=파랑, 6=남색, 7=보라, 8이상=랜덤색)
  const getAreaColor = (areaNumber) => {
    const colorInfo = getPrivateAreaColor(areaNumber || 1)
    return colorInfo.fill.replace('0.3', '1.0') // 투명도 제거하여 solid 색상으로 변경
  }

  // 사용률에 따른 투명도 결정
  const getAreaOpacity = () => {
    const occupancyRate = currentOccupants?.length / maxOccupants || 0
    return 0.3 + (occupancyRate * 0.4) // 30% ~ 70%
  }

  return (
    <Box
      position={[position?.x || 0, position?.y || 0, position?.z || 0]}
      args={[
        size?.width || 5,
        size?.height || 10,
        size?.depth || 5
      ]}
      rotation={[
        rotation?.x || 0,
        rotation?.y || 0,
        rotation?.z || 0
      ]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial 
        color={getAreaColor(areaNumber)}
        transparent
        opacity={getAreaOpacity()}
      />
    </Box>
  )
}

export default PrivateArea 