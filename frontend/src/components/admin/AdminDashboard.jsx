import { Outlet } from 'react-router-dom'
import { 
  Box, 
  Flex, 
  useDisclosure, 
  Drawer, 
  DrawerContent, 
  DrawerOverlay 
} from '@chakra-ui/react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AdminDashboard() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop Sidebar */}
      <Sidebar display={{ base: 'none', md: 'flex' }} />

      {/* Mobile Sidebar (Drawer) */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
        <DrawerOverlay />
        <DrawerContent>
          <Sidebar onClose={onClose} w="full" borderRight="none" />
        </DrawerContent>
      </Drawer>

      <Box flex="1" display="flex" flexDirection="column" overflow="hidden">
        <Header onOpenSidebar={onOpen} />
        <Box flex="1" overflow="auto" bg="gray.50" p={6}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  )
}
