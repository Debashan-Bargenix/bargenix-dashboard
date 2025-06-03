"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { signup } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  Building,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Github,
  Linkedin,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

const initialState = {
  success: true,
  message: "",
  errors: {},
}

export default function SignupForm() {
  const [state, formAction] = useActionState(signup, initialState)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    mobileNumber: "",
    password: "",
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "password") {
      checkPasswordStrength(value)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("firstName", formData.firstName)
    formDataObj.append("lastName", formData.lastName)
    formDataObj.append("companyName", formData.companyName)
    formDataObj.append("email", formData.email)
    formDataObj.append("password", formData.password)
    if (formData.mobileNumber) {
      formDataObj.append("mobileNumber", formData.mobileNumber)
    }

    try {
      await formAction(formDataObj)
    } catch (error) {
      console.error("Signup error:", error)
      setIsLoading(false)
    }
  }

  // Reset loading state if there's an error
  useEffect(() => {
    if (!state.success && (state.message || Object.keys(state.errors || {}).length > 0)) {
      setIsLoading(false)
    }
  }, [state])

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let score = 0
    if (password.length > 6) score += 1
    if (password.length > 10) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    setPasswordStrength(score)
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-200"
    if (passwordStrength < 3) return "bg-red-500"
    if (passwordStrength < 5) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "Enter a password"
    if (passwordStrength < 3) return "Weak password"
    if (passwordStrength < 5) return "Medium password"
    return "Strong password"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Enter your information to get started</p>
        </div>

        {!state.success && state.message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First name
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className="pl-10 h-11"
                  placeholder="John"
                  disabled={isLoading || isRedirecting}
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              {state.errors?.firstName && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-1">
                  {state.errors.firstName[0]}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last name
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className="pl-10 h-11"
                  placeholder="Doe"
                  disabled={isLoading || isRedirecting}
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              {state.errors?.lastName && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-1">
                  {state.errors.lastName[0]}
                </motion.p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium">
              Company name
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Building className="h-4 w-4" />
              </div>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                required
                className="pl-10 h-11"
                placeholder="Acme Inc."
                disabled={isLoading || isRedirecting}
                value={formData.companyName}
                onChange={handleChange}
              />
            </div>
            {state.errors?.companyName && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-1">
                {state.errors.companyName[0]}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Mail className="h-4 w-4" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="pl-10 h-11"
                placeholder="you@example.com"
                disabled={isLoading || isRedirecting}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {state.errors?.email && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-1">
                {state.errors.email[0]}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileNumber" className="text-sm font-medium">
              Mobile number
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Phone className="h-4 w-4" />
              </div>
              <Input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                autoComplete="tel"
                className="pl-10 h-11"
                placeholder="+1 (555) 123-4567"
                disabled={isLoading || isRedirecting}
                value={formData.mobileNumber}
                onChange={handleChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">We'll send you a verification code via SMS</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="pl-10 pr-10 h-11"
                disabled={isLoading || isRedirecting}
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {state.errors?.password && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-1">
                {state.errors.password[0]}
              </motion.p>
            )}

            {/* Password strength indicator */}
            <div className="mt-2">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${getPasswordStrengthColor()}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${passwordStrength * 20}%` }}
                  transition={{ duration: 0.3 }}
                ></motion.div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPasswordStrengthText()}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              name="terms"
              required
              className="mt-1"
              disabled={isLoading || isRedirecting}
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(!!checked)}
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium transition-all"
          disabled={isLoading || isRedirecting || !termsAccepted}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </div>
          ) : isRedirecting ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Redirecting...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span>Create account</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" type="button" disabled={isLoading || isRedirecting} className="h-11">
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
          <Button variant="outline" type="button" disabled={isLoading || isRedirecting} className="h-11">
            <Github className="h-5 w-5" />
          </Button>
          <Button variant="outline" type="button" disabled={isLoading || isRedirecting} className="h-11">
            <Linkedin className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account?</span>{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </motion.div>
  )
}
