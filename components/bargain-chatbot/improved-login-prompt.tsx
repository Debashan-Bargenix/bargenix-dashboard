"use client"

import { useState, useEffect } from "react"
import { X, Minus, User, CheckCircle, Lock } from "lucide-react"

interface LoginPromptProps {
  shopDomain: string
  productId: string
  variantId: string
  productTitle: string
  onClose: () => void
  onLogin: () => void
  onSignup: () => void
  onMinimize: () => void
  isMinimized: boolean
}

export function ImprovedLoginPrompt({
  shopDomain,
  productId,
  variantId,
  productTitle,
  onClose,
  onLogin,
  onSignup,
  onMinimize,
  isMinimized,
}: LoginPromptProps) {
  // Format shop name from domain
  const [shopName, setShopName] = useState<string>("")

  useEffect(() => {
    // Extract shop name from domain
    const rawShopName = shopDomain.replace(".myshopify.com", "").split(".")[0]
    // Convert to Title Case for better presentation
    const formattedName = rawShopName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    setShopName(formattedName)
  }, [shopDomain])

  if (isMinimized) {
    return (
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-700">Bargain now</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onMinimize}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Expand"
          >
            <Minus className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors" aria-label="Close">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-700">Bargain now</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onMinimize}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors" aria-label="Close">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-white" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Login Required</h3>

        <p className="text-gray-600 text-center mb-4">
          Please log in to your <strong>{shopName}</strong> store account to start bargaining for this product.
        </p>

        <div className="w-full bg-gray-50 p-3 rounded-lg mb-4">
          <div className="flex items-start mb-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm text-gray-600">This is your regular store account</span>
          </div>
          <div className="flex items-start">
            <Lock className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm text-gray-600">Secure login through {shopName}</span>
          </div>
        </div>

        <button
          onClick={onLogin}
          className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-3"
        >
          Log in to continue
        </button>

        <button
          onClick={onSignup}
          className="w-full py-3 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
        >
          Create an account
        </button>
      </div>

      {/* Footer */}
      <div className="p-2 border-t text-center text-xs text-gray-500">Powered by Bargenix AI</div>
    </div>
  )
}
