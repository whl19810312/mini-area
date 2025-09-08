import { Box } from '@react-three/drei'

const PrivateArea = ({ area }) => {
  const { position, size, rotation, type, currentOccupants, maxOccupants } = area

  // 영역 타입에 따른 색상 결정
  const getAreaColor = (type) => {
    switch (type) {
      case 'room':
        return '#32CD32'
      case 'office':
        return '#FFD700'
      case 'meeting':
        return '#9370DB'
      case 'lounge':
        return '#FF69B4'
      default:
        return '#20B2AA'
    }
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
        color={getAreaColor(type)}
        transparent
        opacity={getAreaOpacity()}
      />
    </Box>
  )
}

export default PrivateArea 