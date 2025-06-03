"use server"

import { redirect } from "next/navigation"
import { createUser, loginUser, logoutUser, hashPassword, verifyPassword } from "@/lib/auth"
import { queryDb } from "@/lib/db" // Import queryDb from the correct location
import { z } from "zod"
import { revalidatePath } from "next/cache"

// Validation schema for signup
const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  mobileNumber: z.string().optional(),
})

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
})

// Validation schema for profile update
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
})

// Validation schema for password change
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Signup action
export async function signup(prevState: any, formData: FormData) {
  try {
    const rawData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      companyName: formData.get("companyName") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      mobileNumber: formData.get("mobileNumber") as string,
    }

    console.log("Signup data received:", { ...rawData, password: "***" })

    // Validate form data
    const validationResult = signupSchema.safeParse(rawData)

    if (!validationResult.success) {
      console.log("Validation failed:", validationResult.error.flatten().fieldErrors)
      return {
        success: false,
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    // Create user
    const user = await createUser(rawData)
    console.log("User created successfully:", user.id)

    // Log in the user automatically
    await loginUser(rawData.email, rawData.password, true)
    console.log("User logged in automatically")

    // Return success before redirecting
    return {
      success: true,
      message: "success",
    }
  } catch (error: any) {
    console.error("Signup error:", error)
    return {
      success: false,
      message: error.message || "An error occurred during signup",
    }
  }
}

// Login action
export async function login(prevState: any, formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      rememberMe: formData.get("rememberMe") === "on",
    }

    console.log("Login attempt for:", rawData.email)

    // Validate form data
    const validationResult = loginSchema.safeParse(rawData)

    if (!validationResult.success) {
      console.log("Validation failed:", validationResult.error.flatten().fieldErrors)
      return {
        success: false,
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    // Log in the user
    await loginUser(rawData.email, rawData.password, rawData.rememberMe)
    console.log("Login successful for:", rawData.email)

    // Return success before redirecting
    return {
      success: true,
      message: "success",
    }
  } catch (error: any) {
    console.error("Login error:", error)
    return {
      success: false,
      message: error.message || "Invalid email or password",
    }
  }
}

// Logout action
export async function logout() {
  await logoutUser()
  redirect("/login")
}

// Update profile action
export async function updateProfile(prevState: any, formData: FormData) {
  const rawData = {
    userId: Number.parseInt(formData.get("userId") as string),
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    companyName: formData.get("companyName") as string,
    email: formData.get("email") as string,
  }

  // Validate form data
  const validationResult = profileUpdateSchema.safeParse(rawData)

  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    // Check if email is already taken by another user
    const existingUsers = await queryDb(`SELECT id FROM users WHERE email = $1 AND id != $2`, [
      rawData.email,
      rawData.userId,
    ])

    if (existingUsers.length > 0) {
      return {
        success: false,
        message: "Email is already taken by another user",
      }
    }

    // Update user profile
    await queryDb(
      `UPDATE users 
       SET first_name = $1, last_name = $2, company_name = $3, email = $4, updated_at = NOW() 
       WHERE id = $5`,
      [rawData.firstName, rawData.lastName, rawData.companyName, rawData.email, rawData.userId],
    )

    revalidatePath("/dashboard/account")

    return {
      success: true,
      message: "Profile updated successfully",
    }
  } catch (error: any) {
    console.error("Profile update error:", error)
    return {
      success: false,
      message: error.message || "An error occurred while updating your profile",
    }
  }
}

// Change password action
export async function changePassword(prevState: any, formData: FormData) {
  const rawData = {
    userId: Number.parseInt(formData.get("userId") as string),
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  // Validate form data
  const validationResult = passwordChangeSchema.safeParse(rawData)

  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    // Get current password hash
    const users = await queryDb(`SELECT password_hash FROM users WHERE id = $1`, [rawData.userId])

    if (users.length === 0) {
      return {
        success: false,
        message: "User not found",
      }
    }

    const user = users[0]

    // Verify current password
    const isPasswordValid = await verifyPassword(rawData.currentPassword, user.password_hash)

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Current password is incorrect",
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(rawData.newPassword)

    // Update password
    await queryDb(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      newPasswordHash,
      rawData.userId,
    ])

    return {
      success: true,
      message: "Password changed successfully",
    }
  } catch (error: any) {
    console.error("Password change error:", error)
    return {
      success: false,
      message: error.message || "An error occurred while changing your password",
    }
  }
}
