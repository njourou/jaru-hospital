import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const patientUserId = searchParams.get("patient_id")

  try {
    let query = supabase.from("prescriptions").select(`
        *,
        medicine:medicines(name, category),
        appointment:appointments(
          appointment_date,
          doctor:doctors(
            user:users(full_name)
          )
        )
      `)

    if (patientUserId) {
      // First get the patient record for this user
      const { data: patientRecord } = await supabase.from("patients").select("id").eq("user_id", patientUserId).single()

      if (patientRecord) {
        // Get appointments for this patient
        const { data: patientAppointments } = await supabase
          .from("appointments")
          .select("id")
          .eq("patient_id", patientRecord.id)

        if (patientAppointments && patientAppointments.length > 0) {
          const appointmentIds = patientAppointments.map((apt) => apt.id)
          query = query.in("appointment_id", appointmentIds)
        } else {
          // No appointments found, return empty array
          return NextResponse.json({ prescriptions: [] })
        }
      } else {
        // No patient record found, return empty array
        return NextResponse.json({ prescriptions: [] })
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Prescriptions query error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Filter out any prescriptions with null appointment or doctor data
    const validPrescriptions = (data || []).filter(
      (prescription) =>
        prescription.appointment && prescription.appointment.doctor && prescription.appointment.doctor.user,
    )

    return NextResponse.json({ prescriptions: validPrescriptions })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { appointment_id, medicine_id, dosage, frequency, duration, instructions } = body

    const { data, error } = await supabase
      .from("prescriptions")
      .insert({
        appointment_id,
        medicine_id,
        dosage,
        frequency,
        duration,
        instructions,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ prescription: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
