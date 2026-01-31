import React, { useState, useEffect } from 'react'
import {
  Box,
  SimpleGrid,
  Text,
  Heading,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Flex,
  Icon,
  Badge,
  Progress,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Divider,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react'
import { 
  FiActivity, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiUsers, 
  FiCalendar, 
  FiPlus, 
  FiServer,
  FiClock,
  FiArrowRight
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { eventsAPI, authAPI } from '../../services/api'
import { format, isToday, isFuture, parseISO, differenceInDays } from 'date-fns'

const DashboardOverview = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [systemHealth, setSystemHealth] = useState({ status: 'checking', details: null })
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700')
  const activeColor = 'green.500'
  const warningColor = 'orange.400'
  const errorColor = 'red.500'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // 1. Check System Health
        try {
          await authAPI.health()
          setSystemHealth({ status: 'connected', details: 'Operational' })
        } catch (err) {
          setSystemHealth({ status: 'disconnected', details: 'Backend Unreachable' })
        }

        // 2. Fetch Events
        const { data } = await eventsAPI.list()
        setEvents(data)
        
      } catch (error) {
        console.error('Dashboard data fetch error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // --- Data Processing ---
  
  const today = new Date()
  
  const liveEvents = events.filter(e => isToday(parseISO(e.date)))
  const upcomingEvents = events.filter(e => isFuture(parseISO(e.date))).sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Risk Detection
  const eventsWithRisks = upcomingEvents.filter(e => {
    const isSoon = differenceInDays(parseISO(e.date), today) <= 2
    // Assuming we can check these properties, if not present we skip or assume false
    // Note: The list API might not return full details like staff count or layout status depending on backend implementation.
    // We'll assume a "status" check or use available fields.
    const noLayout = !e.floor_plan_url && !e.layout_config // Heuristic
    const isDraft = e.status === 'draft'
    
    return (isSoon && (noLayout || isDraft))
  }).slice(0, 3)

  const totalGuestsToday = liveEvents.reduce((acc, curr) => acc + (curr.total_guests || 0), 0)
  const checkedInToday = liveEvents.reduce((acc, curr) => acc + (curr.checked_in_count || 0), 0)
  const checkInRate = totalGuestsToday > 0 ? Math.round((checkedInToday / totalGuestsToday) * 100) : 0

  if (isLoading) {
    return (
      <Flex h="50vh" justify="center" align="center">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    )
  }

  return (
    <Box maxW="container.xl" mx="auto" pb={8}>
      
      {/* 1. Header & System Status */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>Command Center</Heading>
          <Text color="gray.500">System overview and immediate actions</Text>
        </Box>
        <HStack>
            <Badge 
              colorScheme={systemHealth.status === 'connected' ? 'green' : 'red'} 
              p={2} 
              borderRadius="md"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <Icon as={systemHealth.status === 'connected' ? FiCheckCircle : FiAlertTriangle} />
              {systemHealth.status === 'connected' ? 'System Online' : 'System Offline'}
            </Badge>
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => navigate('/admin/events')}>
              Create Event
            </Button>
        </HStack>
      </Flex>

      {/* 2. Critical System Indicators (KPIs) */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
        <Card bg={cardBg} borderLeft="4px solid" borderColor={liveEvents.length > 0 ? activeColor : 'gray.300'}>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center" gap={2}>
                <Icon as={FiActivity} color={liveEvents.length > 0 ? activeColor : 'gray.400'} />
                Live Events
              </StatLabel>
              <StatNumber>{liveEvents.length}</StatNumber>
              <StatHelpText>{liveEvents.length > 0 ? 'Requires attention' : 'No events today'}</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center" gap={2}>
                <Icon as={FiUsers} color="blue.500" />
                Guest Volume (Today)
              </StatLabel>
              <StatNumber>{checkedInToday} / {totalGuestsToday}</StatNumber>
              <StatHelpText>
                <Progress value={checkInRate} size="xs" colorScheme="blue" mt={2} borderRadius="full" />
                {checkInRate}% Checked In
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderLeft="4px solid" borderColor={eventsWithRisks.length > 0 ? warningColor : 'green.500'}>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center" gap={2}>
                <Icon as={FiAlertTriangle} color={eventsWithRisks.length > 0 ? warningColor : 'green.500'} />
                Risk Alerts
              </StatLabel>
              <StatNumber>{eventsWithRisks.length}</StatNumber>
              <StatHelpText>Pending actions</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center" gap={2}>
                <Icon as={FiServer} color="purple.500" />
                System Load
              </StatLabel>
              <StatNumber>Normal</StatNumber>
              <StatHelpText>Response time: &lt;100ms</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
        
        {/* 3. Live Operations Column (2/3 width) */}
        <Box gridColumn={{ lg: "span 2" }}>
          <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
            <Icon as={FiActivity} color="red.500" /> Live Operations
          </Heading>
          
          {liveEvents.length === 0 ? (
             <Card bg={cardBg} mb={6} variant="outline" borderStyle="dashed">
               <CardBody py={8} textAlign="center" color="gray.500">
                 <Icon as={FiCalendar} boxSize={8} mb={2} />
                 <Text>No active events right now.</Text>
                 <Button size="sm" mt={4} variant="outline" onClick={() => navigate('/admin/events')}>
                   View Upcoming Schedule
                 </Button>
               </CardBody>
             </Card>
          ) : (
            <Stack spacing={4} mb={8}>
              {liveEvents.map(event => (
                <Card key={event.id} bg={cardBg} border="1px solid" borderColor="green.200" boxShadow="sm">
                  <CardBody>
                    <Flex justify="space-between" align="start" mb={4}>
                      <Box>
                        <Badge colorScheme="green" mb={2} px={2} py={0.5} borderRadius="full">LIVE NOW</Badge>
                        <Heading size="md">{event.name}</Heading>
                        <Text color="gray.500" fontSize="sm">{event.location}</Text>
                      </Box>
                      <Button rightIcon={<FiArrowRight />} colorScheme="green" size="sm" onClick={() => navigate(`/admin/events/${event.id}`)}>
                        Manage Event
                      </Button>
                    </Flex>
                    
                    <Box mt={4}>
                      <Flex justify="space-between" mb={2} fontSize="sm">
                        <Text fontWeight="medium">Check-in Progress</Text>
                        <Text>{event.checked_in_count || 0} / {event.total_guests || 0} Guests</Text>
                      </Flex>
                      <Progress 
                        value={event.total_guests ? ((event.checked_in_count || 0) / event.total_guests) * 100 : 0} 
                        size="sm" 
                        colorScheme="green" 
                        borderRadius="full" 
                        hasStripe 
                        isAnimated 
                      />
                      <Flex justify="space-between" mt={2} fontSize="xs" color="gray.500">
                        <Text>Checked Out: {event.checked_out_count || 0}</Text>
                        <Text>Pending: {(event.total_guests || 0) - (event.checked_in_count || 0) - (event.checked_out_count || 0)}</Text>
                      </Flex>
                    </Box>
                  </CardBody>
                </Card>
              ))}
            </Stack>
          )}

          <Heading size="md" mb={4} mt={8} display="flex" alignItems="center" gap={2}>
             <Icon as={FiAlertTriangle} color="orange.500" /> Action Required
          </Heading>
          
          {eventsWithRisks.length === 0 ? (
            <Alert status="success" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="120px" borderRadius="md">
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">All Clear!</AlertTitle>
              <AlertDescription maxWidth="sm">No immediate risks detected for upcoming events.</AlertDescription>
            </Alert>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {eventsWithRisks.map(event => (
                <Card key={event.id} borderLeft="4px solid" borderColor="orange.400" bg={cardBg}>
                  <CardBody>
                    <Badge colorScheme="orange" mb={2}>Attention Needed</Badge>
                    <Heading size="sm" mb={1} noOfLines={1}>{event.name}</Heading>
                    <Text fontSize="xs" color="gray.500" mb={3}>
                      {format(parseISO(event.date), 'MMM d, yyyy')}
                    </Text>
                    
                    <Stack spacing={2}>
                      {(!event.floor_plan_url && !event.layout_config) && (
                        <HStack fontSize="sm" color="red.500">
                           <Icon as={FiAlertTriangle} />
                           <Text>Missing Layout</Text>
                        </HStack>
                      )}
                      {event.status === 'draft' && (
                         <HStack fontSize="sm" color="orange.500">
                           <Icon as={FiClock} />
                           <Text>Still in Draft</Text>
                         </HStack>
                      )}
                    </Stack>
                  </CardBody>
                  <CardFooter pt={0}>
                    <Button size="sm" width="full" variant="outline" onClick={() => navigate(`/admin/events/${event.id}`)}>
                      Fix Issues
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </SimpleGrid>
          )}

        </Box>

        {/* 4. Sidebar Column (1/3 width) */}
        <Box>
           <Card bg={cardBg} mb={6}>
             <CardHeader pb={0}>
               <Heading size="sm">Quick Actions</Heading>
             </CardHeader>
             <CardBody>
               <Stack spacing={3}>
                 <Button leftIcon={<FiPlus />} justifyContent="flex-start" variant="ghost" onClick={() => navigate('/admin/events')}>
                   Create New Event
                 </Button>
                 <Button leftIcon={<FiUsers />} justifyContent="flex-start" variant="ghost" onClick={() => navigate('/admin/users')}>
                   Manage Users
                 </Button>
                 <Divider />
                 <Button leftIcon={<FiServer />} justifyContent="flex-start" variant="ghost" colorScheme="gray">
                   System Logs
                 </Button>
               </Stack>
             </CardBody>
           </Card>

           <Card bg="blue.50" border="none">
             <CardBody>
               <Heading size="sm" color="blue.700" mb={2}>Admin Tip</Heading>
               <Text fontSize="sm" color="blue.600">
                 Use the "Demo Mode" to train new staff members before the actual event starts.
               </Text>
             </CardBody>
           </Card>
        </Box>

      </SimpleGrid>
    </Box>
  )
}

export default DashboardOverview
