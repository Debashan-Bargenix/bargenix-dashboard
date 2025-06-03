"use server"

import { revalidatePath } from "next/cache"
import { queryDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Submit feedback
export async function submitFeedback(prevState: any, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to submit feedback" }
    }

    const category = formData.get("category") as string
    const subject = formData.get("subject") as string
    const message = formData.get("message") as string
    const rating = formData.get("rating") as string

    if (!category || !subject || !message) {
      return { success: false, message: "Please fill in all required fields" }
    }

    // Store feedback in database
    await queryDb(
      `
      INSERT INTO user_feedback (
        user_id, 
        category, 
        subject, 
        message, 
        rating,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'open', NOW())
    `,
      [user.id, category, subject, message, rating ? Number.parseInt(rating) : null],
    )

    // TODO: Send email notification to support team
    // You can integrate with your email service here

    revalidatePath("/dashboard/contact")
    return {
      success: true,
      message: "Thank you for your feedback! We'll review it and get back to you soon.",
    }
  } catch (error: any) {
    console.error("Error submitting feedback:", error)
    return {
      success: false,
      message: "Failed to submit feedback. Please try again.",
    }
  }
}

// Submit bug report
export async function submitBugReport(prevState: any, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to report bugs" }
    }

    const severity = formData.get("severity") as string
    const subject = formData.get("subject") as string
    const description = formData.get("description") as string
    const stepsToReproduce = formData.get("stepsToReproduce") as string
    const expectedBehavior = formData.get("expectedBehavior") as string
    const actualBehavior = formData.get("actualBehavior") as string
    const browserInfo = formData.get("browserInfo") as string

    if (!severity || !subject || !description) {
      return { success: false, message: "Please fill in all required fields" }
    }

    // Store bug report in database
    await queryDb(
      `
      INSERT INTO bug_reports (
        user_id,
        severity,
        subject,
        description,
        steps_to_reproduce,
        expected_behavior,
        actual_behavior,
        browser_info,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', NOW())
    `,
      [user.id, severity, subject, description, stepsToReproduce, expectedBehavior, actualBehavior, browserInfo],
    )

    // TODO: Send email notification to development team
    // You can integrate with your email service here

    revalidatePath("/dashboard/contact")
    return {
      success: true,
      message: "Bug report submitted successfully! Our development team will investigate this issue.",
    }
  } catch (error: any) {
    console.error("Error submitting bug report:", error)
    return {
      success: false,
      message: "Failed to submit bug report. Please try again.",
    }
  }
}

// Get user's feedback history
export async function getUserFeedback(userId: number) {
  try {
    const feedback = await queryDb(
      `
      SELECT * FROM user_feedback 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `,
      [userId],
    )
    return feedback
  } catch (error) {
    console.error("Error fetching user feedback:", error)
    return []
  }
}

// Get user's bug reports
export async function getUserBugReports(userId: number) {
  try {
    const reports = await queryDb(
      `
      SELECT * FROM bug_reports 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `,
      [userId],
    )
    return reports
  } catch (error) {
    console.error("Error fetching bug reports:", error)
    return []
  }
}
