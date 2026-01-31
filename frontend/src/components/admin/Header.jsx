import {
  Box,
  Flex,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  Badge,
  IconButton,
} from '@chakra-ui/react'
import { FiMenu } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function Header({ onOpenSidebar }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'purple'
      case 'admin':
        return 'blue'
      case 'staff':
        return 'green'
      default:
        return 'gray'
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'staff':
        return 'Staff'
      default:
        return role
    }
  }

  const isDemoMode = localStorage.getItem('demo_mode') === 'true'

  return (
    <Box
      bg="white"
      px={6}
      py={4}
      borderBottom="1px"
      borderColor="gray.200"
      shadow="sm"
    >
      <Flex justify="space-between" align="center">
        <Flex align="center">
          <IconButton
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpenSidebar}
            variant="ghost"
            aria-label="open menu"
            icon={<FiMenu />}
            mr={2}
          />
          {isDemoMode && (
            <Badge colorScheme="orange" variant="solid" px={2} py={1} borderRadius="md">
              DEMO MODE (Offline)
            </Badge>
          )}
        </Flex>
        <Menu>
          <MenuButton>
            <Flex align="center" cursor="pointer">
              <Box mr={3} textAlign="right">
                <Text fontSize="sm" fontWeight="medium">
                  {user?.full_name}
                </Text>
                <Badge
                  colorScheme={getRoleBadgeColor(user?.role)}
                  fontSize="xs"
                  mt={1}
                >
                  {getRoleLabel(user?.role)}
                </Badge>
              </Box>
              <Avatar
                size="sm"
                name={user?.full_name}
                bg="brand.500"
              />
            </Flex>
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => navigate('/profile')}>
              Profile
            </MenuItem>
            <MenuItem onClick={() => navigate('/settings')}>
              Settings
            </MenuItem>
            <MenuDivider />
            <MenuItem onClick={handleLogout} color="red.500">
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  )
}
