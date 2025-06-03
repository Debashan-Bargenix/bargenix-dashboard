"use client"

import type React from "react"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorBoundaryProps {
  error: Error
  reset: () => void
}

export function ErrorBoundaryFallback({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error caught by boundary:", error)
  }, [error])

  return (
    <Card className="w-full max-w-3xl mx-auto my-8 border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="mt-2">
            We encountered an error while loading this component.
            <div className="mt-2 p-2 bg-red-50 rounded text-sm font-mono overflow-auto max-h-32">
              {error.message || "Unknown error occurred"}
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button onClick={reset} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </CardFooter>
    </Card>
  )
}

// Add the missing ErrorBoundary component
import { Component, type ReactNode } from "react"
import type { JSX } from "react/jsx-runtime"

interface ErrorBoundaryComponentProps {
  children: ReactNode
  fallback?: (props: ErrorBoundaryProps) => JSX.Element
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryComponentProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryComponentProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ErrorBoundaryFallback
      return <FallbackComponent error={this.state.error} reset={this.resetErrorBoundary} />
    }

    return this.props.children
  }
}
