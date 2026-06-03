"use client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  has_password: boolean;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [infoError, setInfoError] = useState("");
  const [infoSuccess, setInfoSuccess] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((data: UserProfile) => {
        setProfile(data);
        setName(data.name ?? "");
        setEmail(data.email);
        setAvatarPreview(data.avatar ?? null);
      });
  }, [session?.accessToken]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      setAvatarPreview(result);
      setAvatarData(result);
    };
    img.src = url;
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoError("");
    setInfoSuccess("");
    setInfoLoading(true);

    const emailChanged = email !== profile?.email;
    if (emailChanged && !currentPassword) {
      setInfoError("Enter your current password to change your email");
      setInfoLoading(false);
      return;
    }

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        name: name || null,
        email: emailChanged ? email : undefined,
        current_password: emailChanged ? currentPassword : undefined,
        avatar: avatarData,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setInfoError(data.detail || "Failed to save");
    } else {
      const updated: UserProfile = await res.json();
      setProfile(updated);
      setAvatarData(null);
      setInfoSuccess("Saved");
      await updateSession({ name: updated.name, email: updated.email });
    }
    setInfoLoading(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwLoading(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPwError(data.detail || "Failed to update password");
    } else {
      setPwSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwLoading(false);
  }

  const initials = (name || email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!profile) {
    return <div className="max-w-lg mx-auto px-4 py-12 text-slate-400">Loading…</div>;
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Profile</h1>

      {/* Info form */}
      <form onSubmit={saveInfo} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative group shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl ring-2 ring-indigo-500">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
              Change
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{profile.name || "—"}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{profile.email}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        {/* Current password — only shown when email changed */}
        {email !== profile.email && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Current password (required to change email)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
            />
          </div>
        )}

        {infoError && <p className="text-sm text-red-500">{infoError}</p>}
        {infoSuccess && <p className="text-sm text-green-500">{infoSuccess}</p>}

        <button
          type="submit"
          disabled={infoLoading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-60"
        >
          {infoLoading ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Password form */}
      {profile.has_password && (
        <form onSubmit={savePassword} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">Change password</h2>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
          />
          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-500">{pwSuccess}</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-60"
          >
            {pwLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </main>
  );
}
