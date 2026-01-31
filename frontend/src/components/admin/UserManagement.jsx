import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  useDisclosure,
  HStack,
  Spinner,
} from '@chakra-ui/react'
import {
  FiPlus,
  FiEdit,
  FiTrash2,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import DeleteConfirmDialog from '../shared/DeleteConfirmDialog'
import UserFormModal from './UserFormModal'
import { useAuthStore } from '../../store/authStore'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  
  const [selectedUser, setSelectedUser] = useState(null)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await authAPI.listUsers()
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => authAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      toast.success('User deleted successfully')
      onDeleteClose()
    },
    onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to delete user')
    }
  })

  const handleDeleteClick = (user) => {
    setSelectedUser(user)
    onDeleteOpen()
  }

  const handleEditClick = (user) => {
    setSelectedUser(user)
    onFormOpen()
  }

  const handleAddClick = () => {
    setSelectedUser(null)
    onFormOpen()
  }

  const handleDeleteConfirm = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'purple'
      case 'admin': return 'blue'
      case 'staff': return 'green'
      default: return 'gray'
    }
  }

  if (isLoading) {
      return <Flex justify="center" align="center" h="200px"><Spinner /></Flex>
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">User Management</Heading>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="brand"
          onClick={handleAddClick}
        >
          Add User
        </Button>
      </Flex>

      <Box bg="white" borderRadius="lg" shadow="sm" overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Full Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td fontWeight="medium">{user.full_name}</Td>
                <Td>{user.email}</Td>
                <Td>
                  <Badge colorScheme={getRoleBadgeColor(user.role)}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </Td>
                <Td>
                  <Badge colorScheme={user.is_active ? 'green' : 'red'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FiEdit />}
                      aria-label="Edit user"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditClick(user)}
                    />
                    <IconButton
                      icon={<FiTrash2 />}
                      aria-label="Delete user"
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      isDisabled={user.id === currentUser?.id}
                      onClick={() => handleDeleteClick(user)}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
            {users.length === 0 && (
                <Tr>
                    <Td colSpan={5} textAlign="center" py={4}>
                        No users found
                    </Td>
                </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      <UserFormModal
        isOpen={isFormOpen}
        onClose={onFormClose}
        user={selectedUser}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.full_name}? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  )
}
