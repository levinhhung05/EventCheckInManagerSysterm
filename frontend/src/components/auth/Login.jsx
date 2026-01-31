import { useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
  Link,
  Badge,
  HStack,
  Tooltip,
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon, CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../services/api'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking') // checking, connected, disconnected

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await authAPI.health()
        setBackendStatus('connected')
      } catch (err) {
        console.error('Backend health check failed:', err)
        setBackendStatus('disconnected')
      }
    }
    checkHealth()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const result = await login({ email, password })

    if (result.success) {
      // Redirect based on role
      if (result.user.role === 'staff') {
        navigate('/staff')
      } else {
        navigate('/admin')
      }
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }

  return (
    <Box
      minH="100vh"
      bg={useColorModeValue('gray.50', 'gray.800')}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
        <Stack spacing="8">
          <Stack spacing="6" align="center">
            <Heading size="xl">Event Check-in System</Heading>
            <Text color="gray.600">Sign in to your account</Text>
          </Stack>

          <Box
            py={{ base: '0', sm: '8' }}
            px={{ base: '4', sm: '10' }}
            bg={useColorModeValue('white', 'gray.700')}
            boxShadow={{ base: 'none', sm: 'xl' }}
            borderRadius={{ base: 'none', sm: 'xl' }}
          >
            <form onSubmit={handleSubmit}>
              <Stack spacing="6">
                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}

                <FormControl isRequired>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <InputGroup>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Box display="flex" justifyContent="flex-end">
                  <Link as={RouterLink} to="/forgot-password" color="brand.500" fontSize="sm">
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  fontSize="md"
                  isLoading={isLoading}
                  loadingText="Signing in..."
                >
                  Sign in
                </Button>
                
                <Button
                  variant="outline"
                  colorScheme="gray"
                  size="lg"
                  fontSize="md"
                  onClick={async () => {
                    const loginDemo = useAuthStore.getState().loginDemo
                    await loginDemo()
                    navigate('/admin')
                  }}
                >
                  Enter Demo Mode (No Backend)
                </Button>

                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Default credentials: admin@example.com / admin123
                </Text>

                <HStack justify="center" spacing={2}>
                  <Text fontSize="xs" color="gray.500">Backend Status:</Text>
                  {backendStatus === 'checking' && <Badge colorScheme="yellow">Checking...</Badge>}
                  {backendStatus === 'connected' && (
                    <Tooltip label="Connected to Backend API">
                      <Badge colorScheme="green" display="flex" alignItems="center">
                        <CheckCircleIcon mr={1} boxSize={3} /> Connected
                      </Badge>
                    </Tooltip>
                  )}
                  {backendStatus === 'disconnected' && (
                    <Tooltip label="Cannot connect to Backend API. Check if server is running on port 8000.">
                      <Badge colorScheme="red" display="flex" alignItems="center">
                        <WarningIcon mr={1} boxSize={3} /> Disconnected
                      </Badge>
                    </Tooltip>
                  )}
                </HStack>
              </Stack>
            </form>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
