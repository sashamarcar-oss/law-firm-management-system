"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Download,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";

interface Invoice {
  year?: number;
  month?: string;
  adminCommission?: number;
  lawyerShare?: number;
  amount?: number;
  createdAt?: Timestamp | null;
}

interface DashboardUser {
  id: string;
  role?: string;
}

const PIE_COLORS = ["#0f766e", "#2563eb"];
const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function toCurrency(value: number) {
  return `KES ${value.toLocaleString()}`;
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 px-8 py-6 shadow-xl">
        {message}
      </div>
    </div>
  );
}

function UnauthorizedScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md rounded-[2rem] border border-rose-500/20 bg-rose-500/10 px-8 py-10 text-center text-rose-200 shadow-xl">
        <ShieldCheck className="mx-auto h-10 w-10 mb-4" />
        <p className="text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3 text-cyan-300">{icon}</div>
      </div>
    </div>
  );
}

export default function AdminProfile() {
  const { currentUser, loading, isAdmin } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const unsubInvoices = onSnapshot(
      collection(db, "invoices"),
      (snapshot) => {
        const nextInvoices = snapshot.docs.map((entry) => entry.data() as Invoice);
        setInvoices(nextInvoices);
      },
      (error) => console.error("Error fetching invoices:", error)
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const nextUsers = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...(entry.data() as Omit<DashboardUser, "id">),
        }));
        setUsers(nextUsers);
      },
      (error) => console.error("Error fetching users:", error)
    );

    return () => {
      unsubInvoices();
      unsubUsers();
    };
  }, []);

  if (loading) return <LoadingScreen message="Loading profile..." />;
  if (!currentUser) return <UnauthorizedScreen message="You must be logged in." />;
  if (!isAdmin) return <UnauthorizedScreen message="Access denied." />;

  const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "Admin";
  const adminInitials = getInitials(displayName || "Admin");

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach((invoice) => {
      if (invoice.year) years.add(invoice.year);
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => (invoice.year || new Date().getFullYear()) === yearFilter),
    [invoices, yearFilter]
  );

  const finance = useMemo(() => {
    const totalAdmin = filteredInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.adminCommission || 0),
      0
    );
    const totalLawyer = filteredInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.lawyerShare || 0),
      0
    );
    const totalGross = filteredInvoices.reduce(
      (sum, invoice) =>
        sum + Number(invoice.amount || 0) + Number(invoice.adminCommission || 0) + Number(invoice.lawyerShare || 0),
      0
    );

    const monthlyMap = new Map<string, { month: string; admin: number; lawyer: number }>();

    MONTH_ORDER.forEach((month) => {
      monthlyMap.set(month, { month, admin: 0, lawyer: 0 });
    });

    filteredInvoices.forEach((invoice) => {
      const month = invoice.month || "Unknown";
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { month, admin: 0, lawyer: 0 });
      }

      const current = monthlyMap.get(month)!;
      current.admin += Number(invoice.adminCommission || 0);
      current.lawyer += Number(invoice.lawyerShare || 0);
    });

    const monthlyData = Array.from(monthlyMap.values()).filter(
      (item) => item.admin > 0 || item.lawyer > 0 || MONTH_ORDER.includes(item.month)
    );

    return {
      totalAdmin,
      totalLawyer,
      totalGross,
      monthlyData,
      pieData: [
        { name: "Admin", value: totalAdmin },
        { name: "Lawyer", value: totalLawyer },
      ],
    };
  }, [filteredInvoices]);

  const platformStats = useMemo(() => {
    const totalAdmins = users.filter((user) => user.role === "admin").length;
    const totalLawyers = users.filter((user) => user.role === "lawyer").length;
    const totalClients = users.filter((user) => user.role === "client").length;

    return { totalAdmins, totalLawyers, totalClients };
  }, [users]);

  const reportSummary = useMemo(() => {
    const bestMonth =
      finance.monthlyData.reduce<{ month: string; total: number } | null>((best, current) => {
        const total = current.admin + current.lawyer;
        if (!best || total > best.total) {
          return { month: current.month, total };
        }
        return best;
      }, null) || null;

    return {
      invoiceCount: filteredInvoices.length,
      bestMonth,
    };
  }, [filteredInvoices.length, finance.monthlyData]);

  const exportPDF = async () => {
    const input = document.getElementById("admin-profile-report");
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2, backgroundColor: "#f8fafc" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = 190;
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, width, height);
    pdf.save(`Admin_Profile_Report_${yearFilter}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.10),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] p-6 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_24%)] px-8 py-10 sm:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  Executive Profile
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Admin profile and performance center
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Monitor revenue distribution, platform reach, and your account details from one polished workspace.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected Year</p>
                  <div className="mt-3">
                    <select
                      value={yearFilter}
                      onChange={(event) => setYearFilter(Number(event.target.value))}
                      className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={exportPDF}
                  className="inline-flex items-center justify-center gap-2 rounded-[1.75rem] bg-cyan-400 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        <div id="admin-profile-report" className="space-y-8">
          <section className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-slate-950 text-2xl font-semibold text-cyan-300">
                  {adminInitials || "AD"}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{displayName}</h2>
                  <p className="mt-1 text-sm text-slate-500">System Administrator</p>
                </div>
              </div>

              <div className="mt-8 space-y-4 text-sm">
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-slate-500">Email</div>
                  <div className="mt-2 flex items-center gap-2 font-medium text-slate-800">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {currentUser.email || "No email available"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-slate-500">Role</div>
                  <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    {currentUser.role}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-slate-500">Platform Reach</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <div className="text-xl font-semibold text-slate-900">{platformStats.totalAdmins}</div>
                      <div className="text-xs text-slate-500">Admins</div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <div className="text-xl font-semibold text-slate-900">{platformStats.totalLawyers}</div>
                      <div className="text-xs text-slate-500">Lawyers</div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <div className="text-xl font-semibold text-slate-900">{platformStats.totalClients}</div>
                      <div className="text-xs text-slate-500">Clients</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Admin Earnings"
                value={toCurrency(finance.totalAdmin)}
                detail={`Commission earned in ${yearFilter}`}
                icon={<Wallet className="h-5 w-5" />}
              />
              <StatCard
                title="Lawyer Share"
                value={toCurrency(finance.totalLawyer)}
                detail="Total revenue distributed to lawyers"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Gross Revenue"
                value={toCurrency(finance.totalGross)}
                detail="Combined invoice value tracked"
                icon={<BriefcaseBusiness className="h-5 w-5" />}
              />
              <StatCard
                title="Invoices"
                value={String(reportSummary.invoiceCount)}
                detail={
                  reportSummary.bestMonth
                    ? `Best month: ${reportSummary.bestMonth.month}`
                    : "No invoice trend yet"
                }
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1.1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900">Monthly earnings overview</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Compare admin commission and lawyer share throughout {yearFilter}.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={finance.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="admin" fill="#0f766e" radius={[8, 8, 0, 0]} name="Admin commission" />
                  <Bar dataKey="lawyer" fill="#2563eb" radius={[8, 8, 0, 0]} name="Lawyer share" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900">Revenue distribution</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Current split between admin commission and lawyer share.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={finance.pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={118}
                    innerRadius={68}
                    paddingAngle={4}
                    label
                  >
                    {finance.pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900">Growth trend</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Track how admin revenue has moved month by month.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={finance.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="admin"
                    stroke="#0891b2"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Admin earnings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h3 className="text-2xl font-semibold text-slate-900">Profile insights</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm text-slate-500">Best performing month</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {reportSummary.bestMonth
                      ? `${reportSummary.bestMonth.month} • ${toCurrency(reportSummary.bestMonth.total)}`
                      : "No trend available"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm text-slate-500">Current reporting year</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{yearFilter}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm text-slate-500">Profile status</div>
                  <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Active administrator
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm text-slate-500">Data coverage</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {filteredInvoices.length} invoice records in view
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
