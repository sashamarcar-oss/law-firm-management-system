import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import  Button  from "@/components/ui/button";
import { Input } from "@/components/ui/input 2";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LawyerProfileData {
  name?: string;
  barNumber?: string;
  phone?: string;
  bio?: string;
  createdAt?: string;
}

export default function LawyerProfile() {
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<LawyerProfileData>({});
  const [formData, setFormData] = useState<LawyerProfileData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser?.uid) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const raw = snap.data();

          const data: LawyerProfileData = {
            name: raw.name ?? undefined,
            barNumber: raw.barNumber ?? undefined,
            phone: raw.phone ?? undefined,
            bio: raw.bio ?? undefined,
            createdAt: raw.createdAt?.toDate
              ? raw.createdAt.toDate().toISOString().split("T")[0]
              : undefined,
          };

          setProfile(data);
          setFormData(data);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        toast.error("Could not load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authLoading, firebaseUser?.uid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!firebaseUser?.uid) {
      toast.error("You must be logged in");
      return;
    }

    setSaving(true);

    try {
      const ref = doc(db, "users", firebaseUser.uid);
      await updateDoc(ref, {
        name: formData.name?.trim() || null,
        barNumber: formData.barNumber?.trim() || null,
        phone: formData.phone?.trim() || null,
        bio: formData.bio?.trim() || null,
      });

      setProfile(formData);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Sign in required</h2>
        <p className="text-gray-600 mb-6">
          You need to be logged in to view or edit your profile.
        </p>
        <Button asChild>
          <a href="/login">Sign In</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row gap-10">
        {/* Left: Avatar + basic info */}
        <div className="md:w-1/3 flex flex-col items-center text-center">
          <Avatar className="h-32 w-32 border-4 border-gray-200 shadow-md">
            <AvatarFallback className="text-4xl bg-blue-600 text-white">
              {(profile.name ?? currentUser?.displayName ?? "L")[0]}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-6 text-3xl font-bold">
            {profile.name ?? currentUser?.displayName ?? "Advocate"}
          </h1>

          <p className="mt-2 text-gray-600">
            {profile.barNumber ?? "Bar number not set"}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            {firebaseUser.email}
          </p>
        </div>

        {/* Right: Form + account info */}
        <div className="md:w-2/3 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Profile</CardTitle>
              </div>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => setIsEditing(!isEditing)}
                disabled={saving}
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      value={formData.name ?? ""}
                      onChange={handleChange}
                      placeholder="Your full name"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {profile.name ?? "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barNumber">Bar Number</Label>
                  {isEditing ? (
                    <Input
                      id="barNumber"
                      name="barNumber"
                      value={formData.barNumber ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. P.1234/567"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {profile.barNumber ?? "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone ?? ""}
                      onChange={handleChange}
                      placeholder="+254 7XX XXX XXX"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {profile.phone ?? "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-gray-900 font-medium">
                    {firebaseUser.email ?? "Not available"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio ?? ""}
                    onChange={handleChange}
                    placeholder="Describe your experience, expertise, practice areas..."
                    rows={5}
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap min-h-[100px]">
                    {profile.bio ?? "No bio added yet."}
                  </p>
                )}
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="min-w-[160px]"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="font-medium">{firebaseUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member since</span>
                <span className="font-medium">
                  {profile.createdAt ?? "Not available"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role</span>
                <span className="font-medium">Lawyer</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}