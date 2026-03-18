import { act, renderHook } from '@testing-library/react'
import { useEmployeeStore } from '../employee-store'
import { Role } from '@/entities/auth/types'

// Reset store state between tests
beforeEach(() => {
  act(() => {
    useEmployeeStore.setState({ employees: [] })
  })
})

const sampleEmployee = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  firstName: 'Иван',
  lastName: 'Иванов',
  email: 'ivan@example.com',
  role: Role.WORKER,
  isActive: true,
}

describe('useEmployeeStore', () => {
  it('starts with empty employees list', () => {
    const { result } = renderHook(() => useEmployeeStore())
    expect(result.current.employees).toHaveLength(0)
  })

  it('addEmployee adds a new employee with createdAt timestamp', () => {
    const { result } = renderHook(() => useEmployeeStore())
    act(() => {
      result.current.addEmployee(sampleEmployee)
    })
    expect(result.current.employees).toHaveLength(1)
    expect(result.current.employees[0].firstName).toBe('Иван')
    expect(result.current.employees[0].createdAt).toBeDefined()
  })

  it('addEmployee preserves all provided fields', () => {
    const { result } = renderHook(() => useEmployeeStore())
    act(() => {
      result.current.addEmployee({ ...sampleEmployee, phone: '+7 999 000 00 00', notes: 'VIP' })
    })
    const e = result.current.employees[0]
    expect(e.phone).toBe('+7 999 000 00 00')
    expect(e.notes).toBe('VIP')
  })

  it('addEmployee can add multiple employees', () => {
    const { result } = renderHook(() => useEmployeeStore())
    act(() => {
      result.current.addEmployee(sampleEmployee)
      result.current.addEmployee({
        ...sampleEmployee,
        id: '223e4567-e89b-12d3-a456-426614174001',
        firstName: 'Пётр',
        email: 'petr@example.com',
      })
    })
    expect(result.current.employees).toHaveLength(2)
  })

  it('updateEmployee updates only specified fields', () => {
    const { result } = renderHook(() => useEmployeeStore())
    act(() => {
      result.current.addEmployee(sampleEmployee)
    })
    act(() => {
      result.current.updateEmployee(sampleEmployee.id, { isActive: false, phone: '+79990001234' })
    })
    const e = result.current.employees[0]
    expect(e.isActive).toBe(false)
    expect(e.phone).toBe('+79990001234')
    // Unchanged fields remain
    expect(e.firstName).toBe('Иван')
    expect(e.email).toBe('ivan@example.com')
  })

  it('updateEmployee does not affect other employees', () => {
    const { result } = renderHook(() => useEmployeeStore())
    const id2 = '223e4567-e89b-12d3-a456-426614174001'
    act(() => {
      result.current.addEmployee(sampleEmployee)
      result.current.addEmployee({ ...sampleEmployee, id: id2, firstName: 'Пётр', email: 'petr@example.com' })
    })
    act(() => {
      result.current.updateEmployee(sampleEmployee.id, { isActive: false })
    })
    expect(result.current.employees.find(e => e.id === id2)?.isActive).toBe(true)
  })

  it('removeEmployee removes the employee with given id', () => {
    const { result } = renderHook(() => useEmployeeStore())
    act(() => {
      result.current.addEmployee(sampleEmployee)
    })
    act(() => {
      result.current.removeEmployee(sampleEmployee.id)
    })
    expect(result.current.employees).toHaveLength(0)
  })

  it('removeEmployee does not affect other employees', () => {
    const { result } = renderHook(() => useEmployeeStore())
    const id2 = '223e4567-e89b-12d3-a456-426614174001'
    act(() => {
      result.current.addEmployee(sampleEmployee)
      result.current.addEmployee({ ...sampleEmployee, id: id2, firstName: 'Пётр', email: 'petr@example.com' })
    })
    act(() => {
      result.current.removeEmployee(sampleEmployee.id)
    })
    expect(result.current.employees).toHaveLength(1)
    expect(result.current.employees[0].id).toBe(id2)
  })

  it('removeEmployee with non-existent id is a no-op', () => {
    const { result } = renderHook(() => useEmployeeStore())
    act(() => {
      result.current.addEmployee(sampleEmployee)
    })
    act(() => {
      result.current.removeEmployee('non-existent-id')
    })
    expect(result.current.employees).toHaveLength(1)
  })
})
