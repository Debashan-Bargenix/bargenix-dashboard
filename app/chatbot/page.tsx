import { Suspense } from "react"
import { ChatbotContent } from "./chatbot-content"

export default function ChatbotPage() {
  return (
    <Suspense fallback={<ChatbotLoading />}>
      <ChatbotContent />
    </Suspense>
  )
}

function ChatbotLoading() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-6 w-6 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-6 w-6 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="h-16 w-16 bg-blue-300 rounded-full mb-4 animate-pulse"></div>
        <div className="h-4 w-48 bg-gray-300 rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-64 bg-gray-300 rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-56 bg-gray-300 rounded mb-6 animate-pulse"></div>
        <div className="h-10 w-full max-w-xs bg-blue-300 rounded animate-pulse"></div>
      </div>
      <div className="p-2 border-t text-center">
        <div className="h-4 w-32 bg-gray-300 rounded mx-auto animate-pulse"></div>
      </div>
    </div>
  )
}
