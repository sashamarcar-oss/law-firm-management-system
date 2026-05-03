"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/firebase";
import { toast } from "react-hot-toast";
import { 
  Plus, Search, Bell, Filter, Download, Eye, Edit2, Trash2, Loader2 
} from "lucide-react";
import { logger } from "@/lib/activityLogger";

interface Lawyer {
  uid: string;
  displayName: string;
}

interface Client {
  uid: string;
  displayName: string;
}

type CaseStatus = "Pending" | "In Progress" | "Completed" | "Overdue";

interface Case {
  uid: string;
  caseNumber: string;
  title: string;
  lawyerId: string;
  clientId: string;
  clientName: string;
  lawyerName?: string;
  caseType: string;
  status: CaseStatus;
  deadline: any;
  lastUpdated: any;
  createdAt: any;
}

const CASE_TYPES = [
  "Family Law", "Land Dispute", "Criminal Law", 
  "Corporate Law", "Civil Litigation", "Employment Law", 
  "Constitutional Law", "Intellectual Property"
];

const formatDate = (value: any): string => {
  if (!value) return "—";
  try {
    if (value?.toDate && typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
    }
  } catch (e) {
    console.warn("Invalid date:", value);
  }
  return "—";
};

export default function CaseManagement() {
  const [cases, setCases] = useState<Case[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "All">("All");
  const [lawyerFilter, setLawyerFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState("");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newLawyerId, setNewLawyerId] = useState("");
  const [newCaseType, setNewCaseType] = useState(CASE_TYPES[0]);
  const [newStatus, setNewStatus] = useState<CaseStatus>("Pending");
  const [newDeadline, setNewDeadline] = useState("");
  const [createError, setCreateError] = useState<string>("");

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [editStatus, setEditStatus] = useState<CaseStatus>("Pending");
  const [editDeadline, setEditDeadline] = useState("");
  const [editError, setEditError] = useState<string>("");

  // Helper: Check if date is today or in the future
  const isValidFutureDate = (dateString: string): boolean => {
    if (!dateString) return true;
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  // Fetch Data
  useEffect(() => {
    setLoading(true);
    setError(null);

    const casesQuery = query(collection(db, "cases"), orderBy("createdAt", "desc"));

    const unsubCases = onSnapshot(casesQuery, (snap) => {
      const fetched = snap.docs
        .filter(d => !d.data().deleted)
        .map(docSnap => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            caseNumber: data.caseNumber || `CASE-${new Date().getFullYear()}-${String(docSnap.id).slice(-4).toUpperCase()}`,
            title: data.title || "",
            lawyerId: data.lawyerId || "",
            clientId: data.clientId || "",
            clientName: data.clientName || "Unknown",
            lawyerName: data.lawyerName,
            caseType: data.caseType || "General",
            status: (data.status as CaseStatus) || "Pending",
            deadline: data.deadline || null,
            lastUpdated: data.lastUpdated || data.createdAt,
            createdAt: data.createdAt,
          };
        });
      setCases(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setError("Failed to load cases. Please check your Firestore rules.");
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const l: Lawyer[] = [];
      const c: Client[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const role = (data.role || "").toLowerCase();
        if (role === "lawyer") l.push({ uid: d.id, displayName: data.displayName || "Unnamed" });
        if (role === "client") c.push({ uid: d.id, displayName: data.displayName || "Unnamed" });
      });
      setLawyers(l);
      setClients(c);
    });

    return () => {
      unsubCases();
      unsubUsers();
    };
  }, []);

  const filteredCases = useMemo(() => {
    let result = [...cases];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.clientName.toLowerCase().includes(term) || 
        c.caseNumber.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "All") result = result.filter(c => c.status === statusFilter);
    if (lawyerFilter) result = result.filter(c => c.lawyerId === lawyerFilter);
    if (clientFilter) result = result.filter(c => c.clientId === clientFilter);
    if (caseTypeFilter) result = result.filter(c => c.caseType === caseTypeFilter);

    return result;
  }, [cases, searchTerm, statusFilter, lawyerFilter, clientFilter, caseTypeFilter]);

  // Validate and Create Case
  const handleCreateCase = async () => {
    if (!newCaseTitle || !newClientId || !newLawyerId) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate deadline
    if (newDeadline && !isValidFutureDate(newDeadline)) {
      setCreateError("Deadline cannot be set to a past date");
      toast.error("Deadline cannot be set to a past date");
      return;
    }

    setCreateError("");

    try {
      const clientName = clients.find(c => c.uid === newClientId)?.displayName || "Unknown";
      const lawyerName = lawyers.find(l => l.uid === newLawyerId)?.displayName || "Unassigned";
      const caseNumber = `CASE-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      await addDoc(collection(db, "cases"), {
        caseNumber,
        title: newCaseTitle.trim(),
        clientId: newClientId,
        clientName,
        lawyerId: newLawyerId,
        lawyerName,
        caseType: newCaseType,
        status: newStatus,
        deadline: newDeadline ? Timestamp.fromDate(new Date(newDeadline)) : null,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      });

      await logger.caseCreated(
        "Admin",
        caseNumber,
        newCaseTitle,
        auth.currentUser?.uid || ""
      );

      toast.success("Case created successfully!");
      setShowCreateModal(false);

      // Reset form
      setNewCaseTitle("");
      setNewDeadline("");
      setNewStatus("Pending");
      setNewCaseType(CASE_TYPES[0]);
      setCreateError("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create case");
    }
  };

  const openEditModal = (caseItem: Case) => {
    setEditingCase(caseItem);
    setEditStatus(caseItem.status);
    setEditDeadline(
      caseItem.deadline 
        ? (caseItem.deadline.toDate ? caseItem.deadline.toDate().toISOString().split('T')[0] : caseItem.deadline)
        : ""
    );
    setEditError("");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCase) return;

    // Validate deadline
    if (editDeadline && !isValidFutureDate(editDeadline)) {
      setEditError("Deadline cannot be set to a past date");
      toast.error("Deadline cannot be set to a past date");
      return;
    }

    setEditError("");

    try {
      const oldStatus = editingCase.status;

      await updateDoc(doc(db, "cases", editingCase.uid), {
        status: editStatus,
        deadline: editDeadline ? Timestamp.fromDate(new Date(editDeadline)) : null,
        lastUpdated: Timestamp.now(),
      });

      await logger.statusChanged(
        "Admin",
        editingCase.caseNumber,
        oldStatus,
        editStatus,
        auth.currentUser?.uid || ""
      );

      toast.success("Case updated successfully!");
      setShowEditModal(false);
      setEditingCase(null);
      setEditError("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update case");
    }
  };

  const deleteCase = async (caseId: string) => {
    if (!confirm("Mark this case as deleted?")) return;

    try {
      const caseToDelete = cases.find(c => c.uid === caseId);
      
      await setDoc(doc(db, "cases", caseId), { 
        deleted: true, 
        deletedAt: Timestamp.now() 
      }, { merge: true });

      if (caseToDelete) {
        await logger.caseUpdated(
          "Admin",
          caseToDelete.caseNumber,
          "Case marked as deleted",
          auth.currentUser?.uid || ""
        );
      }

      toast.success("Case marked as deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete case");
    }
  };

  const getStatusInfo = (status: CaseStatus) => {
    const statusMap: Record<CaseStatus, { className: string; icon: string }> = {
      Pending: { className: "bg-amber-100 text-amber-800", icon: "⏳" },
      "In Progress": { className: "bg-blue-100 text-blue-800", icon: "⚡" },
      Completed: { className: "bg-emerald-100 text-emerald-800", icon: "✅" },
      Overdue: { className: "bg-red-100 text-red-800", icon: "⚠️" },
    };
    return statusMap[status] || { className: "bg-gray-100 text-gray-800", icon: "❓" };
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-10 max-w-md text-center">
          <p className="text-red-600 mb-4">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-teal-600 text-white rounded-2xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">Case Management</h1>
          <p className="text-gray-500 mt-1">Manage all legal cases efficiently</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-medium transition"
          >
            <Plus className="w-5 h-5" /> New Case
          </button>
          <Bell className="w-5 h-5 text-gray-500 cursor-pointer" />
          <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold cursor-pointer">AC</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search cases, clients or case numbers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-500"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
          <p className="text-gray-500">Loading cases...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Cases", value: cases.length },
              { label: "Pending", value: cases.filter(c => c.status === "Pending").length, color: "text-amber-600" },
              { label: "In Progress", value: cases.filter(c => c.status === "In Progress").length, color: "text-blue-600" },
              { label: "Completed", value: cases.filter(c => c.status === "Completed").length, color: "text-emerald-600" },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500">{stat.label}</div>
                <div className={`text-4xl font-semibold mt-3 ${stat.color || ""}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Filter className="w-4 h-4" /> Filters:</div>
            
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
              {["All", "Pending", "In Progress", "Completed", "Overdue"].map(s => (
                <button 
                  key={s} 
                  onClick={() => setStatusFilter(s as any)} 
                  className={`px-6 py-2 text-xs font-medium rounded-xl transition ${statusFilter === s ? "bg-teal-600 text-white" : "hover:bg-gray-100"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <select value={lawyerFilter} onChange={e => setLawyerFilter(e.target.value)} className="bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm">
              <option value="">All Lawyers</option>
              {lawyers.map(l => <option key={l.uid} value={l.uid}>{l.displayName}</option>)}
            </select>

            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm">
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.uid} value={c.uid}>{c.displayName}</option>)}
            </select>

            <select value={caseTypeFilter} onChange={e => setCaseTypeFilter(e.target.value)} className="bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm">
              <option value="">All Case Types</option>
              {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button className="ml-auto flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 text-sm font-medium">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Case Number", "Title", "Client", "Lawyer", "Case Type", "Status", "Deadline", "Last Updated", "Actions"].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center text-gray-500">
                      No cases found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => {
                    const statusInfo = getStatusInfo(c.status);

                    return (
                      <tr key={c.uid} className="hover:bg-teal-50/60">
                        <td className="px-6 py-5 font-mono text-sm font-medium">{c.caseNumber}</td>
                        <td className="px-6 py-5 font-medium text-gray-800">{c.title}</td>
                        <td className="px-6 py-5 text-gray-700">{c.clientName}</td>
                        <td className="px-6 py-5 text-gray-600">
                          {lawyers.find(l => l.uid === c.lawyerId)?.displayName || "Unassigned"}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{c.caseType}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                            <span>{statusInfo.icon}</span> {c.status}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600">{formatDate(c.deadline)}</td>
                        <td className="px-6 py-5 text-xs text-gray-500">{formatDate(c.lastUpdated)}</td>
                        <td className="px-6 py-5">
                          <div className="flex gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-xl"><Eye className="w-4 h-4" /></button>
                            <button 
                              onClick={() => openEditModal(c)} 
                              className="p-2 hover:bg-gray-100 rounded-xl text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteCase(c.uid)} 
                              className="p-2 hover:bg-red-50 text-red-600 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="px-8 py-6 border-b">
              <h2 className="text-2xl font-semibold">Create New Case</h2>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Case Title</label>
                <input 
                  type="text" 
                  value={newCaseTitle} 
                  onChange={e => setNewCaseTitle(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500" 
                  placeholder="e.g. Land Dispute - Plot 156" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Client</label>
                  <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500">
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.uid} value={c.uid}>{c.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Lawyer</label>
                  <select value={newLawyerId} onChange={e => setNewLawyerId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500">
                    <option value="">Select Lawyer</option>
                    {lawyers.map(l => <option key={l.uid} value={l.uid}>{l.displayName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Case Type</label>
                  <select value={newCaseType} onChange={e => setNewCaseType(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500">
                    {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Status</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value as CaseStatus)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500">
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Deadline <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={newDeadline} 
                  min={new Date().toISOString().split('T')[0]}   // Prevents past dates in calendar
                  onChange={e => {
                    setNewDeadline(e.target.value);
                    setCreateError("");
                  }} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500" 
                />
                {createError && <p className="text-red-600 text-sm mt-1">{createError}</p>}
              </div>
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => {
                setShowCreateModal(false);
                setCreateError("");
              }} className="px-8 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl">Cancel</button>
              <button onClick={handleCreateCase} className="px-10 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold">Create Case</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingCase && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="px-8 py-6 border-b">
              <h2 className="text-2xl font-semibold">Edit Case</h2>
              <p className="text-sm text-gray-500">{editingCase.caseNumber}</p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as CaseStatus)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500">
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Deadline</label>
                <input 
                  type="date" 
                  value={editDeadline} 
                  min={new Date().toISOString().split('T')[0]}   // Prevents selecting past dates
                  onChange={e => {
                    setEditDeadline(e.target.value);
                    setEditError("");
                  }} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:border-teal-500" 
                />
                {editError && <p className="text-red-600 text-sm mt-1">{editError}</p>}
              </div>
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => {
                setShowEditModal(false);
                setEditError("");
              }} className="px-8 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl">Cancel</button>
              <button onClick={handleSaveEdit} className="px-10 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}