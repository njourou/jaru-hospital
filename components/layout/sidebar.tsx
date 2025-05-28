"use client"

import { useState } from "react"
import {
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Bed,
  Users,
  Stethoscope,
  Pill,
  Package,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface SidebarProps {
  userRole: "doctor" | "patient"
  currentPage: string
  onPageChange: (page: string) => void
}

export default function Sidebar({ userRole, currentPage, onPageChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const patientMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "doctors", label: "View Doctors", icon: Users },
    { id: "book-appointment", label: "Book Appointment", icon: Calendar },
    { id: "appointment-status", label: "Appointment Status", icon: Clock },
    { id: "prescriptions", label: "Prescriptions", icon: FileText },
    { id: "billing", label: "Billing Summary", icon: CreditCard },
    { id: "room-status", label: "Room Status", icon: Bed },
  ]

  const doctorMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "patients", label: "View Patients", icon: Users },
    { id: "consultation", label: "Consultation", icon: Stethoscope },
    { id: "prescribe", label: "Prescribe Medicine", icon: Pill },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "room-management", label: "Room Management", icon: Bed },
    { id: "billing", label: "Billing", icon: CreditCard },
  ]

  const menuItems = userRole === "doctor" ? doctorMenuItems : patientMenuItems

  return (
    <div
      className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center px-3 py-3 text-left rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon className={`w-5 h-5 ${isCollapsed ? "mx-auto" : "mr-3"}`} />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
