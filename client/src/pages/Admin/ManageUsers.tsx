import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  doc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'react-hot-toast';
import { type Lawyer } from '@/types';
import { gsap } from 'gsap';

// ------------------ LAWYER MODAL ------------------
function LawyerModal({ lawyer, onClose }: { lawyer: Lawyer | null; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(lawyer?.displayName ?? '');
  const [email, setEmail] = useState(lawyer?.email ?? '');
  const [barNumber, setBarNumber] = useState(lawyer?.barNumber ?? '');
  const [phone, setPhone] = useState(lawyer?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Animate modal open
  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !barNumber) return toast.error('Please fill in all required fields.');

    setLoading(true);
    try {
      const docRef = lawyer?.uid ? doc(db, 'users', lawyer.uid) : doc(collection(db, 'users'));

      const lawyerData: Lawyer = {
        uid: docRef.id,
        displayName,
        email,
        barNumber,
        phone: phone || null,
        createdAt: lawyer?.createdAt ?? Timestamp.now(),
        accessLevel: 'View', // TS requirement
      };

      await setDoc(docRef, { ...lawyerData, role: 'lawyer' }, { merge: true });

      toast.success(`Lawyer ${lawyer ? 'updated' : 'created'} successfully`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save lawyer');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        y: -50,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">{lawyer ? 'Edit Lawyer' : 'Add Lawyer'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bar Number *</label>
            <input
              type="text"
              value={barNumber}
              onChange={(e) => setBarNumber(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : lawyer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------ LAWYERS ADMIN DASHBOARD ------------------
export default function LawyersAdmin() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'lawyer'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Lawyer[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          email: (data.email as string) ?? '',
          displayName: (data.displayName as string | null) ?? null,
          barNumber: (data.barNumber as string) ?? '',
          phone: (data.phone as string | null) ?? null,
          createdAt: (data.createdAt as Timestamp | null) ?? null,
          accessLevel: 'View', // TypeScript requirement
        };
      });
      setLawyers(fetched);
    });
    return () => unsubscribe();
  }, []);

  // Delete a lawyer safely with GSAP animation
  const handleDelete = (uid: string) => {
    if (!confirm('Are you sure you want to delete this lawyer?')) return;

    const row = document.getElementById(uid);
    if (row) {
      gsap.to(row, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          // async function called inside synchronous callback
          (async () => {
            try {
              await deleteDoc(doc(db, 'users', uid));
              toast.success('Lawyer deleted successfully');
            } catch (error) {
              console.error(error);
              toast.error('Failed to delete lawyer');
            }
          })();
        },
      });
    } else {
      (async () => {
        try {
          await deleteDoc(doc(db, 'users', uid));
          toast.success('Lawyer deleted successfully');
        } catch (error) {
          console.error(error);
          toast.error('Failed to delete lawyer');
        }
      })();
    }
  };

  // Filter lawyers based on search
  const filteredLawyers = lawyers.filter((l) =>
    l.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.barNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Animate rows on filter change
  useEffect(() => {
    if (!tbodyRef.current) return;
    const rows = Array.from(tbodyRef.current.children) as HTMLTableRowElement[];
    gsap.killTweensOf(rows);
    rows.forEach((row, index) => {
      gsap.fromTo(
        row,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, delay: index * 0.05, duration: 0.4, ease: 'power2.out' }
      );
    });
  }, [filteredLawyers]);

  return (
    <div className="section max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Manage Lawyers</h1>
        <button
          className="btn-primary bg-green-500 hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
          onClick={() => {
            setSelectedLawyer(null);
            setModalOpen(true);
          }}
        >
          + Add Lawyer
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email or bar #"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/2 border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {filteredLawyers.length === 0 ? (
        <p className="text-gray-600 italic">No lawyers found.</p>
      ) : (
        <div className="card p-4 overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Bar #', 'Phone', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={tbodyRef} className="bg-white divide-y divide-gray-200">
              {filteredLawyers.map((lawyer) => (
                <tr
                  key={lawyer.uid}
                  id={lawyer.uid}
                  className="hover:bg-gray-50 transition-colors duration-300 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">{lawyer.displayName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lawyer.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lawyer.barNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lawyer.phone || '—'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      className="btn-smooth bg-blue-500 text-white px-2 py-1 rounded transform hover:scale-105 transition-transform duration-300"
                      onClick={() => {
                        setSelectedLawyer(lawyer);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-smooth bg-red-500 text-white px-2 py-1 rounded transform hover:scale-105 transition-transform duration-300"
                      onClick={() => handleDelete(lawyer.uid)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <LawyerModal
          lawyer={selectedLawyer}
          onClose={() => {
            setModalOpen(false);
            setSelectedLawyer(null);
          }}
        />
      )}
    </div>
  );
}