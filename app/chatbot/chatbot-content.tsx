"use client"

import { useState, useEffect } from "react"
import { X, Minus, MoreVertical, ArrowRight, RefreshCw, AlertCircle, MessageSquare, DollarSign } from "lucide-react"
import { useSearchParams } from "next/navigation"

export function ChatbotContent() {
  const searchParams = useSearchParams()
  const shopDomain = searchParams.get("shop") || ""
  const productId = searchParams.get("productId") || ""
  const variantId = searchParams.get("variantId") || "default"
  const productTitle = searchParams.get("productTitle") || ""
  const productPrice = searchParams.get("productPrice") || "0"

  const [productData, setProductData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    checkBargainingStatus()
  }, [retryCount])

  const checkBargainingStatus = async () => {
    if (!shopDomain || !productId) {
      setError("Missing shop or product information")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Set a client-side timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      console.log(`Checking bargaining status for ${productId} at ${shopDomain}`)

      // Add a cache-busting parameter to prevent caching
      const timestamp = new Date().getTime()
      const response = await fetch(
        `/api/bargain/product-check?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(
          productId,
        )}&variantId=${encodeURIComponent(variantId)}&t=${timestamp}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          cache: "no-store",
        },
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API error response:", response.status, errorData)
        throw new Error(errorData.error || `Server returned ${response.status}`)
      }

      const data = await response.json()
      console.log("Product data received:", data)

      // Merge data with URL params if needed
      const mergedData = {
        ...data,
        productTitle: data.productTitle || productTitle,
        productPrice: data.productPrice || productPrice,
      }

      setProductData(mergedData)

      // Track this view in the background
      trackChatbotView(shopDomain, productId, variantId, data.bargainingEnabled)
    } catch (err: any) {
      console.error("Error checking product:", err)

      if (err.name === "AbortError") {
        setError("Request timed out. Please try again.")
      } else {
        setError(err.message || "Failed to check if bargaining is enabled for this product")
      }
    } finally {
      setLoading(false)
    }
  }

  const trackChatbotView = async (shop: string, productId: string, variantId: string, enabled: boolean) => {
    try {
      // Use the Beacon API for non-blocking tracking
      if (navigator.sendBeacon) {
        const blob = new Blob(
          [
            JSON.stringify({
              shop,
              productId,
              variantId,
              action: "chatbot_view",
              bargainingEnabled: enabled,
              userAgent: navigator.userAgent,
              referrer: document.referrer,
            }),
          ],
          { type: "application/json" },
        )

        navigator.sendBeacon("/api/bargain/track", blob)
      } else {
        // Fall back to fetch if Beacon API is not available
        fetch(`/api/bargain/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop,
            productId,
            variantId,
            action: "chatbot_view",
            bargainingEnabled: enabled,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          }),
          // Use keepalive to ensure the request completes even if the page unloads
          keepalive: true,
        }).catch((err) => console.error("Error tracking view:", err))
      }
    } catch (error) {
      // Silently fail for tracking errors
      console.error("Error tracking chatbot view:", error)
    }
  }

  const handleStartChat = () => {
    // This will be implemented in the next phase to start the actual bargaining chat
    console.log("Starting bargaining chat for product:", productId, "variant:", variantId)

    // Track this action
    try {
      fetch(`/api/bargain/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop: shopDomain,
          productId,
          variantId,
          action: "start_chat",
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        }),
        keepalive: true,
      }).catch((err) => console.error("Error tracking start chat:", err))
    } catch (error) {
      console.error("Error tracking start chat:", error)
    }
  }

  const handleViewEnabledProducts = () => {
    // Track this action
    try {
      fetch(`/api/bargain/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop: shopDomain,
          productId,
          variantId,
          action: "view_enabled_products",
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        }),
        keepalive: true,
      }).catch((err) => console.error("Error tracking view products:", err))
    } catch (error) {
      console.error("Error tracking view enabled products:", error)
    }

    // Open a new window/tab with the store's collection page
    window.open(`https://${shopDomain}/collections/all`, "_blank")
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  const handleClose = () => {
    if (window.parent) {
      window.parent.postMessage({ type: "bargenix_close" }, "*")
    }
  }

  const handleMinimize = () => {
    if (window.parent) {
      window.parent.postMessage({ type: "bargenix_minimize" }, "*")
    }
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <MoreVertical className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Bargain now</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleMinimize}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600">Checking product...</p>
        </div>

        <div className="p-2 border-t text-center text-xs text-gray-500">Powered by Bargenix AI</div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <MoreVertical className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Bargain now</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleMinimize}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-red-500 font-medium mb-2">Something went wrong</p>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </button>
        </div>

        <div className="p-2 border-t text-center text-xs text-gray-500">Powered by Bargenix AI</div>
      </div>
    )
  }

  // Render bargaining enabled state
  if (productData && productData.bargainingEnabled) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <MoreVertical className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Bargain now</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleMinimize}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center">
          <div className="h-16 w-16 bg-green-600 rounded-full mb-4 flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-xl font-bold text-center mb-2">Bargaining Enabled</h2>

          <p className="text-center mb-4">
            You can negotiate the price for this product. Start a chat to begin the bargaining process.
          </p>

          <div className="w-full bg-gray-100 rounded-lg p-3 mb-4">
            <div className="flex items-center mb-2">
              <div className="w-12 h-12 bg-gray-300 rounded-md mr-3 overflow-hidden">
                {productData.productImage && (
                  <img
                    src={productData.productImage || "/placeholder.svg"}
                    alt={productData.productTitle}
                    className="w-full h-full object-cover"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                )}
              </div>
              <div>
                <p className="font-medium">{productData.productTitle || "Product"}</p>
                <p className="text-gray-600">${productData.productPrice || "0.00"}</p>
              </div>
            </div>

            {productData.minPrice && (
              <div className="text-sm text-gray-600 mt-2">
                <p>Minimum price: ${productData.minPrice.toFixed(2)}</p>
                {productData.minPricePercentage && <p>({productData.minPricePercentage}% of original price)</p>}
                {productData.bargainingBehavior && <p>Behavior: {productData.bargainingBehavior}</p>}
              </div>
            )}
          </div>

          <button
            onClick={handleStartChat}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Start Bargaining
          </button>
        </div>

        <div className="p-2 border-t text-center text-xs text-gray-500">Powered by Bargenix AI</div>
      </div>
    )
  }

  // Render bargaining not enabled state
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <MoreVertical className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Bargain now</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleMinimize}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="h-16 w-16 bg-red-600 rounded-full mb-4 flex items-center justify-center">
          <X className="h-8 w-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-center mb-2">Bargaining Not Available</h2>

        <p className="text-center mb-4">
          {productData && productData.message
            ? productData.message
            : "Sorry, bargaining is not enabled for this specific product or variant."}
        </p>

        <div className="w-full bg-gray-100 rounded-lg p-3 mb-4">
          <div className="flex items-center mb-2">
            <div className="w-12 h-12 bg-gray-300 rounded-md mr-3 overflow-hidden">
              {productData && productData.productImage && (
                <img
                  src={productData.productImage || "/placeholder.svg"}
                  alt={productData.productTitle}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              )}
            </div>
            <div>
              <p className="font-medium">{productData ? productData.productTitle : productTitle || "Product"}</p>
              <p className="text-gray-600">${productData ? productData.productPrice : productPrice || "0.00"}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleViewEnabledProducts}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <span>View bargaining enabled products</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>

      <div className="p-2 border-t text-center text-xs text-gray-500">Powered by Bargenix AI</div>
    </div>
  )
}
