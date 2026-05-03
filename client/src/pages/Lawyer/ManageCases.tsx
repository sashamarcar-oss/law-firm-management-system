import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input 2";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { User, Scale, Mail, Calendar, Edit3, Save, X, CheckCircle, Camera } from "lucide-react";

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
  const [isUploading, setIsUploading] = useState(false); // Future upload state

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
            createdAt: raw.createdAt?.toDate?.()
              ? raw.createdAt.toDate().toISOString().split("T")[0]
              : undefined,
          };
          setProfile(data);
          setFormData(data);
        }
      } catch (err) {
        console.error(err);
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
    if (!firebaseUser?.uid) return toast.error("You must be logged in");

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
      toast.success("Profile updated successfully ✨", { duration: 2500 });
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const toggleEdit = () => {
    if (isEditing) setFormData(profile);
    setIsEditing(!isEditing);
  };

  // Fake upload handler (ready for real implementation)
  const handleAvatarUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      toast.success("Profile picture updated (demo)");
      setIsUploading(false);
    }, 1500);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-[#0A2540] via-[#132F52] to-[#F8F4EC]">
        <div className="w-80 h-96 bg-white/10 backdrop-blur-3xl rounded-3xl animate-pulse border border-white/20" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <div className="p-8 text-center text-white">Sign in required</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2540] via-[#132F52] to-[#F8F4EC] py-12 px-4 overflow-hidden relative">
      <div className="container max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: Avatar Section - Premium Glass */}
          <motion.div
            className="lg:w-1/3"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <Card className="relative overflow-hidden backdrop-blur-3xl bg-white/10 border border-white/40 shadow-2xl group">
              {/* Multi-layer glass noise */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.8px,transparent_1px)] bg-[length:4px_4px] opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />

              <CardContent className="pt-12 pb-10 flex flex-col items-center text-center relative z-10">
                <div className="relative group/avatar">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Avatar className="h-44 w-44 border-[8px] border-white/90 shadow-2xl ring-4 ring-[#2AAA8A]/50 transition-all group-hover:ring-[#2AAA8A] relative">
                      <AvatarFallback className="text-7xl bg-gradient-to-br from-[#0A2540] to-[#2AAA8A] text-white font-bold">
                        {(profile.name ?? currentUser?.displayName ?? "L")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  {/* Upload Button Overlay */}
                  <motion.button
                    onClick={handleAvatarUpload}
                    disabled={isUploading}
                    className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-[#0A2540] p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera className="w-5 h-5" />
                  </motion.button>

                  {/* Dynamic Glow */}
                  <motion.div
                    className="absolute -inset-10 bg-gradient-to-br from-[#2AAA8A]/40 via-transparent to-[#0A2540]/20 rounded-full blur-3xl -z-10"
                    animate={{ opacity: [0.3, 0.65, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />
                </div>

                {/* Floating Verified Badge */}
                <motion.div
                  className="absolute -top-5 -right-5 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl shadow-2xl border border-white/60 bg-white/15 backdrop-blur-3xl"
                  animate={{
                    y: [-12, -7, -12],
                    rotate: [-3, 3, -3],
                  }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.1 }}
                >
                  <div className="relative">
                    <CheckCircle className="w-6 h-6 text-[#2AAA8A]" />
                    <div className="absolute inset-0 bg-[#2AAA8A] rounded-full animate-ping opacity-25" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold tracking-widest">VERIFIED</p>
                    <p className="text-[#2AAA8A] text-xs font-medium">LAWYER</p>
                  </div>
                </motion.div>

                <h1 className="mt-10 text-4xl font-bold text-white tracking-tighter">
                  {profile.name ?? currentUser?.displayName ?? "Advocate"}
                </h1>

                <div className="flex items-center gap-2 mt-4 text-[#2AAA8A] group-hover:text-white transition-colors duration-300">
                  <Scale className="w-5 h-5" />
                  <p className="font-semibold tracking-wide">
                    {profile.barNumber ?? "Bar number not set"}
                  </p>
                </div>

                <p className="text-white/80 mt-2 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> {firebaseUser.email}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Main Content */}
          <div className="lg:w-2/3 space-y-8">
            {/* Professional Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1 }}
            >
              <Card className="relative overflow-hidden backdrop-blur-3xl bg-white/10 border border-white/40 shadow-2xl group hover:border-[#2AAA8A]/60 transition-all duration-700">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.6px,transparent_1px)] bg-[length:3px_3px] opacity-10" />

                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2AAA8A]/10 rounded-xl">
                      <User className="w-6 h-6 text-[#2AAA8A]" />
                    </div>
                    <CardTitle className="text-2xl text-white">Professional Profile</CardTitle>
                  </div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={isEditing ? "outline" : "default"}
                      onClick={toggleEdit}
                      disabled={saving}
                      className="bg-white/10 hover:bg-white/20 border-white/50 text-white hover:border-[#2AAA8A] transition-all"
                    >
                      {isEditing ? (
                        <> <X className="w-4 h-4 mr-1" /> Cancel </>
                      ) : (
                        <> <Edit3 className="w-4 h-4 mr-1" /> Edit Profile </>
                      )}
                    </Button>
                  </motion.div>
                </CardHeader>

                <CardContent className="pt-6 space-y-8 text-white">
                  <div className="grid gap-6 md:grid-cols-2">
                    {["name", "barNumber", "phone"].map((field, index) => (
                      <motion.div
                        key={field}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="space-y-2"
                      >
                        <Label className="text-white/90 font-medium">
                          {field === "name" && "Full Name"}
                          {field === "barNumber" && "Bar Number"}
                          {field === "phone" && "Phone Number"}
                        </Label>
                        {isEditing ? (
                          <Input
                            id={field}
                            name={field}
                            value={formData[field as keyof LawyerProfileData] ?? ""}
                            onChange={handleChange}
                            className="bg-white/10 border-white/40 focus:border-[#2AAA8A] focus:ring-2 focus:ring-[#2AAA8A]/50 text-white placeholder:text-white/60 transition-all"
                          />
                        ) : (
                          <p className="text-lg font-medium py-2.5">
                            {profile[field as keyof LawyerProfileData] ?? "Not set"}
                          </p>
                        )}
                      </motion.div>
                    ))}

                    <div className="space-y-2">
                      <Label className="text-white/90 font-medium">Email</Label>
                      <p className="text-lg font-medium py-2.5 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#2AAA8A]" />
                        {firebaseUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white/90 font-medium">Professional Bio</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        name="bio"
                        value={formData.bio ?? ""}
                        onChange={handleChange}
                        rows={6}
                        className="bg-white/10 border-white/40 focus:border-[#2AAA8A] focus:ring-2 focus:ring-[#2AAA8A]/50 text-white placeholder:text-white/60 resize-y"
                      />
                    ) : (
                      <div className="bg-white/5 border border-white/30 rounded-2xl p-6 min-h-[140px] text-white/90 whitespace-pre-wrap leading-relaxed">
                        {profile.bio ?? "No professional bio added yet."}
                      </div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="flex justify-end pt-4"
                      >
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-[#0A2540] via-[#1A3A5F] to-[#2AAA8A] hover:brightness-110 text-white min-w-[180px] shadow-xl transition-all"
                          >
                            {saving ? "Saving Changes..." : (
                              <> <Save className="w-4 h-4 mr-2" /> Save Changes </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* Account Information Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
            >
              <Card className="relative overflow-hidden backdrop-blur-3xl bg-white/10 border border-white/40 shadow-2xl group hover:border-[#2AAA8A]/60 transition-all duration-700">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.6px,transparent_1px)] bg-[length:3px_3px] opacity-10" />

                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2AAA8A]/10 rounded-xl">
                      <Calendar className="w-5 h-5 text-[#2AAA8A]" />
                    </div>
                    <CardTitle className="text-2xl text-white">Account Information</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-white/90">
                  {[
                    { label: "Email", value: firebaseUser.email },
                    { label: "Member since", value: profile.createdAt ?? "Not available" },
                    { label: "Role", value: "Advocate / Lawyer" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.06 }}
                      className="flex justify-between py-4 border-b border-white/20 last:border-0 hover:bg-white/5 rounded-xl px-3 transition-colors"
                    >
                      <span className="text-white/70">{item.label}</span>
                      <span className="font-medium text-white">{item.value}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}