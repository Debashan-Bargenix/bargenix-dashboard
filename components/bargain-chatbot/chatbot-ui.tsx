"use client"

import { useState, useEffect, useRef } from "react"
import { X, Minus, MoreVertical, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ImprovedLoginPrompt } from "./improved-login-prompt"

interface ChatbotUIProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  variantId: string
  shopDomain: string
  productTitle: string
  productPrice: string
  productImage?: string
}

export function ChatbotUI({
  isOpen,
  onClose,
  productId,
  variantId,
  shopDomain,
  productTitle,
  productPrice,
  productImage,
}: ChatbotUIProps) {
  const [minimized, setMinimized] = useState(false)
  const [bargainingEnabled, setBargainingEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [customerData, setCustomerData] = useState<{
    isLoggedIn: boolean
    id: string | null
    email: string | null
    name: string | null
  }>({
    isLoggedIn: false,
    id: null,
    email: null,
    name: null,
  })

  const chatbotRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  useEffect(() => {
    if (isOpen) {
      checkBargainingStatus()
    }
  }, [isOpen, productId, variantId, shopDomain])

  // Handle clicks outside the chatbot to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen && !minimized) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, minimized, onClose])

  // Check for URL parameters indicating a return from login/signup
  useEffect(() => {
    const checkReturnFromAuth = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const isBargainReturn = urlParams.get("bargenix_bargain") === "true"

        if (isBargainReturn) {
          console.log("Detected return from authentication")

          // Get product and variant IDs from URL
          const urlProductId = urlParams.get("product_id")
          const urlVariantId = urlParams.get("variant_id")

          if (urlProductId && urlVariantId) {
            console.log("Found product and variant IDs in URL:", { urlProductId, urlVariantId })

            // Check if customer is now logged in
            checkCustomerLoginStatus()

            // Clean up URL
            const cleanUrl = window.location.pathname + window.location.hash
            window.history.replaceState({}, document.title, cleanUrl)
          }
        }
      } catch (error) {
        console.error("Error checking return from auth:", error)
      }
    }

    checkReturnFromAuth()
  }, [])

  const checkBargainingStatus = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/bargain/product-check?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(
          productId,
        )}&variantId=${encodeURIComponent(variantId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Error checking bargaining status: ${response.status}`)
      }

      const data = await response.json()
      setBargainingEnabled(data.bargainingEnabled)
    } catch (err) {
      console.error("Failed to check bargaining status:", err)
      setError("Failed to check if bargaining is enabled for this product")
      setBargainingEnabled(false)
    } finally {
      setLoading(false)
    }
  }

  const checkCustomerLoginStatus = async () => {
    try {
      console.log(`Checking customer login status for shop: ${shopDomain}`)

      // First, try to check if the customer is logged in using Shopify's customer object
      let isLoggedIn = false
      let customerId = null
      let customerEmail = null
      let customerName = null

      // Method 1: Check if Shopify.customer object exists
      if (window.Shopify && window.Shopify.customer) {
        isLoggedIn = true
        customerId = window.Shopify.customer.id
        customerEmail = window.Shopify.customer.email
        customerName =
          window.Shopify.customer.name ||
          `${window.Shopify.customer.firstName || ""} ${window.Shopify.customer.lastName || ""}`.trim()

        console.log("Customer is logged in via Shopify.customer:", { customerId, customerEmail, customerName })
      }
      // Method 2: Try to fetch customer data from the shop's customer account endpoint
      else {
        try {
          const response = await fetch(`https://${shopDomain}/account.json`, {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data && data.customer) {
              isLoggedIn = true
              customerId = data.customer.id
              customerEmail = data.customer.email
              customerName =
                data.customer.name || `${data.customer.first_name || ""} ${data.customer.last_name || ""}`.trim()

              console.log("Customer is logged in via account.json:", { customerId, customerEmail, customerName })
            }
          }
        } catch (error) {
          console.error("Error checking customer login via account.json:", error)
        }
      }

      // Update customer data
      setCustomerData({
        id: customerId,
        email: customerEmail,
        name: customerName,
        isLoggedIn: isLoggedIn,
      })

      if (isLoggedIn) {
        // Customer is logged in, proceed to start chat
        console.log("Customer is logged in, can start chat")
        setShowLoginPrompt(false)
      } else {
        // Customer is not logged in, show login prompt
        console.log("Customer is not logged in, showing login prompt")
        setShowLoginPrompt(true)
      }

      return isLoggedIn
    } catch (error) {
      console.error("Error checking customer login status:", error)
      setError("Error checking login status. Please try again.")
      return false
    }
  }

  const handleStartChat = async () => {
    // First check if customer is logged in
    const isLoggedIn = await checkCustomerLoginStatus()

    if (isLoggedIn) {
      // This will be implemented in the next phase to start the actual bargaining chat
      console.log("Starting bargaining chat for product:", productId, "variant:", variantId)
      console.log("Customer data:", customerData)

      // For now, we'll just log this action
      // In a real implementation, this would open the chat interface
    } else {
      // Show login prompt if not logged in
      setShowLoginPrompt(true)
    }
  }

  const handleRequestBargaining = () => {
    // This would typically send a request to the store owner
    console.log("Customer requested bargaining for product:", productId)
    // For now, we'll just log this action
  }

  const handleViewEnabledProducts = () => {
    // This would navigate to a page showing all bargaining-enabled products
    console.log("Customer wants to view bargaining-enabled products")
    // For now, we'll just log this action
  }

  const handleLogin = () => {
    // Redirect to Shopify login
    redirectToAuth("login")
  }

  const handleSignup = () => {
    // Redirect to Shopify signup
    redirectToAuth("signup")
  }

  const redirectToAuth = (authType: "login" | "signup") => {
    // Construct the return URL with bargenix_bargain flag
    let returnUrl = window.location.href
    if (returnUrl.includes("?")) {
      returnUrl += "&bargenix_bargain=true"
    } else {
      returnUrl += "?bargenix_bargain=true"
    }

    // Add product and variant IDs
    returnUrl += `&product_id=${encodeURIComponent(productId)}`
    returnUrl += `&variant_id=${encodeURIComponent(variantId)}`

    // Determine the auth URL based on the type
    let authUrl
    if (authType === "signup") {
      authUrl = `https://${shopDomain}/account/register?checkout_url=${encodeURIComponent(returnUrl)}`
    } else {
      authUrl = `https://${shopDomain}/account/login?checkout_url=${encodeURIComponent(returnUrl)}`
    }

    console.log(`Redirecting to Shopify ${authType}: ${authUrl}`)
    window.location.href = authUrl
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={chatbotRef}
      className={cn(
        "fixed z-50 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300",
        isDesktop ? "right-4 bottom-4 w-80 max-w-[90vw] max-h-[80vh]" : "left-4 right-4 bottom-4 max-h-[80vh] mx-auto",
        minimized ? "h-12" : "h-[500px] max-h-[80vh]",
      )}
      style={{ boxShadow: "0 0 20px rgba(0, 0, 0, 0.1)" }}
    >
      {showLoginPrompt ? (
        <ImprovedLoginPrompt
          shopDomain={shopDomain}
          productId={productId}
          variantId={variantId}
          productTitle={productTitle}
          onClose={onClose}
          onLogin={handleLogin}
          onSignup={handleSignup}
          onMinimize={() => setMinimized(!minimized)}
          isMinimized={minimized}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <MoreVertical className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Bargain now</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setMinimized(!minimized)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                aria-label={minimized ? "Expand" : "Minimize"}
              >
                <Minus className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content - only shown when not minimized */}
          {!minimized && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-blue-600 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">
                    <p>{error}</p>
                    <button
                      onClick={checkBargainingStatus}
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center">
                  <div className="h-16 w-16 bg-blue-600 rounded-full mb-4 flex items-center justify-center">
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div className="text-center mb-6">
                    <p className="text-gray-600">
                      Hello! Nice to see you here! By pressing the "
                      {bargainingEnabled ? "Start chat" : "Request for bargaining"}" button you agree to have your
                      personal data processed as described in our Privacy Policy
                    </p>
                  </div>

                  {bargainingEnabled ? (
                    <button
                      onClick={handleStartChat}
                      className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Start chat
                    </button>
                  ) : (
                    <div className="w-full space-y-4">
                      <button className="w-full py-3 bg-red-600 text-white rounded-md" disabled>
                        Bargaining not enabled
                      </button>
                      <p className="text-center text-gray-600">Request for bargaining</p>
                      <button
                        onClick={handleViewEnabledProducts}
                        className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <span>View the bargaining enabled products</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!minimized && <div className="p-2 border-t text-center text-xs text-gray-500">Powered by Bargenix AI</div>}
        </>
      )}
    </div>
  )
}
