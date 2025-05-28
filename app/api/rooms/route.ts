import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createServerClient()

  try {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        room_assignments!inner(
          *,
          patient:patients(
            user:users(full_name)
          )
        )
      `)
      .eq("room_assignments.status", "active")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ rooms: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { patient_user_id, room_id, admission_date } = body

    // Get the actual patient record ID from the patients table
    const { data: patientRecord, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", patient_user_id)
      .single()

    if (patientError || !patientRecord) {
      return NextResponse.json({ error: "Patient not found" }, { status: 400 })
    }

    // First, update room status to occupied
    await supabase.from("rooms").update({ status: "occupied" }).eq("id", room_id)

    // Then create room assignment
    const { data, error } = await supabase
      .from("room_assignments")
      .insert({
        patient_id: patientRecord.id,
        room_id,
        admission_date,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
