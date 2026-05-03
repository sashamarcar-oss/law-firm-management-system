// src/hooks/useCollectionSnapshot.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, QueryConstraint } from "firebase/firestore";
import { db } from "@/firebase"; // adjust path if needed

export function useCollectionSnapshot<T = any>(
  collectionName: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const colRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,           // ← always include doc ID (very useful!)
          ...doc.data(),
        })) as T[];

        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error listening to ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, ...constraints]); // dependencies

  return { data, loading, error };
}