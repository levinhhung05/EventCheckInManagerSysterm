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
  VStack,
  FormErrorMessage,
  Checkbox,
} from '@chakra-ui/react'
import toast from 'react-hot-toast'
import { eventsAPI, getErrorMessage } from '../../services/api'

export default function DuplicateEventDialog({ isOpen, onClose, event }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    if (event && isOpen) {
      reset({
        new_name: `Copy of ${event.name}`,
        new_date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
        copy_layout: true,
        copy_guests: false,
      })
    }
  }, [event, isOpen, reset])

  const mutation = useMutation({
    mutationFn: (data) => eventsAPI.duplicate(event.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events'])
      toast.success('Event duplicated successfully')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const onSubmit = (data) => {
    mutation.mutate({
      ...data,
      new_date: new Date(data.new_date).toISOString(),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Duplicate Event</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.new_name}>
                <FormLabel>New Event Name</FormLabel>
                <Input
                  {...register('new_name', { required: 'Event name is required' })}
                  placeholder="New event name"
                />
                <FormErrorMessage>{errors.new_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.new_date}>
                <FormLabel>New Date & Time</FormLabel>
                <Input
                  type="datetime-local"
                  {...register('new_date', { required: 'Date is required' })}
                />
                <FormErrorMessage>{errors.new_date?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <Checkbox {...register('copy_layout')}>Copy Layout (Tables & Seats)</Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox {...register('copy_guests')}>Copy Guest List</Checkbox>
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
              Duplicate
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
