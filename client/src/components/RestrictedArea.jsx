import { Box } from '@react-three/drei'

const RestrictedArea = ({ area }) => {
  const { position, size, rotation, type, reason } = area

  // 영역 타입에 따른 색상 결정
  const getAreaColor = (type) => {
    switch (type) {
      case 'wall':
        return '#8B4513'
      case 'water':
        return '#4169E1'
      case 'cliff':
        return '#696969'
      case 'building':
        return '#A0522D'
      default:
        return '#FF6347'
    }
  }

  // 영역 타입에 따른 투명도 결정
  const getAreaOpacity = (type) => {
    switch (type) {
      case 'water':
        return 0.6
      case 'cliff':
        return 0.8
      default:
        return 0.9
    }
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
        opacity={getAreaOpacity(type)}
      />
    </Box>
  )
}

export default RestrictedArea 