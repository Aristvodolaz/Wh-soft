import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not fire onClick when disabled', () => {
    const onClick = jest.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows loading spinner when loading=true', () => {
    render(<Button loading>Save</Button>)
    // Button should be disabled while loading
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-primary-500/)
  })

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-danger-500/)
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Cancel</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/border/)
  })

  it('applies xs size classes', () => {
    render(<Button size="xs">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/h-7/)
  })

  it('renders as submit button when type="submit"', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
