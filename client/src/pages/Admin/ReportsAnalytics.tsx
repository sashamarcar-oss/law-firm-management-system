"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { 
  TrendingUp, Users, Clock, AlertTriangle, Calendar 
} from "lucide-react";

interface Case {
  uid: string;
  caseType: string;
  status: string;
  createdAt: any;
  lawyerId: string;
  lawyerName?: string;
  deadline: any;
}

export default function ReportsAnalytics() {
  const [cases, setCases] = useState<Case[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"all" | "30days" | "90days">("all");

  // Fetch cases and users
  useEffect(() => {
    const casesQuery = query(collection(db, "cases"), orderBy("createdAt", "desc"));

    const unsubCases = onSnapshot(casesQuery, (snap) => {
      const fetched = snap.docs
        .filter(d => !d.data().deleted)
        .map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            caseType: data.caseType || "General",
            status: data.status || "Pending",
            createdAt: data.createdAt,
            lawyerId: data.lawyerId || "",
            lawyerName: data.lawyerName,
            deadline: data.deadline,
          };
        });
      setCases(fetched);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const l = snap.docs
        .filter(d => (d.data().role || "").toLowerCase() === "lawyer")
        .map(d => ({
          uid: d.id,
          displayName: d.data().displayName || "Unnamed",
        }));
      setLawyers(l);
    });

    return () => {
      unsubCases();
      unsubUsers();
    };
  }, []);

  // Filter cases by date range
  const filteredCases = useMemo(() => {
    if (dateRange === "all") return cases;

    const now = new Date();
    const days = dateRange === "30days" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return cases.filter(c => {
      if (!c.createdAt) return false;
      const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      return createdDate >= cutoff;
    });
  }, [cases, dateRange]);

  // === Analytics Calculations ===
  const totalCases = filteredCases.length;
  const completedCases = filteredCases.filter(c => c.status === "Completed").length;
  const pendingCases = filteredCases.filter(c => c.status === "Pending").length;
  const inProgressCases = filteredCases.filter(c => c.status === "In Progress").length;
  const overdueCases = filteredCases.filter(c => {
    if (c.status === "Completed" || !c.deadline) return false;
    const deadlineDate = c.deadline.toDate ? c.deadline.toDate() : new Date(c.deadline);
    return deadlineDate < new Date();
  }).length;

  const completionRate = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

  // Status Distribution for Pie Chart
  const statusData = [
    { name: "Pending", value: pendingCases, color: "#eab308" },
    { name: "In Progress", value: inProgressCases, color: "#3b82f6" },
    { name: "Completed", value: completedCases, color: "#14b8a6" },
    { name: "Overdue", value: overdueCases, color: "#ef4444" },
  ];

  // Cases by Type (Bar Chart)
  const casesByType = useMemo(() => {
    const count: Record<string, number> = {};
    filteredCases.forEach(c => {
      count[c.caseType] = (count[c.caseType] || 0) + 1;
    });
    return Object.entries(count)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCases]);

  // Monthly Trend (Line Chart) - Last 6 months
  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months[key] = 0;
    }

    filteredCases.forEach(c => {
      if (!c.createdAt) return;
      const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (months[key] !== undefined) months[key]++;
    });

    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [filteredCases]);

  // Top Lawyers by Case Count
  const topLawyers = useMemo(() => {
    const count: Record<string, { name: string; count: number }> = {};
    filteredCases.forEach(c => {
      if (!c.lawyerId) return;
      if (!count[c.lawyerId]) {
        count[c.lawyerId] = { 
          name: c.lawyerName || lawyers.find(l => l.uid === c.lawyerId)?.displayName || "Unassigned", 
          count: 0 
        };
      }
      count[c.lawyerId].count++;
    });

    return Object.values(count)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredCases, lawyers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Insights into your legal practice performance</p>
        </div>

        <div className="flex gap-3">
          {["all", "30days", "90days"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range as "all" | "30days" | "90days")}
              className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition ${
                dateRange === range 
                  ? "bg-teal-600 text-white" 
                  : "bg-white border hover:bg-gray-50"
              }`}
            >
              {range === "all" ? "All Time" : range === "30days" ? "Last 30 Days" : "Last 90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Cases</p>
              <p className="text-4xl font-semibold mt-2">{totalCases}</p>
            </div>
            <Calendar className="w-10 h-10 text-teal-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completion Rate</p>
              <p className="text-4xl font-semibold mt-2 text-emerald-600">{completionRate}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">In Progress</p>
              <p className="text-4xl font-semibold mt-2">{inProgressCases}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Overdue</p>
              <p className="text-4xl font-semibold mt-2 text-red-600">{overdueCases}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Lawyers</p>
              <p className="text-4xl font-semibold mt-2">{lawyers.length}</p>
            </div>
            <Users className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution - Pie Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border">
          <h2 className="text-xl font-semibold mb-6">Case Status Distribution</h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                dataKey="value"
                label={({ name, percent }) => 
                  percent !== undefined 
                    ? `${name} ${(percent * 100).toFixed(0)}%` 
                    : name
                }
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cases by Type - Bar Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border">
          <h2 className="text-xl font-semibold mb-6">Cases by Type</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={casesByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#14b8a6" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend - Line Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border lg:col-span-2">
          <h2 className="text-xl font-semibold mb-6">Cases Trend (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#14b8a6" 
                strokeWidth={4} 
                dot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Lawyers */}
      <div className="mt-8 bg-white rounded-3xl p-8 shadow-sm border">
        <h2 className="text-xl font-semibold mb-6">Top Performing Lawyers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topLawyers.length > 0 ? (
            topLawyers.map((lawyer, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 p-5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center font-semibold text-xl">
                    {lawyer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{lawyer.name}</p>
                    <p className="text-sm text-gray-500">Cases Handled</p>
                  </div>
                </div>
                <div className="text-3xl font-semibold text-teal-600">{lawyer.count}</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full text-center py-10">No lawyer data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}