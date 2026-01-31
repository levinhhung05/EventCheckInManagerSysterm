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
  Select,
} from '@chakra-ui/react'
import toast from 'react-hot-toast'
import { eventsAPI, getErrorMessage } from '../../services/api'

export default function EventFormModal({ isOpen, onClose, event }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    if (isOpen) {
      if (event) {
        reset({
          name: event.name,
          date: new Date(event.date).toISOString().slice(0, 16),
          location: event.location,
          description: event.description || '',
          status: event.status || 'draft',
        })
      } else {
        reset({
          name: '',
          date: '',
          location: '',
          description: '',
          status: 'draft',
        })
      }
    }
  }, [isOpen, event, reset])

  const mutation = useMutation({
    mutationFn: (data) =>
      event ? eventsAPI.update(event.id, data) : eventsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events'])
      toast.success(event ? 'Event updated successfully' : 'Event created successfully')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const onSubmit = (data) => {
    mutation.mutate({
      ...data,
      date: new Date(data.date).toISOString(),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>{event ? 'Edit Event' : 'Create Event'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.name}>
                <FormLabel>Event Name</FormLabel>
                <Input
                  {...register('name', { required: 'Event name is required' })}
                  placeholder="Annual Conference 2025"
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.date}>
                <FormLabel>Date & Time</FormLabel>
                <Input
                  type="datetime-local"
                  {...register('date', { required: 'Date is required' })}
                />
                <FormErrorMessage>{errors.date?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.location}>
                <FormLabel>Location</FormLabel>
                <Input
                  {...register('location', { required: 'Location is required' })}
                  placeholder="Convention Center Hall A"
                />
                <FormErrorMessage>{errors.location?.message}</FormErrorMessage>
              </FormControl>

              {event && (
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select {...register('status')}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </Select>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  {...register('description')}
                  placeholder="Event description (optional)"
                  rows={4}
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
              {event ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
