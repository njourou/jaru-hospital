"use client"

import { useEffect, useState } from "react"

export default function EnvChecker() {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: boolean
    supabaseAnonKey: boolean
  }>({
    supabaseUrl: false,
    supabaseAnonKey: false,
  })

  useEffect(() => {
    setEnvStatus({
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }, [])

  // Only show this in development
  if (process.env.NODE_ENV === "production") {
    return null
  }

  const hasAllEnvVars = envStatus.supabaseUrl && envStatus.supabaseAnonKey

  if (hasAllEnvVars) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto">
        <h3 className="font-bold mb-2">⚠️ Missing Environment Variables</h3>
        <div className="text-sm space-y-1">
          {!envStatus.supabaseUrl && <div>❌ NEXT_PUBLIC_SUPABASE_URL is missing</div>}
          {!envStatus.supabaseAnonKey && <div>❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing</div>}
        </div>
        <p className="text-sm mt-2 opacity-90">
          Please check your environment variables in the Vercel dashboard or .env.local file.
        </p>
      </div>
    </div>
  )
}
