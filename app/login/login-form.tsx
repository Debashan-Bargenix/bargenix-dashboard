"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { login } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, Github, Linkedin } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

const initialState = {
  success: true,
  message: "",
  errors: {},
}

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Modified to handle redirection manually if needed
  useEffect(() => {
    if (state.success && state.message === "success") {
      setIsRedirecting(true)
      // Add a manual redirect as a fallback
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    }
  }, [state, router])

  // Reset loading state if there's an error
  useEffect(() => {
    if (!state.success && (state.message || Object.keys(state.errors || {}).length > 0)) {
      setIsLoading(false)
    }
  }, [state])

  // This function will be called before the form is submitted
  const handleFormSubmit = () => {
    setIsLoading(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <form
        action={formAction}
        onSubmit={handleFormSubmit}
        className="space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border dark:border-slate-700"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Welcome back</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-300">Enter your credentials to sign in</p>
        </div>

        {!state.success && state.message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive" className="py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium dark:text-slate-200">
              Email address
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground dark:text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="pl-10 h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-400"
                placeholder="you@example.com"
                disabled={isLoading || isRedirecting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {state.errors?.email && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-500 dark:text-red-400 mt-1"
              >
                {state.errors.email[0]}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium dark:text-slate-200">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground dark:text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pl-10 pr-10 h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                disabled={isLoading || isRedirecting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {state.errors?.password && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-500 dark:text-red-400 mt-1"
              >
                {state.errors.password[0]}
              </motion.p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              disabled={isLoading || isRedirecting}
              className="dark:border-slate-600 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600"
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-300"
            >
              Remember me
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium transition-all dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
          disabled={isLoading || isRedirecting}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : isRedirecting ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Redirecting...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span>Sign in</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground dark:bg-slate-800 dark:text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            type="button"
            disabled={isLoading || isRedirecting}
            className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading || isRedirecting}
            className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Github className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading || isRedirecting}
            className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Linkedin className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center text-sm">
          <span className="text-muted-foreground dark:text-slate-400">Don't have an account?</span>{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign up
          </Link>
        </div>
      </form>
    </motion.div>
  )
}
