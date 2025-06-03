"use client"

import type { ReactNode } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={className} showCloseButton={false}>
        {children}
      </DialogContent>
    </Dialog>
  )
}
