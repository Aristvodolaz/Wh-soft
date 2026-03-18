import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders dot indicator by default', () => {
    const { container } = render(<Badge variant="active">Online</Badge>)
    // dot is a span inside badge
    const spans = container.querySelectorAll('span')
    // The dot span should be present (dot=true is default)
    expect(spans.length).toBeGreaterThan(0)
  })

  it('does not render dot when dot=false', () => {
    const { container } = render(<Badge dot={false}>No dot</Badge>)
    // Only one element — the text itself, no dot span
    const badge = container.firstChild as HTMLElement
    expect(badge.querySelectorAll('span').length).toBe(0)
  })

  it('applies active variant classes', () => {
    const { container } = render(<Badge variant="active">Active</Badge>)
    expect(container.firstChild).toHaveClass('bg-success-50', 'text-success-700')
  })

  it('applies danger/cancelled variant classes', () => {
    const { container } = render(<Badge variant="cancelled">Cancelled</Badge>)
    expect(container.firstChild).toHaveClass('bg-danger-50', 'text-danger-700')
  })

  it('applies pending variant classes', () => {
    const { container } = render(<Badge variant="pending">Pending</Badge>)
    expect(container.firstChild).toHaveClass('bg-warning-50', 'text-warning-700')
  })

  it('applies in-progress variant classes', () => {
    const { container } = render(<Badge variant="in-progress">In Progress</Badge>)
    expect(container.firstChild).toHaveClass('text-primary-700')
  })

  it('falls back to default variant', () => {
    const { container } = render(<Badge>Default</Badge>)
    expect(container.firstChild).toHaveClass('bg-neutral-100')
  })
})
