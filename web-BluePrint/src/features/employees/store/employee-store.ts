import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Role } from '@/entities/auth/types'

export interface EmployeeProfile {
  id: string          // UUID — same as backend user.id
  firstName: string
  lastName: string
  email: string
  role: Role
  isActive: boolean
  phone?: string
  hiredAt?: string    // ISO date
  warehouseId?: string
  notes?: string
  createdAt: string
}

interface EmployeeStore {
  employees: EmployeeProfile[]
  addEmployee: (e: Omit<EmployeeProfile, 'createdAt'>) => void
  updateEmployee: (id: string, patch: Partial<Omit<EmployeeProfile, 'id' | 'createdAt'>>) => void
  removeEmployee: (id: string) => void
}

export const useEmployeeStore = create<EmployeeStore>()(
  persist(
    (set) => ({
      employees: [],
      addEmployee: (e) =>
        set((s) => ({
          employees: [
            ...s.employees,
            { ...e, createdAt: new Date().toISOString() },
          ],
        })),
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),
      removeEmployee: (id) =>
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
        })),
    }),
    { name: 'wms-employees' },
  ),
)
