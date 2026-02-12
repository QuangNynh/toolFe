import { create } from 'zustand'
type User = {
  name: string
  email: string
  avatar: string
  permissions: string[]
}

interface AuthStore {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: {
    name: 'nynh',
    email: 'vunynh@gmail.com',
    avatar: 'http://tes.vn',
    permissions: ['USER', 'ADMIN']
  },
  login: async (email) => {
    // Simulate API call
    const user = {
      name: 'John Doe',
      email,
      avatar: '',
      permissions: ['USER', 'ADMIN']
    }
    set({ user })
  },
  logout: () => {
    set({ user: null })
  }
}))
