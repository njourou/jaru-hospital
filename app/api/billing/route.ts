import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const patientUserId = searchParams.get("patient_id")

  try {
    let query = supabase.from("billing").select(`
        *,
        patient:patients!inner(
          user:users!inner(full_name)
        ),
        appointment:appointments(
          appointment_date,
          doctor:doctors(
            user:users(full_name)
          )
        )
      `)

    if (patientUserId) {
      query = query.eq("patient.user_id", patientUserId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bills: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { patient_user_id, appointment_id, consultation_fee, medicine_cost, room_charges, other_charges } = body

    // Get the actual patient record ID from the patients table
    const { data: patientRecord, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", patient_user_id)
      .single()

    if (patientError || !patientRecord) {
      return NextResponse.json({ error: "Patient not found" }, { status: 400 })
    }

    const total_amount = (consultation_fee || 0) + (medicine_cost || 0) + (room_charges || 0) + (other_charges || 0)

    const { data, error } = await supabase
      .from("billing")
      .insert({
        patient_id: patientRecord.id,
        appointment_id,
        consultation_fee,
        medicine_cost,
        room_charges,
        other_charges,
        total_amount,
        payment_status: "pending",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bill: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { id, payment_status } = body

    const updateData: any = { payment_status }
    if (payment_status === "paid") {
      updateData.payment_date = new Date().toISOString()
    }

    const { data, error } = await supabase.from("billing").update(updateData).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bill: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
