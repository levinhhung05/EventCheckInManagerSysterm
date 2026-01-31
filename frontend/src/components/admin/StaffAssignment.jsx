import { useParams } from 'react-router-dom'
import {
  Box,
  Heading,
  Card,
  CardHeader,
  CardBody,
  VStack,
  HStack,
  Text,
  Switch,
  Avatar,
  useToast,
  Spinner
} from '@chakra-ui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsAPI, getErrorMessage } from '../../services/api'
import { FiUsers } from 'react-icons/fi'

export default function StaffAssignment({ eventId: propEventId }) {
  const { eventId: paramEventId } = useParams()
  const eventId = propEventId || paramEventId
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['event-staff', eventId],
    queryFn: async () => {
      const response = await eventsAPI.getStaff(eventId)
      return response.data
    },
  })

  const assignMutation = useMutation({
    mutationFn: (data) => eventsAPI.assignStaff(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-staff', eventId])
      toast({
        title: 'Staff assignment updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update assignment',
        description: getErrorMessage(error),
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  })

  const handleToggle = (userId, currentStatus) => {
    assignMutation.mutate({
      user_id: userId,
      assigned: !currentStatus
    })
  }

  // Check if user is assigned to this event
  const isAssigned = (user) => {
    return user.assigned_events?.includes(eventId)
  }

  if (isLoading) {
    return (
        <Card height="100%">
            <CardBody display="flex" justifyContent="center" alignItems="center">
                <Spinner />
            </CardBody>
        </Card>
    )
  }

  return (
    <Card height="100%">
      <CardHeader pb={0}>
        <HStack>
            <Box p={2} bg="purple.100" borderRadius="md" color="purple.600">
                <FiUsers size={20} />
            </Box>
            <Heading size="md">Staff Access</Heading>
        </HStack>
      </CardHeader>
      <CardBody>
        <Text fontSize="sm" color="gray.500" mb={4}>
          Manage which staff members can access and check in guests for this event.
        </Text>
        
        {staffMembers.length === 0 ? (
            <Text color="gray.500">No staff members found in the system.</Text>
        ) : (
            <VStack spacing={4} align="stretch">
            {staffMembers.map((staff) => (
                <HStack key={staff.id} justify="space-between" p={2} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                <HStack>
                    <Avatar size="sm" name={staff.full_name} />
                    <Box>
                        <Text fontWeight="medium">{staff.full_name}</Text>
                        <Text fontSize="xs" color="gray.500">{staff.email}</Text>
                    </Box>
                </HStack>
                <Switch 
                    isChecked={isAssigned(staff)}
                    onChange={() => handleToggle(staff.id, isAssigned(staff))}
                    colorScheme="purple"
                    isDisabled={assignMutation.isPending}
                />
                </HStack>
            ))}
            </VStack>
        )}
      </CardBody>
    </Card>
  )
}
