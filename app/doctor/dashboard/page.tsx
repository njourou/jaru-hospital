"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Sidebar from "@/components/layout/sidebar"
import {
  Users,
  Pill,
  Package,
  Bed,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Save,
  UserCheck,
  Loader2,
  X,
  CreditCard,
  Clock,
} from "lucide-react"
import jsPDF from "jspdf"

interface Patient {
  id: string
  user: {
    full_name: string
    email: string
    phone: string
    age: number
  }
  blood_group: string
  emergency_contact: string
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  symptoms: string
  status: string
  notes?: string
  patient: Patient
}

interface Medicine {
  id: string
  name: string
  category: string
  stock_quantity: number
  price_per_unit: number
  description?: string
  manufacturer?: string
}

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  daily_rate: number
  status: string
  room_assignments?: Array<{
    id: string
    admission_date: string
    status: string
    patient: {
      user: {
        full_name: string
      }
    }
  }>
}

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Appointment | null>(null)
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showEditMedicine, setShowEditMedicine] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [showRoomAssignment, setShowRoomAssignment] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [bills, setBills] = useState([])

  // Form states
  const [consultationNotes, setConsultationNotes] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [treatmentPlan, setTreatmentPlan] = useState("")
  const [newMedicine, setNewMedicine] = useState({
    name: "",
    category: "",
    stock_quantity: "",
    price_per_unit: "",
    description: "",
    manufacturer: "",
  })

  const [roomAssignmentData, setRoomAssignmentData] = useState({
    patient_id: "",
    room_id: "",
    admission_date: "",
  })

  const [prescriptionData, setPrescriptionData] = useState({
    appointment_id: "",
    medicine_id: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  })

  const [billingData, setBillingData] = useState({
    patient_id: "",
    appointment_id: "",
    consultation_fee: "",
    medicine_cost: "",
    room_charges: "",
    other_charges: "",
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/")
      return
    }
    if (user.role !== "doctor") {
      router.push("/patient/dashboard")
      return
    }

    // Load initial data
    loadAppointments()
    loadMedicines()
    loadRooms()
    loadBills()
  }, [user, authLoading, router])

  const loadAppointments = async () => {
    try {
      const response = await fetch(`/api/appointments?doctor_id=${user?.id}`)
      const data = await response.json()
      if (data.appointments) {
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error("Error loading appointments:", error)
    }
  }

  const loadMedicines = async () => {
    try {
      const response = await fetch("/api/medicines")
      const data = await response.json()
      if (data.medicines) {
        setMedicines(data.medicines)
      }
    } catch (error) {
      console.error("Error loading medicines:", error)
    }
  }

  const loadRooms = async () => {
    try {
      const response = await fetch("/api/rooms")
      const data = await response.json()
      if (data.rooms) {
        setRooms(data.rooms)
      }
    } catch (error) {
      console.error("Error loading rooms:", error)
    }
  }

  const loadBills = async () => {
    try {
      const response = await fetch("/api/billing")
      const data = await response.json()
      if (data.bills) {
        setBills(data.bills)
      }
    } catch (error) {
      console.error("Error loading bills:", error)
    }
  }

  const handleUpdateAppointment = async (appointmentId: string, status: string, notes?: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/appointments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: appointmentId,
          status,
          notes,
        }),
      })

      if (response.ok) {
        loadAppointments()
        setSuccess("Appointment updated successfully")
      }
    } catch (error) {
      console.error("Error updating appointment:", error)
      setError("Failed to update appointment")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    const notes = `Clinical Examination: ${consultationNotes}\nDiagnosis: ${diagnosis}\nTreatment Plan: ${treatmentPlan}`
    await handleUpdateAppointment(selectedPatient.id, "completed", notes)

    // Reset form and go back to patients
    setConsultationNotes("")
    setDiagnosis("")
    setTreatmentPlan("")
    setSelectedPatient(null) // Add this line
    setCurrentPage("patients")
    setSuccess("Consultation saved successfully!")
  }

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/medicines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newMedicine.name.trim(),
          category: newMedicine.category.trim(),
          stock_quantity: Number.parseInt(newMedicine.stock_quantity, 10),
          price_per_unit: Number.parseFloat(newMedicine.price_per_unit),
          description: newMedicine.description.trim() || null,
          manufacturer: newMedicine.manufacturer.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Failed to add medicine")
        return
      }

      setNewMedicine({
        name: "",
        category: "",
        stock_quantity: "",
        price_per_unit: "",
        description: "",
        manufacturer: "",
      })
      setShowAddMedicine(false)
      loadMedicines()
      setSuccess("Medicine added successfully")
    } catch (error) {
      console.error("Error adding medicine:", error)
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleEditMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMedicine) return
    setLoading(true)

    try {
      const response = await fetch("/api/medicines", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMedicine.id,
          stock_quantity: Number.parseInt(newMedicine.stock_quantity, 10),
          price_per_unit: Number.parseFloat(newMedicine.price_per_unit),
        }),
      })

      if (response.ok) {
        setShowEditMedicine(false)
        setSelectedMedicine(null)
        loadMedicines()
        setSuccess("Medicine updated successfully")
      }
    } catch (error) {
      console.error("Error updating medicine:", error)
      setError("Failed to update medicine")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMedicine = async (medicineId: string) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return

    setLoading(true)
    try {
      const response = await fetch(`/api/medicines/${medicineId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadMedicines()
        setSuccess("Medicine deleted successfully")
      }
    } catch (error) {
      console.error("Error deleting medicine:", error)
      setError("Failed to delete medicine")
    } finally {
      setLoading(false)
    }
  }

  const handleRoomAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_user_id: roomAssignmentData.patient_id,
          room_id: roomAssignmentData.room_id,
          admission_date: roomAssignmentData.admission_date,
        }),
      })

      if (response.ok) {
        setRoomAssignmentData({
          patient_id: "",
          room_id: "",
          admission_date: "",
        })
        setShowRoomAssignment(false)
        loadRooms()
        setSuccess("Room assigned successfully")
      }
    } catch (error) {
      console.error("Error assigning room:", error)
      setError("Failed to assign room")
    } finally {
      setLoading(false)
    }
  }

  const handlePrescribeMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prescriptionData),
      })

      if (response.ok) {
        setPrescriptionData({
          appointment_id: "",
          medicine_id: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
        })
        setSuccess("Prescription created successfully!")
        setCurrentPage("patients") // Go back to patients view
      } else {
        const result = await response.json()
        setError(result.error || "Failed to create prescription")
      }
    } catch (error) {
      console.error("Error creating prescription:", error)
      setError("Failed to create prescription")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_user_id: billingData.patient_id,
          appointment_id: billingData.appointment_id,
          consultation_fee: Number.parseFloat(billingData.consultation_fee),
          medicine_cost: Number.parseFloat(billingData.medicine_cost),
          room_charges: Number.parseFloat(billingData.room_charges),
          other_charges: Number.parseFloat(billingData.other_charges),
        }),
      })

      if (response.ok) {
        setBillingData({
          patient_id: "",
          appointment_id: "",
          consultation_fee: "",
          medicine_cost: "",
          room_charges: "",
          other_charges: "",
        })
        loadBills()
        setSuccess("Bill created successfully")
      }
    } catch (error) {
      console.error("Error creating bill:", error)
      setError("Failed to create bill")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReceipt = (bill: any) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Patient Bill Receipt", 10, 15)
    doc.setFontSize(12)
    doc.text(`Patient: ${bill.patient?.user?.full_name || "Unknown Patient"}`, 10, 30)
    doc.text(`Bill #: ${bill.id.slice(0, 8)}`, 10, 40)
    doc.text(`Date: ${new Date(bill.created_at).toLocaleDateString()}`, 10, 50)
    doc.text(`Consultation: Ksh ${Number(bill.consultation_fee).toFixed(2)}`, 10, 65)
    doc.text(`Medicine: Ksh ${Number(bill.medicine_cost).toFixed(2)}`, 10, 75)
    doc.text(`Room: Ksh ${Number(bill.room_charges).toFixed(2)}`, 10, 85)
    doc.text(`Other Charges: Ksh ${Number(bill.other_charges).toFixed(2)}`, 10, 95)
    doc.setFontSize(14)
    doc.text(`Total: Ksh ${Number(bill.total_amount).toFixed(2)}`, 10, 110)
    doc.text(`Status: ${bill.payment_status === "paid" ? "Paid" : "Pending"}`, 10, 120)
    doc.save(`receipt_${bill.id.slice(0, 8)}.pdf`)
  }

  const renderDashboard = () => {
    const todayAppointments = appointments.filter(
      (apt) => apt.appointment_date === new Date().toISOString().split("T")[0],
    )
    const completedToday = todayAppointments.filter((apt) => apt.status === "completed").length
    const availableRooms = rooms.filter((room) => room.status === "available").length
    const lowStockMedicines = medicines.filter((med) => med.stock_quantity < 50).length

    return (
      <div className="space-y-6">
        {success && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-xl">
            {success}
            <button onClick={() => setSuccess("")} className="float-right">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl">
            {error}
            <button onClick={() => setError("")} className="float-right">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Today's Patients</p>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-blue-100">Appointments</p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Consultations</p>
                <p className="text-2xl font-bold">{completedToday}</p>
                <p className="text-green-100">Completed</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Low Stock Alert</p>
                <p className="text-2xl font-bold">{lowStockMedicines}</p>
                <p className="text-purple-100">Medicines</p>
              </div>
              <Pill className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Available Rooms</p>
                <p className="text-2xl font-bold">{availableRooms}</p>
                <p className="text-orange-100">Out of {rooms.length}</p>
              </div>
              <Bed className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Today's Schedule</h3>
            <div className="space-y-3">
              {todayAppointments.slice(0, 4).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{appointment.patient.user.full_name}</p>
                    <p className="text-sm text-gray-600">{appointment.appointment_time}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appointment.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : appointment.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {appointment.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentPage("patients")}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-center"
              >
                <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-600">View Patients</p>
              </button>
              <button
                onClick={() => setCurrentPage("consultation")}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-all text-center"
              >
                <UserCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-600">Start Consultation</p>
              </button>
              <button
                onClick={() => setCurrentPage("inventory")}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-center"
              >
                <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-purple-600">Manage Inventory</p>
              </button>
              <button
                onClick={() => setCurrentPage("room-management")}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all text-center"
              >
                <Bed className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-orange-600">Room Management</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPatients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Patient Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patients..."
            className="input-field pl-10 w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {appointments
          .filter((appointment) => appointment.patient.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{appointment.patient.user.full_name}</h3>
                    <span
                      className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : appointment.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {appointment.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>Age: {appointment.patient.user.age} years</div>
                    <div>Phone: {appointment.patient.user.phone}</div>
                    <div>
                      Appointment: {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
                      {appointment.appointment_time}
                    </div>
                    <div>Blood Group: {appointment.patient.blood_group}</div>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedPatient(appointment)
                      setCurrentPage("consultation")
                    }}
                    className="btn-primary"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Consult
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  const renderConsultation = () => {
    const patient = selectedPatient || appointments[0]
    if (!patient) return <div className="card text-center py-8">No patient selected for consultation</div>

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Patient Consultation</h2>
          <div className="bg-blue-50 p-4 rounded-xl mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span> {patient.patient.user.full_name}
              </div>
              <div>
                <span className="font-medium">Age:</span> {patient.patient.user.age} years
              </div>
              <div>
                <span className="font-medium">Phone:</span> {patient.patient.user.phone}
              </div>
              <div>
                <span className="font-medium">Blood Group:</span> {patient.patient.blood_group}
              </div>
              <div>
                <span className="font-medium">Emergency Contact:</span> {patient.patient.emergency_contact}
              </div>
            </div>
            <p className="text-sm mt-2">
              <span className="font-medium">Reported Symptoms:</span> {patient.symptoms}
            </p>
          </div>

          <form onSubmit={handleSaveConsultation} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Examination</label>
              <textarea
                className="input-field h-32 resize-none"
                placeholder="Record your clinical findings and examination notes..."
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
              <textarea
                className="input-field h-24 resize-none"
                placeholder="Enter your diagnosis..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
              <textarea
                className="input-field h-32 resize-none"
                placeholder="Describe the treatment plan and recommendations..."
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                required
              />
            </div>

            <div className="flex space-x-4">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Save Consultation
              </button>
              <button type="button" onClick={() => setCurrentPage("prescribe")} className="btn-secondary">
                <Pill className="w-5 h-5 mr-2" />
                Prescribe Medicine
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const renderPrescribe = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Prescribe Medicine</h2>
        <form onSubmit={handlePrescribeMedicine} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Appointment</label>
            <select
              className="input-field"
              value={prescriptionData.appointment_id}
              onChange={(e) => setPrescriptionData({ ...prescriptionData, appointment_id: e.target.value })}
              required
            >
              <option value="">Choose appointment...</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.patient.user.full_name} - {new Date(appointment.appointment_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Medicine</label>
            <select
              className="input-field"
              value={prescriptionData.medicine_id}
              onChange={(e) => setPrescriptionData({ ...prescriptionData, medicine_id: e.target.value })}
              required
            >
              <option value="">Choose medicine...</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} - Stock: {medicine.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., 500mg"
                value={prescriptionData.dosage}
                onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Twice daily"
                value={prescriptionData.frequency}
                onChange={(e) => setPrescriptionData({ ...prescriptionData, frequency: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., 7 days"
                value={prescriptionData.duration}
                onChange={(e) => setPrescriptionData({ ...prescriptionData, duration: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <textarea
              className="input-field h-24 resize-none"
              placeholder="Special instructions for the patient..."
              value={prescriptionData.instructions}
              onChange={(e) => setPrescriptionData({ ...prescriptionData, instructions: e.target.value })}
            />
          </div>

          <button type="submit" className="w-full btn-primary" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
            Create Prescription
          </button>
        </form>
      </div>
    </div>
  )

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Medicine Inventory</h2>
        <button onClick={() => setShowAddMedicine(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Medicine
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search medicines..."
          className="input-field pl-10 w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {medicines
          .filter((medicine) => medicine.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((medicine) => (
            <div key={medicine.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{medicine.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Category:</span> {medicine.category}
                    </div>
                    <div>
                      <span className="font-medium">Stock:</span>
                      <span
                        className={`ml-1 ${medicine.stock_quantity < 50 ? "text-red-600 font-semibold" : "text-green-600"}`}
                      >
                        {medicine.stock_quantity} units
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Price:</span> Ksh {Number(medicine.price_per_unit).toFixed(2)}
                    </div>
                  </div>
                  {medicine.manufacturer && (
                    <p className="text-sm text-gray-500 mt-1">Manufacturer: {medicine.manufacturer}</p>
                  )}
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMedicine(medicine)
                      setNewMedicine({
                        name: medicine.name,
                        category: medicine.category,
                        stock_quantity: medicine.stock_quantity.toString(),
                        price_per_unit: medicine.price_per_unit.toString(),
                        description: medicine.description || "",
                        manufacturer: medicine.manufacturer || "",
                      })
                      setShowEditMedicine(true)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMedicine(medicine.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Medicine</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-xl text-sm">{error}</div>
            )}
            <form onSubmit={handleAddMedicine} className="space-y-4">
              <input
                type="text"
                className="input-field"
                placeholder="Medicine name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Category"
                value={newMedicine.category}
                onChange={(e) => setNewMedicine({ ...newMedicine, category: e.target.value })}
                required
              />
              <input
                type="number"
                className="input-field"
                placeholder="Stock quantity"
                value={newMedicine.stock_quantity}
                onChange={(e) => setNewMedicine({ ...newMedicine, stock_quantity: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.01"
                className="input-field"
                placeholder="Price per unit"
                value={newMedicine.price_per_unit}
                onChange={(e) => setNewMedicine({ ...newMedicine, price_per_unit: e.target.value })}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Manufacturer (optional)"
                value={newMedicine.manufacturer}
                onChange={(e) => setNewMedicine({ ...newMedicine, manufacturer: e.target.value })}
              />
              <textarea
                className="input-field h-20 resize-none"
                placeholder="Description (optional)"
                value={newMedicine.description}
                onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
              />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 btn-primary" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Add Medicine
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMedicine(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {showEditMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Edit Medicine</h3>
            <form onSubmit={handleEditMedicine} className="space-y-4">
              <input type="text" className="input-field bg-gray-100" value={newMedicine.name} disabled />
              <input type="text" className="input-field bg-gray-100" value={newMedicine.category} disabled />
              <input
                type="number"
                className="input-field"
                placeholder="Stock quantity"
                value={newMedicine.stock_quantity}
                onChange={(e) => setNewMedicine({ ...newMedicine, stock_quantity: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.01"
                className="input-field"
                placeholder="Price per unit"
                value={newMedicine.price_per_unit}
                onChange={(e) => setNewMedicine({ ...newMedicine, price_per_unit: e.target.value })}
                required
              />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 btn-primary" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Update Medicine
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditMedicine(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  const renderRoomManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Room Management</h2>
        <button onClick={() => setShowRoomAssignment(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Assign Room
        </button>
      </div>

      <div className="grid gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="card">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Room {room.room_number}</h3>
                  <span
                    className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                      room.status === "available"
                        ? "bg-green-100 text-green-800"
                        : room.status === "occupied"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Type:</span> {room.room_type}
                  </div>
                  <div>
                    <span className="font-medium">Floor:</span> {room.floor}
                  </div>
                  <div>
                    <span className="font-medium">Daily Rate:</span> Ksh {Number(room.daily_rate).toFixed(2)}
                  </div>
                </div>
                {room.room_assignments && room.room_assignments.length > 0 && (
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">Current Patient:</span>{" "}
                    {room.room_assignments[0].patient.user.full_name}
                    <span className="text-gray-500 ml-2">
                      (Admitted: {new Date(room.room_assignments[0].admission_date).toLocaleDateString()})
                    </span>
                  </p>
                )}
              </div>
              <div className="mt-4 md:mt-0 flex space-x-2">
                {room.status === "available" && (
                  <button
                    onClick={() => {
                      setRoomAssignmentData({ ...roomAssignmentData, room_id: room.id })
                      setShowRoomAssignment(true)
                    }}
                    className="btn-primary"
                  >
                    Assign Patient
                  </button>
                )}
                {room.status === "occupied" && (
                  <button
                    onClick={() => {
                      // Handle room release
                    }}
                    className="btn-secondary"
                  >
                    Release Room
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Room Assignment Modal */}
      {showRoomAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Assign Room to Patient</h3>
            <form onSubmit={handleRoomAssignment} className="space-y-4">
              <select
                className="input-field"
                value={roomAssignmentData.patient_id}
                onChange={(e) => setRoomAssignmentData({ ...roomAssignmentData, patient_id: e.target.value })}
                required
              >
                <option value="">Select Patient...</option>
                {appointments.map((appointment) => (
                  <option key={appointment.patient.id} value={appointment.patient.user.id}>
                    {appointment.patient.user.full_name}
                  </option>
                ))}
              </select>
              <select
                className="input-field"
                value={roomAssignmentData.room_id}
                onChange={(e) => setRoomAssignmentData({ ...roomAssignmentData, room_id: e.target.value })}
                required
              >
                <option value="">Select Room...</option>
                {rooms
                  .filter((room) => room.status === "available")
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number} - {room.room_type} (Ksh {room.daily_rate}/day)
                    </option>
                  ))}
              </select>
              <input
                type="date"
                className="input-field"
                value={roomAssignmentData.admission_date}
                onChange={(e) => setRoomAssignmentData({ ...roomAssignmentData, admission_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                required
              />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 btn-primary" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Assign Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowRoomAssignment(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  const renderBilling = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Patient Billing Overview</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Paid Bills</p>
              <p className="text-2xl font-bold">{bills.filter((bill) => bill.payment_status === "paid").length}</p>
              <p className="text-green-100">Total Paid</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Pending Bills</p>
              <p className="text-2xl font-bold">{bills.filter((bill) => bill.payment_status === "pending").length}</p>
              <p className="text-yellow-100">Outstanding</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Revenue</p>
              <p className="text-2xl font-bold">
                Ksh
                {bills
                  .filter((bill) => bill.payment_status === "paid")
                  .reduce((sum, bill) => sum + Number(bill.total_amount), 0)
                  .toFixed(2)}
              </p>
              <p className="text-blue-100">Collected</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">All Patient Bills</h3>
        <div className="space-y-4">
          {bills.map((bill: any) => (
            <div key={bill.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-800">{bill.patient?.user?.full_name || "Unknown Patient"}</h4>
                  <p className="text-sm text-gray-600">
                    Bill #{bill.id.slice(0, 8)} - {new Date(bill.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    bill.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {bill.payment_status === "paid" ? "Paid" : "Pending"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>Consultation: Ksh {Number(bill.consultation_fee).toFixed(2)}</div>
                <div>Medicine: Ksh {Number(bill.medicine_cost).toFixed(2)}</div>
                <div>Room: Ksh {Number(bill.room_charges).toFixed(2)}</div>
                <div className="font-semibold">Total: Ksh {Number(bill.total_amount).toFixed(2)}</div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  className="btn-secondary"
                  onClick={() => handleDownloadReceipt(bill)}
                >
                  Download Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create New Bill Form */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Bill</h3>
        <form onSubmit={handleCreateBill} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="input-field"
              value={billingData.patient_id}
              onChange={(e) => setBillingData({ ...billingData, patient_id: e.target.value })}
              required
            >
              <option value="">Choose patient...</option>
              {appointments.map((appointment) => (
                <option key={appointment.patient.id} value={appointment.patient.user.id}>
                  {appointment.patient.user.full_name}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={billingData.appointment_id}
              onChange={(e) => setBillingData({ ...billingData, appointment_id: e.target.value })}
              required
            >
              <option value="">Choose appointment...</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.patient.user.full_name} - {new Date(appointment.appointment_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="Consultation Fee"
              value={billingData.consultation_fee}
              onChange={(e) => setBillingData({ ...billingData, consultation_fee: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="Medicine Cost"
              value={billingData.medicine_cost}
              onChange={(e) => setBillingData({ ...billingData, medicine_cost: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="Room Charges"
              value={billingData.room_charges}
              onChange={(e) => setBillingData({ ...billingData, room_charges: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="Other Charges"
              value={billingData.other_charges}
              onChange={(e) => setBillingData({ ...billingData, other_charges: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
            Create Bill
          </button>
        </form>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return renderDashboard()
      case "patients":
        return renderPatients()
      case "consultation":
        return renderConsultation()
      case "prescribe":
        return renderPrescribe()
      case "inventory":
        return renderInventory()
      case "room-management":
        return renderRoomManagement()
      case "billing":
        return renderBilling()
      default:
        return renderDashboard()
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar userRole="doctor" currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>
    </div>
  )
}
