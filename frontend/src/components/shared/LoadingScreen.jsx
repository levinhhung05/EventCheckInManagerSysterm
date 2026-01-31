import { Box, Spinner, Text, VStack } from '@chakra-ui/react'

export default function LoadingScreen() {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <VStack spacing={4}>
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text color="gray.600">Loading...</Text>
      </VStack>
    </Box>
  )
}
