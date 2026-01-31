import { useNavigate, useLocation, matchPath } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  VStack,
  Icon,
  Text,
  Flex,
  Heading,
  Divider,
  Skeleton,
  Button,
} from '@chakra-ui/react'
import { 
  FiCalendar, 
  FiUsers, 
  FiLayout,
  FiHome,
  FiInfo,
  FiArrowLeft,
  FiSettings,
  FiBarChart2,
  FiShield
} from 'react-icons/fi'
import { eventsAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const NavItem = ({ icon, label, path, isActive, onClick, isSubItem = false }) => (
  <Flex
    align="center"
    p={3}
    mx={2}
    pl={isSubItem ? 8 : 3}
    borderRadius="lg"
    cursor="pointer"
    bg={isActive ? 'brand.50' : 'transparent'}
    color={isActive ? 'brand.600' : 'gray.700'}
    _hover={{
      bg: isActive ? 'brand.100' : 'gray.100',
    }}
    onClick={onClick}
    transition="all 0.2s"
  >
    <Icon as={icon} boxSize={isSubItem ? 4 : 5} mr={3} />
    <Text fontWeight={isActive ? "semibold" : "medium"} fontSize={isSubItem ? "sm" : "md"}>
      {label}
    </Text>
  </Flex>
)

export default function Sidebar({ onClose, ...rest }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigate = (path) => {
    navigate(path)
    onClose?.()
  }

  // Check if we are in an event context
  const eventMatch = matchPath({ path: "/admin/events/:eventId", end: false }, location.pathname) || 
                     matchPath({ path: "/staff/events/:eventId", end: false }, location.pathname)
  const eventId = eventMatch?.params?.eventId
  
  const isAdmin = location.pathname.startsWith('/admin')
  const baseRoute = isAdmin ? '/admin' : '/staff'

  const { isSuperAdmin } = useAuthStore()

  // Fetch event details if we have an ID
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.get(eventId).then(res => res.data),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  })

  const mainMenuItems = isAdmin ? [
    { icon: FiHome, label: 'Dashboard', path: '/admin', exact: true },
    { icon: FiCalendar, label: 'All Events', path: '/admin/events', exact: true },
    ...(isSuperAdmin() ? [{ icon: FiUsers, label: 'Users', path: '/admin/users' }] : []),
  ] : [
    { icon: FiCalendar, label: 'All Events', path: '/staff/events', exact: true },
  ]

  const eventMenuItems = eventId ? (isAdmin ? [
    { icon: FiInfo, label: 'Overview', path: `/admin/events/${eventId}`, exact: true },
    { icon: FiLayout, label: 'Layout', path: `/admin/events/${eventId}/layout` },
    { icon: FiUsers, label: 'Guests', path: `/admin/events/${eventId}/guests` },
    { icon: FiBarChart2, label: 'Reports', path: `/admin/events/${eventId}/reports` },
    { icon: FiShield, label: 'Staff Access', path: `/admin/events/${eventId}/staff` },
  ] : [
    { icon: FiUsers, label: 'Check-in', path: `/staff/events/${eventId}/checkin` },
  ]) : []

  const isPathActive = (itemPath, exact = false) => {
    if (exact) {
      return location.pathname === itemPath
    }
    return location.pathname.startsWith(itemPath)
  }

  return (
    <Box
      w={{ base: 'full', md: '250px' }}
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
      h="100%"
      {...rest}
    >
      <Box p={6}>
        <Flex align="center" mb={1}>
          <Heading size="md" color="brand.600" letterSpacing="tight">
            EventCheckIn
          </Heading>
        </Flex>
        <Text fontSize="xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wider">
          Admin Portal
        </Text>
      </Box>

      <Divider />

      <VStack spacing={1} align="stretch" py={4} overflowY="auto" flex={1}>
        
        {/* Main Navigation */}
        <Box px={4} mb={2}>
          <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase" mb={2} px={2}>
            Main
          </Text>
        </Box>
        
        {mainMenuItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isActive={isPathActive(item.path, item.exact)}
            onClick={() => handleNavigate(item.path)}
          />
        ))}

        {/* Event Context Navigation */}
        {eventId && (
          <>
            <Divider my={4} />
            
            <Box px={4} mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase" mb={2} px={2}>
                Current Event
              </Text>
              
              {isLoading ? (
                <Skeleton height="20px" width="80%" mx={2} mb={3} />
              ) : event ? (
                <Text fontSize="sm" fontWeight="bold" color="gray.800" px={2} mb={3} noOfLines={1} title={event.name}>
                  {event.name}
                </Text>
              ) : null}
            </Box>

            {eventMenuItems.map((item) => (
              <NavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                isActive={isPathActive(item.path, item.exact)}
                onClick={() => handleNavigate(item.path)}
                isSubItem={true}
              />
            ))}
            
            <Box px={4} mt={2}>
              <Button 
                size="sm" 
                variant="ghost" 
                leftIcon={<FiArrowLeft />} 
                color="gray.500"
                fontWeight="normal"
                width="full"
                justifyContent="flex-start"
                onClick={() => handleNavigate('/admin/events')}
                _hover={{ bg: 'gray.100', color: 'gray.700' }}
              >
                Back to List
              </Button>
            </Box>
          </>
        )}
      </VStack>
      
      <Box p={4} borderTop="1px" borderColor="gray.100">
        <Text fontSize="xs" color="gray.400" textAlign="center">
          v1.0.0
        </Text>
      </Box>
    </Box>
  )
}
