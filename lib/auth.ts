import { supabase } from "./supabase/client"

export interface User {
  id: string
  email: string
  role: "doctor" | "patient"
  full_name: string
  phone?: string
  age?: number
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

// Client-side authentication functions
export const signUp = async (
  email: string,
  password: string,
  userData: {
    full_name: string
    role: "doctor" | "patient"
    phone?: string
    age?: number
    specialization?: string
    license_number?: string
    department?: string
  },
): Promise<AuthResponse> => {
  try {
    // First, create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return { user: null, error: authError.message }
    }

    if (!authData.user) {
      return { user: null, error: "Failed to create user" }
    }

    // Then create user record in our users table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        role: userData.role,
        full_name: userData.full_name,
        phone: userData.phone,
        age: userData.age,
      })
      .select()
      .single()

    if (userError) {
      return { user: null, error: userError.message }
    }

    // Create role-specific record
    if (userData.role === "doctor") {
      const { error: doctorError } = await supabase.from("doctors").insert({
        user_id: authData.user.id,
        specialization: userData.specialization || "General Medicine",
        license_number: userData.license_number || `LIC${Date.now()}`,
        department: userData.department || "General",
        experience_years: 0,
      })

      if (doctorError) {
        return { user: null, error: doctorError.message }
      }
    } else {
      const { error: patientError } = await supabase.from("patients").insert({
        user_id: authData.user.id,
        blood_group: "O+", // Default value
        emergency_contact: userData.phone || "",
      })

      if (patientError) {
        return { user: null, error: patientError.message }
      }
    }

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        full_name: userRecord.full_name,
        phone: userRecord.phone,
        age: userRecord.age,
      },
      error: null,
    }
  } catch (error) {
    return { user: null, error: "An unexpected error occurred" }
  }
}

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return { user: null, error: authError.message }
    }

    if (!authData.user) {
      return { user: null, error: "Failed to sign in" }
    }

    // Get user details from our users table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    if (userError) {
      return { user: null, error: userError.message }
    }

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        full_name: userRecord.full_name,
        phone: userRecord.phone,
        age: userRecord.age,
      },
      error: null,
    }
  } catch (error) {
    return { user: null, error: "An unexpected error occurred" }
  }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) return null

    const { data: userRecord } = await supabase.from("users").select("*").eq("id", authUser.id).single()

    if (!userRecord) return null

    return {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      full_name: userRecord.full_name,
      phone: userRecord.phone,
      age: userRecord.age,
    }
  } catch (error) {
    return null
  }
}
