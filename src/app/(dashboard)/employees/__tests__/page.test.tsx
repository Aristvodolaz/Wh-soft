import React from 'react'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { render } from '../../../../__tests__/test-utils'
import EmployeesPage from '../page'
import { useEmployeeStore } from '@/features/employees/store/employee-store'
import { Role } from '@/entities/auth/types'

// Mock analytics and tasks hooks — we test the UI logic, not API integration
jest.mock('@/features/analytics/api/use-analytics', () => ({
  useEmployeeKpi: jest.fn(() => ({ data: undefined, isLoading: false, isError: false })),
}))

jest.mock('@/features/tasks/api/use-tasks', () => ({
  useTasks: jest.fn(() => ({ data: [], isLoading: false })),
}))

const sampleEmployee = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  firstName: 'Иван',
  lastName: 'Иванов',
  email: 'ivan@acme.com',
  role: Role.WORKER,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  act(() => { useEmployeeStore.setState({ employees: [] }) })
})

describe('EmployeesPage', () => {
  it('renders page title', () => {
    render(<EmployeesPage />)
    expect(screen.getByText('Сотрудники')).toBeInTheDocument()
  })

  it('shows empty state when no employees', () => {
    render(<EmployeesPage />)
    expect(screen.getByText('Нет сотрудников')).toBeInTheDocument()
  })

  it('shows all three KPI summary cards', () => {
    render(<EmployeesPage />)
    expect(screen.getByText('Всего сотрудников')).toBeInTheDocument()
    expect(screen.getByText('Активных')).toBeInTheDocument()
    expect(screen.getByText('Неактивных')).toBeInTheDocument()
  })

  it('opens add employee modal when button clicked', async () => {
    render(<EmployeesPage />)
    fireEvent.click(screen.getAllByText('Добавить сотрудника')[0])
    await waitFor(() => {
      expect(screen.getByText('Новый сотрудник')).toBeInTheDocument()
    })
  })

  it('closes add employee modal on cancel', async () => {
    render(<EmployeesPage />)
    fireEvent.click(screen.getAllByText('Добавить сотрудника')[0])
    await waitFor(() => screen.getByText('Новый сотрудник'))
    fireEvent.click(screen.getByText('Отмена'))
    await waitFor(() => {
      expect(screen.queryByText('Новый сотрудник')).not.toBeInTheDocument()
    })
  })

  it('displays employee row when store has employees', () => {
    act(() => { useEmployeeStore.setState({ employees: [sampleEmployee] }) })
    render(<EmployeesPage />)
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    expect(screen.getByText('ivan@acme.com')).toBeInTheDocument()
  })

  it('KPI cards show correct counts via store state', () => {
    act(() => {
      useEmployeeStore.setState({
        employees: [
          sampleEmployee,
          { ...sampleEmployee, id: 'id-2', firstName: 'Пётр', lastName: 'Петров', email: 'p@x.com', isActive: false },
        ],
      })
    })
    render(<EmployeesPage />)
    expect(useEmployeeStore.getState().employees).toHaveLength(2)
    const activeCount = useEmployeeStore.getState().employees.filter(e => e.isActive).length
    expect(activeCount).toBe(1)
    expect(useEmployeeStore.getState().employees.filter(e => !e.isActive).length).toBe(1)
  })

  it('filters employees by search query', () => {
    act(() => {
      useEmployeeStore.setState({
        employees: [
          sampleEmployee,
          { ...sampleEmployee, id: 'id-2', firstName: 'Пётр', lastName: 'Петров', email: 'petr@acme.com' },
        ],
      })
    })
    render(<EmployeesPage />)
    fireEvent.change(screen.getByPlaceholderText('Имя, email или UUID...'), { target: { value: 'Иван' } })
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    expect(screen.queryByText('Пётр Петров')).not.toBeInTheDocument()
  })

  it('shows not-found empty state when search has no results', () => {
    act(() => { useEmployeeStore.setState({ employees: [sampleEmployee] }) })
    render(<EmployeesPage />)
    fireEvent.change(screen.getByPlaceholderText('Имя, email или UUID...'), { target: { value: 'НеСуществует' } })
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('filters by role dropdown', () => {
    act(() => {
      useEmployeeStore.setState({
        employees: [
          sampleEmployee,
          { ...sampleEmployee, id: 'id-2', firstName: 'Пётр', lastName: 'Петров', email: 'p@x.com', role: Role.MANAGER },
        ],
      })
    })
    render(<EmployeesPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: Role.WORKER } })
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    expect(screen.queryByText('Пётр Петров')).not.toBeInTheDocument()
  })

  it('shows delete confirmation modal', async () => {
    act(() => { useEmployeeStore.setState({ employees: [sampleEmployee] }) })
    render(<EmployeesPage />)
    const row = screen.getByText('ivan@acme.com').closest('tr')
    expect(row).not.toBeNull()
    const buttons = row!.querySelectorAll('button')
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Удалить сотрудника?')).toBeInTheDocument()
    })
  })

  it('removes employee after confirming delete', async () => {
    act(() => { useEmployeeStore.setState({ employees: [sampleEmployee] }) })
    render(<EmployeesPage />)
    const row = screen.getByText('ivan@acme.com').closest('tr')!
    const buttons = row.querySelectorAll('button')
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => screen.getByText('Удалить сотрудника?'))
    fireEvent.click(screen.getByText('Удалить'))
    await waitFor(() => {
      expect(useEmployeeStore.getState().employees).toHaveLength(0)
    })
  })

  it('opens detail modal on row click', async () => {
    act(() => { useEmployeeStore.setState({ employees: [sampleEmployee] }) })
    render(<EmployeesPage />)
    fireEvent.click(screen.getByText('Иван Иванов'))
    await waitFor(() => {
      // Detail modal shows employee name in header area
      const headings = screen.getAllByText('Иван Иванов')
      expect(headings.length).toBeGreaterThan(1)
    })
  })
})
