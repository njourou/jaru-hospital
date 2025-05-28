import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const patientUserId = searchParams.get("patient_id")
  const doctorUserId = searchParams.get("doctor_id")

  try {
    let query = supabase.from("appointments").select(`
        id,
        appointment_date,
        appointment_time,
        symptoms,
        status,
        notes,
        created_at,
        patient:patients(
          id,
          blood_group,
          emergency_contact,
          user:users(
            id,
            full_name,
            email,
            phone,
            age
          )
        ),
        doctor:doctors(
          id,
          specialization,
          license_number,
          department,
          user:users(
            id,
            full_name,
            email
          )
        )
      `)

    // Apply filters if provided
    if (patientUserId) {
      // First get the patient record for this user
      const { data: patientRecord } = await supabase.from("patients").select("id").eq("user_id", patientUserId).single()

      if (patientRecord) {
        query = query.eq("patient_id", patientRecord.id)
      } else {
        // No patient record found, return empty array
        return NextResponse.json({ appointments: [] })
      }
    }

    if (doctorUserId) {
      // First get the doctor record for this user
      const { data: doctorRecord } = await supabase.from("doctors").select("id").eq("user_id", doctorUserId).single()

      if (doctorRecord) {
        query = query.eq("doctor_id", doctorRecord.id)
      } else {
        // No doctor record found, return empty array
        return NextResponse.json({ appointments: [] })
      }
    }

    const { data, error } = await query.order("appointment_date", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ appointments: data || [] })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    console.log("Received appointment data:", body)

    const { patient_id, doctor_id, appointment_date, appointment_time, symptoms } = body

    // Validate required fields
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the actual patient record ID from the patients table
    console.log("Looking for patient with user_id:", patient_id)
    const { data: patientRecord, error: patientError } = await supabase
      .from("patients")
      .select("id, user_id")
      .eq("user_id", patient_id)
      .single()

    console.log("Patient query result:", { patientRecord, patientError })

    if (patientError) {
      console.error("Patient lookup error:", patientError)
      return NextResponse.json({ error: `Patient lookup failed: ${patientError.message}` }, { status: 400 })
    }

    if (!patientRecord) {
      return NextResponse.json({ error: "Patient record not found" }, { status: 400 })
    }

    // Get the actual doctor record ID from the doctors table
    console.log("Looking for doctor with user_id:", doctor_id)
    const { data: doctorRecord, error: doctorError } = await supabase
      .from("doctors")
      .select("id, user_id")
      .eq("user_id", doctor_id)
      .single()

    console.log("Doctor query result:", { doctorRecord, doctorError })

    if (doctorError) {
      console.error("Doctor lookup error:", doctorError)
      return NextResponse.json({ error: `Doctor lookup failed: ${doctorError.message}` }, { status: 400 })
    }

    if (!doctorRecord) {
      return NextResponse.json({ error: "Doctor record not found" }, { status: 400 })
    }

    // Create the appointment
    const appointmentData = {
      patient_id: patientRecord.id,
      doctor_id: doctorRecord.id,
      appointment_date,
      appointment_time,
      symptoms: symptoms || "",
      status: "pending",
    }

    console.log("Creating appointment with data:", appointmentData)

    const { data, error } = await supabase.from("appointments").insert(appointmentData).select().single()

    if (error) {
      console.error("Appointment creation error:", error)
      return NextResponse.json({ error: `Failed to create appointment: ${error.message}` }, { status: 400 })
    }

    console.log("Appointment created successfully:", data)
    return NextResponse.json({ appointment: data }, { status: 201 })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { id, status, notes } = body

    const { data, error } = await supabase
      .from("appointments")
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ appointment: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
