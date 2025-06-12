"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Sidebar from "@/components/layout/sidebar"
import {
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Bed,
  Plus,
  Download,
  Loader2,
  Search,
  X,
  AlertCircle,
} from "lucide-react"
import jsPDF from "jspdf"

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  symptoms: string
  doctor: {
    user: {
      full_name: string
    }
    specialization: string
  }
}

interface Prescription {
  id: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  medicine: {
    name: string
    category: string
  }
  appointment: {
    appointment_date: string
    doctor: {
      user: {
        full_name: string
      }
    }
  }
}

interface Bill {
  id: string
  consultation_fee: number
  medicine_cost: number
  room_charges: number
  other_charges: number
  total_amount: number
  payment_status: string
  created_at: string
}

export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [doctors, setDoctors] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form states
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [symptoms, setSymptoms] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/")
      return
    }
    if (user.role !== "patient") {
      router.push("/doctor/dashboard")
      return
    }

    // Load initial data
    loadAppointments()
    loadPrescriptions()
    loadBills()
    loadDoctors()
  }, [user, authLoading, router])

  const loadAppointments = async () => {
    try {
      const response = await fetch(`/api/appointments?patient_id=${user?.id}`)
      const data = await response.json()
      if (data.appointments) {
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error("Error loading appointments:", error)
    }
  }

  const loadPrescriptions = async () => {
    try {
      const response = await fetch(`/api/prescriptions?patient_id=${user?.id}`)
      const data = await response.json()
      console.log("Prescriptions response:", data) // Add logging
      if (data.prescriptions) {
        setPrescriptions(data.prescriptions)
      }
    } catch (error) {
      console.error("Error loading prescriptions:", error)
    }
  }

  const loadBills = async () => {
    try {
      const response = await fetch(`/api/billing?patient_id=${user?.id}`)
      const data = await response.json()
      if (data.bills) {
        setBills(data.bills)
      }
    } catch (error) {
      console.error("Error loading bills:", error)
    }
  }

  const loadDoctors = async () => {
    try {
      const response = await fetch("/api/doctors")
      const data = await response.json()
      if (data.doctors) {
        setDoctors(data.doctors)
      }
    } catch (error) {
      console.error("Error loading doctors:", error)
    }
  }

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("Booking appointment with data:", {
        patient_id: user?.id,
        doctor_id: selectedDoctor,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        symptoms,
      })

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: user?.id,
          doctor_id: selectedDoctor,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          symptoms,
        }),
      })

      const result = await response.json()
      console.log("Appointment booking response:", result)

      if (!response.ok) {
        setError(result.error || "Failed to book appointment")
        return
      }

      // Success
      setSelectedDate("")
      setSelectedTime("")
      setSelectedDoctor("")
      setSymptoms("")
      setSuccess("Appointment booked successfully!")
      loadAppointments()

      // Redirect to appointment status after a short delay
      setTimeout(() => {
        setCurrentPage("appointment-status")
      }, 1500)
    } catch (error) {
      console.error("Error booking appointment:", error)
      setError("Network error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePayBill = async (billId: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/billing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: billId,
          payment_status: "paid",
        }),
      })

      if (response.ok) {
        loadBills()
        setSuccess("Payment processed successfully!")
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      setError("Failed to process payment")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReceipt = (bill) => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Jaru Hospital Management System", 10, 15)
    doc.setFontSize(16)
    doc.text("Patient Bill Receipt", 10, 30)
    doc.setFontSize(12)
    doc.text(`Bill #: ${bill.id.slice(0, 8)}`, 10, 45)
    doc.text(`Date: ${new Date(bill.created_at).toLocaleDateString()}`, 10, 55)
    doc.text(`Consultation Fee: Ksh ${Number(bill.consultation_fee).toFixed(2)}`, 10, 70)
    doc.text(`Medicine Cost: Ksh ${Number(bill.medicine_cost).toFixed(2)}`, 10, 80)
    doc.text(`Room Charges: Ksh ${Number(bill.room_charges).toFixed(2)}`, 10, 90)
    doc.text(`Other Charges: Ksh ${Number(bill.other_charges).toFixed(2)}`, 10, 100)
    doc.setFontSize(14)
    doc.text(`Total Amount: Ksh ${Number(bill.total_amount).toFixed(2)}`, 10, 115)
    doc.text(`Status: ${bill.payment_status === "paid" ? "Paid" : "Pending"}`, 10, 125)
    doc.save(`receipt_${bill.id.slice(0, 8)}.pdf`)
  }

  const handleDownloadPrescription = (prescription) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Jaru Hospital Management System", 10, 15);
    doc.setFontSize(16);
    doc.text("Prescription", 10, 30);
    doc.setFontSize(12);
    doc.text(`Medicine: ${prescription.medicine?.name || "Unknown Medicine"}`, 10, 45);
    doc.text(`Dosage: ${prescription.dosage}`, 10, 55);
    doc.text(`Frequency: ${prescription.frequency}`, 10, 65);
    doc.text(`Duration: ${prescription.duration}`, 10, 75);
    doc.text(`Prescribed by: ${prescription.appointment?.doctor?.user?.full_name || "Unknown Doctor"}`, 10, 85);
    if (prescription.instructions) {
      doc.text(`Instructions: ${prescription.instructions}`, 10, 95);
    }
    doc.save(`prescription_${prescription.id.slice(0, 8)}.pdf`);
  };

  const timeSlots = ["9:00", "10:00", "11:00", "14:00", "15:00", "16:00"]

  const renderDashboard = () => {
    const nextAppointment = appointments.find((apt) => apt.status === "confirmed")
    const activePrescriptions = prescriptions.length
    const pendingBills = bills.filter((bill) => bill.payment_status === "pending")
    const totalPending = pendingBills.reduce((sum, bill) => sum + Number(bill.total_amount), 0)

    return (
      <div className="space-y-6">
        {success && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-xl flex items-center">
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Next Appointment</p>
                <p className="text-2xl font-bold">
                  {nextAppointment ? new Date(nextAppointment.appointment_date).toLocaleDateString() : "None"}
                </p>
                <p className="text-blue-100">{nextAppointment ? nextAppointment.appointment_time : "No upcoming"}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Active Prescriptions</p>
                <p className="text-2xl font-bold">{activePrescriptions}</p>
                <p className="text-green-100">Medicines</p>
              </div>
              <FileText className="w-8 h-8 text-green-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Outstanding Bill</p>
                <p className="text-2xl font-bold">Ksh {totalPending.toFixed(2)}</p>
                <p className="text-purple-100">{pendingBills.length} pending</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Room Status</p>
                <p className="text-2xl font-bold">Not Admitted</p>
                <p className="text-orange-100">Outpatient</p>
              </div>
              <Bed className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Appointments</h3>
            <div className="space-y-3">
              {appointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{appointment.doctor.user.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appointment.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : appointment.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentPage("book-appointment")}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-center"
              >
                <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-600">Book Appointment</p>
              </button>
              <button
                onClick={() => setCurrentPage("prescriptions")}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-all text-center"
              >
                <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-600">View Prescriptions</p>
              </button>
              <button
                onClick={() => setCurrentPage("billing")}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-center"
              >
                <CreditCard className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-purple-600">Pay Bills</p>
              </button>
              <button
                onClick={() => setCurrentPage("room-status")}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all text-center"
              >
                <Bed className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-orange-600">Room Status</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBookAppointment = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Book New Appointment</h2>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-xl">{success}</div>
        )}

        <form onSubmit={handleBookAppointment} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
            <select
              className="input-field"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              required
            >
              <option value="">Choose a doctor...</option>
              {doctors.map((doctor: any) => (
                <option key={doctor.user_id} value={doctor.user_id}>
                  {doctor.user.full_name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
              <input
                type="date"
                className="input-field"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
              <select
                className="input-field"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              >
                <option value="">Select time...</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms/Reason for Visit</label>
            <textarea
              className="input-field h-32 resize-none"
              placeholder="Please describe your symptoms or reason for the appointment..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="w-full btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Booking Appointment...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Book Appointment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )

  const renderAppointmentStatus = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Appointment Status</h2>
        <button onClick={() => setCurrentPage("book-appointment")} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Appointment
        </button>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <div className="card text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No appointments found</p>
            <button onClick={() => setCurrentPage("book-appointment")} className="btn-primary mt-4">
              Book Your First Appointment
            </button>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{appointment.doctor.user.full_name}</h3>
                    <span
                      className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : appointment.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">{appointment.doctor.specialization}</p>
                  <div className="flex items-center text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span className="mr-4">{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{appointment.appointment_time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderPrescriptions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">My Prescriptions</h2>

      <div className="grid gap-4">
        {prescriptions.length === 0 ? (
          <div className="card text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No prescriptions found</p>
            <p className="text-sm text-gray-500 mt-2">Prescriptions will appear here after your doctor consultation</p>
          </div>
        ) : (
          prescriptions.map((prescription) => (
            <div key={prescription.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {prescription.medicine?.name || "Unknown Medicine"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Dosage:</span> {prescription.dosage}
                    </div>
                    <div>
                      <span className="font-medium">Frequency:</span> {prescription.frequency}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {prescription.duration}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Prescribed by: {prescription.appointment?.doctor?.user?.full_name || "Unknown Doctor"}
                  </p>
                  {prescription.instructions && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Instructions:</span> {prescription.instructions}
                    </p>
                  )}
                </div>
                <div className="mt-4 md:mt-0">
                  <button className="btn-secondary" onClick={() => handleDownloadPrescription(prescription)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderBilling = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Billing Summary</h2>

      {bills.length === 0 ? (
        <div className="card text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bills found</p>
        </div>
      ) : (
        bills.map((bill) => (
          <div key={bill.id} className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Bill #{bill.id.slice(0, 8)} - {new Date(bill.created_at).toLocaleDateString()}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Consultation Fee</span>
                <span className="font-semibold text-gray-800">Ksh {Number(bill.consultation_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Medicine Cost</span>
                <span className="font-semibold text-gray-800">Ksh {Number(bill.medicine_cost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Room Charges</span>
                <span className="font-semibold text-gray-800">Ksh {Number(bill.room_charges).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Other Charges</span>
                <span className="font-semibold text-gray-800">Ksh {Number(bill.other_charges).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
                <span className="text-lg font-semibold text-gray-800">Total Amount</span>
                <span className="text-xl font-bold text-blue-600">Ksh {Number(bill.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bill.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {bill.payment_status === "paid" ? "Paid" : "Pending"}
              </span>

              {bill.payment_status === "pending" && (
                <button onClick={() => handlePayBill(bill.id)} className="btn-primary" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5 mr-2" />
                  )}
                  Pay Now
                </button>
              )}
              {bill.payment_status === "paid" && (
                <button onClick={() => handleDownloadReceipt(bill)} className="btn-secondary">
                  Download Receipt
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderRoomStatus = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center">
        <Bed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Room Status</h2>
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <p className="text-lg font-semibold text-green-800 mb-2">Not Currently Admitted</p>
          <p className="text-green-600">
            You are registered as an outpatient. If you need to be admitted, please contact your doctor.
          </p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h3 className="font-semibold text-gray-800 mb-2">Need Admission?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Contact your doctor or the hospital administration for room allocation.
          </p>
          <button className="btn-primary">Contact Administration</button>
        </div>
      </div>
    </div>
  )

  const renderDoctors = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Available Doctors</h2>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search doctors..."
          className="input-field pl-10 w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {doctors
          .filter(
            (doctor: any) =>
              doctor.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((doctor: any) => (
            <div key={doctor.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{doctor.user.full_name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Specialization:</span> {doctor.specialization}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span> {doctor.department}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {doctor.user.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {doctor.user.phone || "Not available"}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">License: {doctor.license_number}</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <button
                    onClick={() => {
                      setSelectedDoctor(doctor.user_id)
                      setCurrentPage("book-appointment")
                    }}
                    className="btn-primary"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return renderDashboard()
      case "book-appointment":
        return renderBookAppointment()
      case "appointment-status":
        return renderAppointmentStatus()
      case "prescriptions":
        return renderPrescriptions()
      case "billing":
        return renderBilling()
      case "room-status":
        return renderRoomStatus()
      case "doctors":
        return renderDoctors()
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
        <Sidebar userRole="patient" currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>
    </div>
  )
}
