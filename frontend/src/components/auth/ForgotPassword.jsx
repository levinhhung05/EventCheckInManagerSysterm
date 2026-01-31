import { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Container,
  Heading,
  Link,
} from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { authAPI, getErrorMessage } from '../../services/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await authAPI.forgotPassword(email)
      setIsSubmitted(true)
      toast({
        title: 'Reset link sent',
        description: 'If an account exists with this email, you will receive a password reset link.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxW="container.sm" py={20}>
      <Box
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        maxW="md"
        mx="auto"
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading size="lg" mb={2}>Forgot Password</Heading>
            <Text color="gray.600">
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </Box>

          {isSubmitted ? (
            <VStack spacing={4}>
              <Text color="green.500" fontWeight="medium" textAlign="center">
                Check your email for the reset link.
              </Text>
              <Button as={RouterLink} to="/login" colorScheme="brand" width="full">
                Back to Login
              </Button>
            </VStack>
          ) : (
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="brand"
                  width="full"
                  isLoading={isLoading}
                  loadingText="Sending..."
                >
                  Send Reset Link
                </Button>

                <Link as={RouterLink} to="/login" color="brand.500" fontSize="sm" alignSelf="center">
                  Back to Login
                </Link>
              </VStack>
            </form>
          )}
        </VStack>
      </Box>
    </Container>
  )
}

export default ForgotPassword
