"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar, { type CalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";
import { type Case } from "@/components/case"; // assuming this is correct path

interface MiniCalendarProps {
  cases: Case[];
}

const getCaseDeadlineDate = (deadline?: any): Date | null => {
  if (!deadline) return null;
  if (typeof deadline?.toDate === "function") return deadline.toDate();

  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Map case types to Tailwind colors (unchanged)
const caseTypeColors: Record<string, string> = {
  "Criminal Law": "bg-red-500",
  "Family Law": "bg-yellow-500",
  "Commercial / Business Law": "bg-green-500",
  "Property / Land Law": "bg-indigo-500",
  "Labour / Employment Law": "bg-purple-500",
  "Civil Law": "bg-pink-500",
  "Constitutional Law": "bg-teal-500",
  "Environmental Law": "bg-emerald-500",
  "Human Rights Law": "bg-orange-500",
  "Administrative Law": "bg-slate-500",
  "Tax Law": "bg-rose-500",
  "Intellectual Property Law": "bg-cyan-500",
  "Succession / Probate Law": "bg-fuchsia-500",
  "Contract Law": "bg-lime-500",
  "Tort Law": "bg-violet-500",
  "Consumer Protection Law": "bg-stone-500",
  "Juvenile / Children Law": "bg-pink-400",
  "Maritime / Shipping Law": "bg-blue-400",
  "Immigration Law": "bg-indigo-400",
};

export default function MiniCalendar({ cases }: MiniCalendarProps) {
  const [value, setValue] = useState<Date>(new Date());
  const navigate = useNavigate();

  // Tile content – show colored dots for deadlines
  const tileContent: CalendarProps["tileContent"] = ({ date, view }) => {
    if (view !== "month") return null;

    const casesForDay = cases.filter(
      (c) => getCaseDeadlineDate(c.deadline)?.toDateString() === date.toDateString()
    );

    if (casesForDay.length === 0) return null;

    return (
      <div className="flex justify-center mt-1 gap-1">
        {casesForDay.slice(0, 3).map((c, idx) => (
          <span
            key={idx}
            className={`w-2 h-2 rounded-full ${caseTypeColors[c.caseType ?? "Other"] || "bg-blue-500"} ring-1 ring-offset-1 ring-offset-white dark:ring-offset-slate-800`}
            title={`${c.title || c.caseType} - ${format(getCaseDeadlineDate(c.deadline)!, "PP")}`}
          />
        ))}
        {casesForDay.length > 3 && (
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">+{casesForDay.length - 3}</span>
        )}
      </div>
    );
  };

  // Click day → navigate to filtered list
  const handleDateClick: CalendarProps["onClickDay"] = (date) => {
    const selectedCases = cases.filter(
      (c) => getCaseDeadlineDate(c.deadline)?.toDateString() === date.toDateString()
    );
    if (selectedCases.length > 0) {
      navigate(`/lawyer/cases?deadline=${format(date, "yyyy-MM-dd")}`);
    }
  };

  // Fixed onChange handler – matches library signature
  const handleChange: CalendarProps["onChange"] = (newValue) => {
    if (newValue instanceof Date) {
      setValue(newValue);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-all hover:shadow-xl">
      <Calendar
        onChange={handleChange}
        value={value}
        tileContent={tileContent}
        onClickDay={handleDateClick}
        className="react-calendar !border-0 !text-sm md:!text-base mx-auto"
        tileClassName="rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
      />

      {/* Modern custom styles */}
      <style>{`
  .react-calendar {
    border-radius: 0.75rem;
    font-family: inherit;
  }

  .react-calendar__navigation__label {
    font-weight: 600;
    color: #0f172a; /* slate-900 */
  }

  .dark .react-calendar__navigation__label {
    color: #f1f5f9; /* slate-100 */
  }

  .react-calendar__tile--now {
    background: #f0f9ff;
    color: #1e40af;
  }

  .dark .react-calendar__tile--now {
    background: #0f172a;
    color: #60a5fa;
  }

  .react-calendar__tile--active {
    background: #2563eb !important;
    color: white !important;
    border-radius: 0.5rem;
    font-weight: bold;
  }

  .react-calendar__tile {
    height: 3.25rem !important;
    padding: 0.75rem !important;
  }

  .react-calendar__month-view__weekdays__weekday abbr {
    text-decoration: none !important;
  }
`}</style>
    </div>
  );
}
