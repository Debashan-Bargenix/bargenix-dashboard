import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { queryDb } from "./db"

// Auth options for NextAuth (Note: This project uses a custom auth system, so NextAuth options are minimal)
export const authOptions = {
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// Create a new user
export async function createUser(userData: {
  firstName: string
  lastName: string
  companyName: string
  email: string
  password: string
  mobileNumber?: string
}) {
  const { firstName, lastName, companyName, email, password, mobileNumber } = userData
  const hashedPassword = await hashPassword(password)

  try {
    // Get the free plan ID
    const freePlanResult = await queryDb(`SELECT id FROM membership_plans WHERE slug = 'free' LIMIT 1`)

    const freePlanId = freePlanResult.length > 0 ? freePlanResult[0].id : null

    // Insert the user with the free plan
    const result = await queryDb(
      `INSERT INTO users (first_name, last_name, company_name, email, password_hash, current_plan_id, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [firstName, lastName, companyName, email, hashedPassword, freePlanId, mobileNumber || null],
    )

    const userId = result[0].id

    // Create user membership record
    if (freePlanId) {
      await queryDb(
        `INSERT INTO user_memberships (user_id, plan_id, status) 
         VALUES ($1, $2, 'active')`,
        [userId, freePlanId],
      )
    }

    return result[0]
  } catch (error: any) {
    if (error.message.includes("duplicate key")) {
      throw new Error("Email already exists")
    }
    throw error
  }
}

// Create a session for a user
export async function createSession(userId: number) {
  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // Session expires in 7 days

  await queryDb(
    `INSERT INTO sessions (user_id, session_token, expires_at) 
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt],
  )

  cookies().set({
    name: "session_token",
    value: token,
    httpOnly: true,
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  return token
}

// Get the current user from the session
export async function getCurrentUser() {
  const sessionToken = cookies().get("session_token")?.value

  if (!sessionToken) {
    return null
  }

  try {
    const result = await queryDb(
      `SELECT u.*, mp.name as plan_name, mp.slug as plan_slug, ss.shop_domain as shopify_store_domain
       FROM users u
       LEFT JOIN membership_plans mp ON u.current_plan_id = mp.id
       LEFT JOIN shopify_stores ss ON u.id = ss.user_id -- Join with shopify_stores to get shop_domain
       JOIN sessions s ON u.id = s.user_id
       WHERE s.session_token = $1 AND s.expires_at > NOW()`,
      [sessionToken],
    )

    if (result.length === 0) {
      return null
    }

    return result[0]
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

// Log in a user
export async function loginUser(email: string, password: string, rememberMe = false) {
  try {
    const users = await queryDb(`SELECT * FROM users WHERE email = $1`, [email])

    if (users.length === 0) {
      throw new Error("Invalid email or password")
    }

    const user = users[0]
    const passwordValid = await verifyPassword(password, user.password_hash)

    if (!passwordValid) {
      throw new Error("Invalid email or password")
    }

    // Create a session
    await createSession(user.id)

    return user
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

// Log out a user
export async function logoutUser() {
  const sessionToken = cookies().get("session_token")?.value

  if (sessionToken) {
    await queryDb(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken])

    cookies().delete("session_token")
  }
}

// Middleware to check if user is authenticated
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export const auth = async () => {
  return {
    user: await getCurrentUser(),
  }
}

export const getUser = getCurrentUser
