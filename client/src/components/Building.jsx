import { Box } from '@react-three/drei'

const Building = ({ building }) => {
  const { position, size, type } = building

  // 건물 타입에 따른 색상 결정
  const getBuildingColor = (type) => {
    switch (type) {
      case 'house':
        return '#8B4513'
      case 'shop':
        return '#FFD700'
      case 'office':
        return '#708090'
      case 'landmark':
        return '#FF6347'
      default:
        return '#A9A9A9'
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
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={getBuildingColor(type)} />
    </Box>
  )
}

export default Building 