"use client";

import { Calendar, Clock, Video } from "lucide-react";

type Appointment = {
  id: string;
  lawyer: string;
  date: string;
  time: string;
  type: string;
};

const appointments: Appointment[] = [
  {
    id: "1",
    lawyer: "Sarah Johnson",
    date: "May 12, 2026",
    time: "10:30 AM",
    type: "Consultation",
  },
  {
    id: "2",
    lawyer: "David Kim",
    date: "May 15, 2026",
    time: "2:00 PM",
    type: "Case Review",
  },
];

export default function UpcomingAppointments() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="font-semibold text-slate-900">
          Upcoming Appointments
        </h2>

        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
          View all
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {appointments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <div className="flex items-center justify-between border border-slate-200 rounded-lg p-4 hover:shadow-md transition">

      <div className="space-y-1">
        <p className="font-medium text-slate-900">
          {appointment.lawyer}
        </p>

        <div className="flex items-center text-sm text-slate-500 gap-4">

          <span className="flex items-center gap-1">
            <Calendar size={16} />
            {appointment.date}
          </span>

          <span className="flex items-center gap-1">
            <Clock size={16} />
            {appointment.time}
          </span>

        </div>

        <p className="text-xs text-slate-400">
          {appointment.type}
        </p>
      </div>

      <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition">
        <Video size={16} />
        Join
      </button>

    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10">

      <div className="text-slate-400 mb-4">
        No upcoming appointments
      </div>

      <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
        Book Appointment
      </button>

    </div>
  );
}