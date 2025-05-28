import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createServerClient()

  try {
    const { data, error } = await supabase.from("medicines").select("*").order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ medicines: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { name, category, stock_quantity, price_per_unit, description, manufacturer } = body

    // Ensure the values are properly typed - remove the parsing since they're already numbers
    const { data, error } = await supabase
      .from("medicines")
      .insert({
        name,
        category,
        stock_quantity: Number(stock_quantity), // Ensure it's a number
        price_per_unit: Number(price_per_unit), // Ensure it's a number
        description: description || null, // Handle empty strings
        manufacturer: manufacturer || null, // Handle empty strings
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ medicine: data }, { status: 201 })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { id, stock_quantity, price_per_unit } = body

    const { data, error } = await supabase
      .from("medicines")
      .update({
        stock_quantity,
        price_per_unit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ medicine: data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
