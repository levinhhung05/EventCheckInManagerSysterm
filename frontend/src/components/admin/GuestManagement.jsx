import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Text,
  HStack,
  Select,
} from '@chakra-ui/react'
import {
  FiSearch,
  FiPlus,
  FiUpload,
  FiDownload,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiArrowLeft,
  FiCheck,
  FiX,
  FiLogOut,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { guestsAPI, getErrorMessage } from '../../services/api'
import DeleteConfirmDialog from '../shared/DeleteConfirmDialog'
import GuestFormModal from './GuestFormModal'

export default function GuestManagement() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef()
  
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedGuest, setSelectedGuest] = useState(null)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure()

  // Fetch guests
  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', eventId, search, filterStatus],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (filterStatus !== 'all') {
        params.checked_in = filterStatus === 'checked_in'
      }
      const response = await guestsAPI.list(eventId, params)
      return response.data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (guestId) => guestsAPI.delete(eventId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries(['guests', eventId])
      toast.success('Guest deleted successfully')
      onDeleteClose()
    },
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file) => guestsAPI.import(eventId, file),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['guests', eventId])
      const { success, failed, errors } = response.data
      if (failed > 0) {
        toast.error(`Imported ${success} guests. ${failed} failed.`)
        console.error('Import errors:', errors)
      } else {
        toast.success(`Successfully imported ${success} guests`)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  // Export handler
  const handleExport = async () => {
    try {
      const response = await guestsAPI.export(eventId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `guests_${eventId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Guest list exported')
    } catch (error) {
      toast.error('Failed to export guests')
    }
  }

  // Import handler
  const handleImport = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file')
        return
      }
      importMutation.mutate(file)
    }
    e.target.value = null
  }

  const handleAdd = () => {
    setSelectedGuest(null)
    onFormOpen()
  }

  const handleEdit = (guest) => {
    setSelectedGuest(guest)
    onFormOpen()
  }

  const handleDelete = (guest) => {
    setSelectedGuest(guest)
    onDeleteOpen()
  }

  const confirmDelete = () => {
    if (selectedGuest) {
      deleteMutation.mutate(selectedGuest.id)
    }
  }

  if (isLoading) {
    return <Box>Loading...</Box>
  }

  return (
    <Box>
      <Button
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        mb={4}
        onClick={() => navigate(`/admin/events/${eventId}`)}
      >
        Back to Event
      </Button>

      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Guest Management</Heading>
        <HStack spacing={2}>
          <Input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            display="none"
            onChange={handleImport}
          />
          <Button
            leftIcon={<FiUpload />}
            onClick={() => fileInputRef.current.click()}
            isLoading={importMutation.isPending}
          >
            Import CSV
          </Button>
          <Button
            leftIcon={<FiDownload />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="brand"
            onClick={handleAdd}
          >
            Add Guest
          </Button>
        </HStack>
      </Flex>

      <Flex mb={4} gap={4}>
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        <Select
          maxW="200px"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Guests</option>
          <option value="checked_in">Checked In</option>
          <option value="not_checked_in">Not Checked In</option>
        </Select>
      </Flex>

      {guests.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text color="gray.500" mb={4}>
            No guests found. Add guests or import from CSV.
          </Text>
          <Button colorScheme="brand" leftIcon={<FiPlus />} onClick={handleAdd}>
            Add First Guest
          </Button>
        </Box>
      ) : (
        <Box bg="white" borderRadius="lg" shadow="sm" overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Company</Th>
                <Th>Email</Th>
                <Th>Table</Th>
                <Th>Status</Th>
                <Th>Time</Th>
                <Th width="50px"></Th>
              </Tr>
            </Thead>
            <Tbody>
              {guests.map((guest) => (
                <Tr key={guest.id}>
                  <Td fontWeight="medium">{guest.full_name}</Td>
                  <Td>{guest.phone}</Td>
                  <Td color="gray.600">{guest.company || '-'}</Td>
                  <Td color="gray.600">{guest.email || '-'}</Td>
                  <Td>
                    {guest.table_id ? (
                      <Badge colorScheme="blue">Assigned</Badge>
                    ) : (
                      <Badge>Unassigned</Badge>
                    )}
                  </Td>
                  <Td>
                    {guest.checked_in ? (
                      <Badge colorScheme="green" display="flex" alignItems="center" width="fit-content">
                        <FiCheck style={{ marginRight: '4px' }} />
                        Checked In
                      </Badge>
                    ) : guest.checked_out_at ? (
                      <Badge colorScheme="orange" display="flex" alignItems="center" width="fit-content">
                        <FiLogOut style={{ marginRight: '4px' }} />
                        Checked Out
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray" display="flex" alignItems="center" width="fit-content">
                        <FiX style={{ marginRight: '4px' }} />
                        Pending
                      </Badge>
                    )}
                  </Td>
                  <Td fontSize="sm">
                    {guest.checked_in_at && (
                      <Box>
                        <Text as="span" color="green.600" fontWeight="medium" fontSize="xs">IN: </Text>
                        {new Date(guest.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Box>
                    )}
                    {guest.checked_out_at && !guest.checked_in && (
                      <Box>
                        <Text as="span" color="red.600" fontWeight="medium" fontSize="xs">OUT: </Text>
                        {new Date(guest.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Box>
                    )}
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem icon={<FiEdit />} onClick={() => handleEdit(guest)}>
                          Edit
                        </MenuItem>
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={() => handleDelete(guest)}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <GuestFormModal
        isOpen={isFormOpen}
        onClose={onFormClose}
        eventId={eventId}
        guest={selectedGuest}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={confirmDelete}
        title="Delete Guest"
        message={`Are you sure you want to delete ${selectedGuest?.full_name}?`}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  )
}
