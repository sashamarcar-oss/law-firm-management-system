import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'react-hot-toast';
import { type Lawyer } from '@/types';
import { gsap } from 'gsap';

interface LawyerModalProps {
  lawyer: Lawyer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function LawyerModal({ lawyer, onClose, onSaved }: LawyerModalProps) {
  const [displayName, setDisplayName] = useState(lawyer?.displayName ?? '');
  const [email, setEmail] = useState(lawyer?.email ?? '');
  const [barNumber, setBarNumber] = useState(lawyer?.barNumber ?? '');
  const [phone, setPhone] = useState(lawyer?.phone ?? '');
  const [accessLevel, setAccessLevel] = useState<Lawyer['accessLevel']>(
    lawyer?.accessLevel ?? 'View'
  );
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Animate modal in
  useEffect(() => {
    if (modalRef.current && backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -40, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
      );
    }

    // Close on ESC
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !barNumber) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const lawyerData: Lawyer = {
        uid: lawyer?.uid ?? '',
        displayName,
        email,
        barNumber,
        phone: phone || null,
        accessLevel,
        createdAt: lawyer?.createdAt ?? Timestamp.now(),
      };

      const docRef = lawyer
        ? doc(db, 'users', lawyer.uid)
        : doc(db, 'users', doc(db, 'users').id);

      await setDoc(docRef, { ...lawyerData, role: 'lawyer' }, { merge: true });

      toast.success(`Lawyer ${lawyer ? 'updated' : 'created'} successfully`);
      onSaved();
    } catch (error) {
      console.error('Error saving lawyer:', error);
      toast.error('Failed to save lawyer');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (modalRef.current && backdropRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        y: -40,
        scale: 0.9,
        duration: 0.3,
        ease: 'power2.in',
      });
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: onClose,
      });
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative"
      >
        <h2 className="text-2xl font-semibold mb-6">{lawyer ? 'Edit Lawyer' : 'Add Lawyer'}</h2>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Access Level</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as Lawyer['accessLevel'])}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="View">View</option>
              <option value="Edit">Edit</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : lawyer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}