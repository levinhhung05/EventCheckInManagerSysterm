import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Text,
  Badge,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
} from '@chakra-ui/react'
import { FiPlus, FiMoreVertical, FiEdit, FiTrash2, FiCopy, FiUsers, FiLayout } from 'react-icons/fi'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { eventsAPI, getErrorMessage } from '../../services/api'
import EventFormModal from './EventFormModal'
import DeleteConfirmDialog from '../shared/DeleteConfirmDialog'
import DuplicateEventDialog from './DuplicateEventDialog'

export default function EventList() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const queryClient = useQueryClient()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isDuplicateOpen, onOpen: onDuplicateOpen, onClose: onDuplicateClose } = useDisclosure()

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventsAPI.list()
      return response.data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (eventId) => eventsAPI.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries(['events'])
      toast.success('Event deleted successfully')
      onDeleteClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleCreate = () => {
    setSelectedEvent(null)
    onFormOpen()
  }

  const handleEdit = (event) => {
    setSelectedEvent(event)
    onFormOpen()
  }

  const handleDelete = (event) => {
    setSelectedEvent(event)
    onDeleteOpen()
  }

  const handleDuplicate = (event) => {
    setSelectedEvent(event)
    onDuplicateOpen()
  }

  const confirmDelete = () => {
    if (selectedEvent) {
      deleteMutation.mutate(selectedEvent.id)
    }
  }

  const handleEventClick = (event) => {
    if (isAdmin) {
      navigate(`/admin/events/${event.id}`)
    } else {
      navigate(`/staff/events/${event.id}/checkin`)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'gray'
      case 'active':
        return 'green'
      case 'archived':
        return 'orange'
      default:
        return 'gray'
    }
  }

  if (isLoading) {
    return <Box>Loading...</Box>
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Events</Heading>
        {isAdmin && (
          <Button
            leftIcon={<FiPlus />}
            colorScheme="brand"
            onClick={handleCreate}
          >
            Create Event
          </Button>
        )}
      </Flex>

      {events.length === 0 ? (
        <Card>
          <CardBody textAlign="center" py={10}>
            <Text color="gray.500" mb={4}>
              No events yet. {isAdmin && "Create your first event to get started."}
            </Text>
            {isAdmin && (
              <Button colorScheme="brand" leftIcon={<FiPlus />} onClick={handleCreate}>
                Create Event
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {events.map((event) => (
            <Card
              key={event.id}
              cursor="pointer"
              _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              onClick={() => handleEventClick(event)}
            >
              <CardHeader>
                <Flex justify="space-between" align="start">
                  <Box flex="1">
                    <Heading size="md" mb={2}>
                      {event.name}
                    </Heading>
                    <Badge colorScheme={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </Box>
                  {isAdmin && (
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList onClick={(e) => e.stopPropagation()}>
                        <MenuItem
                          icon={<FiLayout />}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/events/${event.id}/layout`)
                          }}
                        >
                          Layout
                        </MenuItem>
                        <MenuItem
                          icon={<FiEdit />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(event)
                          }}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem
                          icon={<FiCopy />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(event)
                          }}
                        >
                          Duplicate
                        </MenuItem>
                        <MenuItem
                          icon={<FiUsers />}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/events/${event.id}/guests`)
                          }}
                        >
                          Guests
                        </MenuItem>
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(event)
                          }}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  )}
                </Flex>
              </CardHeader>

              <CardBody pt={0}>
                <Text color="gray.600" fontSize="sm" mb={4}>
                  {format(new Date(event.date), 'PPP')}
                </Text>
                <Text color="gray.600" fontSize="sm" mb={4}>
                  📍 {event.location}
                </Text>

                <SimpleGrid columns={4} spacing={2} mb={4}>
                  <Stat size="sm">
                    <StatLabel>Total</StatLabel>
                    <StatNumber>{event.total_guests}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>In</StatLabel>
                    <StatNumber color="green.500">{event.checked_in_count}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Out</StatLabel>
                    <StatNumber color="red.500">{event.checked_out_count || 0}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Pending</StatLabel>
                    <StatNumber color="gray.500">
                      {event.total_guests - event.checked_in_count - (event.checked_out_count || 0)}
                    </StatNumber>
                  </Stat>
                </SimpleGrid>

                {event.total_guests > 0 && (
                  <Box>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="xs" color="gray.600">
                        Attendance
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {Math.round((event.checked_in_count / event.total_guests) * 100)}%
                      </Text>
                    </Flex>
                    <Progress
                      value={(event.checked_in_count / event.total_guests) * 100}
                      size="sm"
                      colorScheme="green"
                      borderRadius="full"
                    />
                  </Box>
                )}
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <EventFormModal
        isOpen={isFormOpen}
        onClose={onFormClose}
        event={selectedEvent}
      />

      <DuplicateEventDialog
        isOpen={isDuplicateOpen}
        onClose={onDuplicateClose}
        event={selectedEvent}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${selectedEvent?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  )
}
