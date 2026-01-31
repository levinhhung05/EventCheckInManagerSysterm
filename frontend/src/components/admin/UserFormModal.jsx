import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  FormErrorMessage,
  VStack,
  Switch,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, getErrorMessage } from '../../services/api'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export default function UserFormModal({ isOpen, onClose, user }) {
  const queryClient = useQueryClient()
  const isEditing = !!user

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      role: 'staff',
      password: '',
      is_active: true
    }
  })

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          password: '',
          is_active: user.is_active
        })
      } else {
        reset({
          full_name: '',
          email: '',
          role: 'staff',
          password: '',
          is_active: true
        })
      }
    }
  }, [isOpen, user, reset])

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        // Only send password if provided
        const updateData = { ...data }
        if (!updateData.password) delete updateData.password
        return authAPI.updateUser(user.id, updateData)
      }
      return authAPI.createUser(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      toast.success(isEditing ? 'User updated successfully' : 'User created successfully')
      onClose()
      reset()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const onSubmit = (data) => {
    mutation.mutate(data)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditing ? 'Edit User' : 'Create New User'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} as="form" id="user-form" onSubmit={handleSubmit(onSubmit)}>
            <FormControl isInvalid={errors.full_name}>
              <FormLabel>Full Name</FormLabel>
              <Input
                {...register('full_name', { required: 'Full name is required' })}
                placeholder="John Doe"
              />
              <FormErrorMessage>{errors.full_name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="john@example.com"
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.role}>
              <FormLabel>Role</FormLabel>
              <Select {...register('role', { required: 'Role is required' })}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </Select>
              <FormErrorMessage>{errors.role?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.password}>
              <FormLabel>{isEditing ? 'Password (leave blank to keep current)' : 'Password'}</FormLabel>
              <Input
                type="password"
                {...register('password', {
                  required: !isEditing && 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                placeholder="******"
              />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="is_active" mb="0">
                Active
              </FormLabel>
              <Switch id="is_active" {...register('is_active')} />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            type="submit"
            form="user-form"
            isLoading={isSubmitting || mutation.isPending}
          >
            {isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
