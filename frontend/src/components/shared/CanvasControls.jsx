import { Flex, IconButton, Tooltip, Box } from '@chakra-ui/react'
import { FiZoomIn, FiZoomOut, FiMove } from 'react-icons/fi'

export const CanvasControls = ({ scale, setScale, onReset, ...props }) => {
  return (
    <Flex
      direction="column"
      position="absolute"
      bottom={4}
      right={4}
      gap={2}
      bg="white"
      p={2}
      borderRadius="md"
      boxShadow="lg"
      zIndex={10}
      {...props}
    >
      <Tooltip label="Zoom In" placement="left">
        <IconButton
          icon={<FiZoomIn />}
          onClick={() => setScale(prev => Math.min(3, prev + 0.1))}
          aria-label="Zoom In"
          size="sm"
        />
      </Tooltip>
      <Tooltip label="Zoom Out" placement="left">
        <IconButton
          icon={<FiZoomOut />}
          onClick={() => setScale(prev => Math.max(0.1, prev - 0.1))}
          aria-label="Zoom Out"
          size="sm"
        />
      </Tooltip>
      <Tooltip label="Reset View" placement="left">
        <IconButton
          icon={<FiMove />}
          onClick={onReset}
          aria-label="Reset View"
          size="sm"
        />
      </Tooltip>
      <Box textAlign="center" fontSize="xs" fontWeight="bold">
        {Math.round(scale * 100)}%
      </Box>
    </Flex>
  )
}

export default CanvasControls
