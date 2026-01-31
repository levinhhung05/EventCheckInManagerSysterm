import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Heading,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Icon,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Divider,
} from '@chakra-ui/react'
import { 
  FiArrowLeft, 
  FiDownload, 
  FiFileText, 
  FiCheckCircle, 
  FiXCircle,
  FiClock,
  FiLogOut
} from 'react-icons/fi'
import { format } from 'date-fns'
import { reportsAPI, eventsAPI } from '../../services/api'
import LoadingScreen from '../shared/LoadingScreen'
import toast from 'react-hot-toast'

export default function ReportsView() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await eventsAPI.get(eventId)
      return response.data
    },
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['attendance-report', eventId],
    queryFn: async () => {
      const response = await reportsAPI.attendance(eventId)
      return response.data
    },
    refetchInterval: 10000,
  })

  const handleExport = async (type) => {
    try {
      const promise = type === 'excel' 
        ? reportsAPI.exportExcel(eventId)
        : reportsAPI.exportPDF(eventId)
      
      toast.promise(promise, {
        loading: 'Generating report...',
        success: 'Report downloaded!',
        error: 'Failed to download report',
      })

      const response = await promise
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_report_${eventId}.${type === 'excel' ? 'xlsx' : 'pdf'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }

  if (isLoading) return <LoadingScreen />

  return (
    <Box p={6}>
      <Button
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        mb={4}
        onClick={() => navigate(`/admin/events/${eventId}`)}
      >
        Back to Event
      </Button>

      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={2}>Attendance Reports</Heading>
          <Text color="gray.600">
            {event?.name} • {event?.date && format(new Date(event.date), 'PPP')}
          </Text>
        </Box>
        <HStack spacing={4}>
          <Button 
            leftIcon={<FiFileText />} 
            onClick={() => handleExport('pdf')}
            colorScheme="red"
            variant="outline"
          >
            Export PDF
          </Button>
          <Button 
            leftIcon={<FiDownload />} 
            onClick={() => handleExport('excel')}
            colorScheme="green"
            variant="outline"
          >
            Export Excel
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 5 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Guests</StatLabel>
              <StatNumber>{report?.total_guests}</StatNumber>
              <StatHelpText>Registered</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Checked In</StatLabel>
              <StatNumber color="green.500">{report?.checked_in_count}</StatNumber>
              <StatHelpText>{report?.attendance_percentage}% Rate</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Checked Out</StatLabel>
              <StatNumber color="orange.500">{report?.checked_out_count || 0}</StatNumber>
              <StatHelpText>Departed</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending</StatLabel>
              <StatNumber color="red.500">{report?.pending_count}</StatNumber>
              <StatHelpText>Remaining</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Seat Utilization</StatLabel>
              <StatNumber>{report?.seat_utilization_percentage}%</StatNumber>
              <StatHelpText>{report?.assigned_seats} / {report?.total_seats} Seats</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardBody>
          <Tabs isLazy>
            <TabList>
              <Tab>Pending Guests</Tab>
              <Tab>Timeline</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {report?.not_checked_in_guests?.map((guest) => (
                      <Tr key={guest.id}>
                        <Td>{guest.full_name}</Td>
                        <Td>
                          <Badge colorScheme="red">Pending</Badge>
                        </Td>
                      </Tr>
                    ))}
                    {report?.not_checked_in_guests?.length === 0 && (
                      <Tr>
                        <Td colSpan={2} textAlign="center">All guests checked in!</Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </TabPanel>

              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  {report?.timeline?.map((item, index) => (
                    <Flex key={index} p={3} borderWidth="1px" borderRadius="md" justify="space-between" align="center">
                      <HStack>
                        <Icon 
                          as={item.type === 'check_out' ? FiLogOut : FiCheckCircle} 
                          color={item.type === 'check_out' ? 'orange.500' : 'green.500'} 
                        />
                        <Text fontWeight="bold">{item.guest_name}</Text>
                        <Badge colorScheme={item.type === 'check_out' ? 'orange' : 'green'} fontSize="xs">
                          {item.type === 'check_out' ? 'Checked Out' : 'Checked In'}
                        </Badge>
                      </HStack>
                      <HStack color="gray.500" fontSize="sm">
                        <Icon as={FiClock} />
                        <Text>{format(new Date(item.timestamp), 'p')}</Text>
                      </HStack>
                    </Flex>
                  ))}
                  {(!report?.timeline || report?.timeline?.length === 0) && (
                    <Text textAlign="center" color="gray.500">No activity yet</Text>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </Box>
  )
}
