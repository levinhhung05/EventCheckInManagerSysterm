import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  Textarea,
  VStack,
  FormErrorMessage,
} from '@chakra-ui/react'
import toast from 'react-hot-toast'
import { guestsAPI, getErrorMessage } from '../../services/api'

export default function GuestFormModal({ isOpen, onClose, eventId, guest }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    if (isOpen) {
      if (guest) {
        reset({
          full_name: guest.full_name,
          phone: guest.phone,
          company: guest.company || '',
          email: guest.email || '',
          notes: guest.notes || '',
        })
      } else {
        reset({
          full_name: '',
          phone: '',
          company: '',
          email: '',
          notes: '',
        })
      }
    }
  }, [isOpen, guest, reset])

  const mutation = useMutation({
    mutationFn: (data) =>
      guest
        ? guestsAPI.update(eventId, guest.id, data)
        : guestsAPI.create(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['guests', eventId])
      toast.success(guest ? 'Guest updated successfully' : 'Guest created successfully')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const onSubmit = (data) => {
    mutation.mutate(data)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>{guest ? 'Edit Guest' : 'Add Guest'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.full_name}>
                <FormLabel>Full Name *</FormLabel>
                <Input
                  {...register('full_name', { required: 'Full name is required' })}
                  placeholder="John Doe"
                />
                <FormErrorMessage>{errors.full_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.phone}>
                <FormLabel>Phone Number *</FormLabel>
                <Input
                  {...register('phone', { required: 'Phone number is required' })}
                  placeholder="+1234567890"
                />
                <FormErrorMessage>{errors.phone?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Company</FormLabel>
                <Input
                  {...register('company')}
                  placeholder="Company name (optional)"
                />
              </FormControl>

              <FormControl isInvalid={errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  placeholder="email@example.com (optional)"
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  {...register('notes')}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={mutation.isPending}
            >
              {guest ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
