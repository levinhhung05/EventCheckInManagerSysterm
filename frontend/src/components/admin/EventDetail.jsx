import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Heading,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Icon,
  Text,
  Badge,
  Divider,
} from '@chakra-ui/react'
import { FiLayout, FiUsers, FiBarChart2, FiArrowLeft } from 'react-icons/fi'
import { format } from 'date-fns'
import { eventsAPI, reportsAPI } from '../../services/api'
import StaffAssignment from './StaffAssignment'

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await eventsAPI.get(eventId)
      return response.data
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['attendance-report', eventId],
    queryFn: async () => {
      const response = await reportsAPI.attendance(eventId)
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (eventLoading) {
    return <Box>Loading...</Box>
  }

  return (
    <Box>
      <Button
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        mb={4}
        onClick={() => navigate('/admin/events')}
      >
        Back to Events
      </Button>

      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={2}>
            {event?.name}
          </Heading>
          <Text color="gray.600">
            {event?.date && format(new Date(event.date), 'PPP p')}
          </Text>
          <Text color="gray.600" mt={1}>
            📍 {event?.location}
          </Text>
        </Box>
        <Badge colorScheme={event?.status === 'active' ? 'green' : 'gray'} fontSize="md" p={2}>
          {event?.status}
        </Badge>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Guests</StatLabel>
              <StatNumber>{summary?.total_guests || 0}</StatNumber>
              <StatHelpText>{summary?.assigned_seats || 0} assigned seats</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Checked In</StatLabel>
              <StatNumber color="green.500">{summary?.checked_in_count || 0}</StatNumber>
              <StatHelpText>{summary?.attendance_percentage || 0}% attendance</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Checked Out</StatLabel>
              <StatNumber color="orange.500">
                {summary?.checked_out_count || 0}
              </StatNumber>
              <StatHelpText>Departed guests</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending</StatLabel>
              <StatNumber color="gray.500">
                {summary?.pending_count ?? ((summary?.total_guests || 0) - (summary?.checked_in_count || 0))}
              </StatNumber>
              <StatHelpText>Not yet checked in</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card
          cursor="pointer"
          _hover={{ shadow: 'md' }}
          onClick={() => navigate(`/admin/events/${eventId}/layout`)}
        >
          <CardBody>
            <Flex align="center" mb={4}>
              <Box p={2} bg="blue.100" borderRadius="md" color="blue.600" mr={4}>
                <FiLayout size={24} />
              </Box>
              <Box>
                <Heading size="md">Layout</Heading>
                <Text color="gray.500" mt={1}>
                  Design seating arrangement and assign guests to tables
                </Text>
              </Box>
            </Flex>
            <Text fontSize="sm" color="gray.600">
              {summary?.total_tables || 0} tables · {summary?.total_seats || 0} seats
            </Text>
          </CardBody>
        </Card>

        <Card
          cursor="pointer"
          _hover={{ shadow: 'md' }}
          onClick={() => navigate(`/admin/events/${eventId}/guests`)}
        >
          <CardBody>
            <Flex align="center" mb={4}>
              <Box p={2} bg="green.100" borderRadius="md" color="green.600" mr={4}>
                <FiUsers size={24} />
              </Box>
              <Box>
                <Heading size="md">Guests</Heading>
                <Text color="gray.500" mt={1}>
                  Manage guest list, import/export, and assignments
                </Text>
              </Box>
            </Flex>
            <Text fontSize="sm" color="gray.600">
              {summary?.total_guests || 0} guests · {summary?.checked_in_count || 0} checked in
            </Text>
          </CardBody>
        </Card>

        <Card
          cursor="pointer"
          _hover={{ shadow: 'md' }}
          onClick={() => navigate(`/admin/events/${eventId}/reports`)}
        >
          <CardBody>
            <Flex align="center" mb={4}>
              <Box p={2} bg="orange.100" borderRadius="md" color="orange.600" mr={4}>
                <FiBarChart2 size={24} />
              </Box>
              <Box>
                <Heading size="md">Reports</Heading>
                <Text color="gray.500" mt={1}>
                  View attendance reports and export data
                </Text>
              </Box>
            </Flex>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Real-time statistics and exports
            </Text>
          </CardBody>
        </Card>

        <StaffAssignment eventId={eventId} />
      </SimpleGrid>
    </Box>
  )
}
