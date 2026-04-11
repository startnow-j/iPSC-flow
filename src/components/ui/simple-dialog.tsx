'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * SimpleDialog — a lightweight modal that does NOT use Radix UI's
 * usePresence system. Use this for dialogs that need frequent
 * internal state changes (checkboxes, toggles, etc.) to avoid
 * the Radix usePresence infinite loop bug.
 */

interface SimpleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

function SimpleDialog({
  open,
  onOpenChange,
  children,
  className,
  showCloseButton = true,
}: SimpleDialogProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  return React.createElement(
    'div',
    {
      className: 'fixed inset-0 z-50 flex items-center justify-center',
    },
    // Overlay
    React.createElement('div', {
      className: 'fixed inset-0 z-50 bg-black/50',
      onClick: () => onOpenChange(false),
    }),
    // Content
    React.createElement(
      'div',
      {
        role: 'dialog',
        'aria-modal': 'true',
        className: cn(
          'bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg',
          className
        ),
      },
      children,
      showCloseButton &&
        React.createElement(
          'button',
          {
            key: 'close-btn',
            className:
              'absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
            onClick: () => onOpenChange(false),
            'aria-label': 'Close',
          },
          React.createElement(XIcon, { className: 'size-4' })
        )
    )
  )
}

function SimpleDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function SimpleDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}

function SimpleDialogTitle({
  className,
  ...props
}: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function SimpleDialogDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  SimpleDialog as Dialog,
  SimpleDialogHeader as DialogHeader,
  SimpleDialogFooter as DialogFooter,
  SimpleDialogTitle as DialogTitle,
  SimpleDialogDescription as DialogDescription,
}
