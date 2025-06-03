import SignupForm from "./signup-form"
import Link from "next/link"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Brand/Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative">
        <div>
          <Link href="/" className="flex items-center">
            <span className="text-white text-2xl font-bold">Bargenix</span>
          </Link>
        </div>

        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-bold text-white">Start your journey with Bargenix</h1>
          <p className="text-primary-foreground/80 text-lg">
            Create an account to unlock powerful bargaining tools for your e-commerce store and boost your sales.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">AI-Powered Bargaining</p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">Real-time Analytics</p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">Customer Insights</p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">Secure Platform</p>
            </div>
          </div>
        </div>

        <div className="text-primary-foreground/70 text-sm">
          © {new Date().getFullYear()} Bargenix. All rights reserved.
        </div>

        {/* Background pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center">
              <span className="text-primary text-2xl font-bold">Bargenix</span>
            </Link>
          </div>

          <SignupForm />
        </div>
      </div>
    </div>
  )
}
