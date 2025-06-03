import LoginForm from "./login-form"
import Link from "next/link"

export default function LoginPage() {
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
          <h1 className="text-4xl font-bold text-white">Welcome back to Bargenix</h1>
          <p className="text-primary-foreground/80 text-lg">
            Log in to your account to manage your store, track analytics, and engage with your customers.
          </p>

          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <p className="text-white font-medium mb-2">
              "Bargenix has transformed how we handle customer negotiations. Our conversion rates are up 35% since
              implementation."
            </p>
            <div className="flex items-center mt-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                JD
              </div>
              <div className="ml-3">
                <p className="text-white font-medium">Jane Doe</p>
                <p className="text-primary-foreground/70 text-sm">CEO, TechRetail Inc.</p>
              </div>
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

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center">
              <span className="text-primary text-2xl font-bold">Bargenix</span>
            </Link>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
