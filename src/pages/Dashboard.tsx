import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useClubContext } from "@/hooks/useClubContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressPhoto, uploadPlayerPhoto } from "@/lib/photoUpload";
import {
  Plus,
  LogOut,
  Loader2,
  Users,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Settings,
  Camera,
  CheckCircle,
  Crown,
} from "lucide-react";
import { ClubSettings } from "@/components/ClubSettings";
import { SelfieAvatarEditor } from "@/components/SelfieAvatarEditor";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { InstallPromptBanner } from "@/components/InstallPromptBanner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface DraftRoom {
  id: string;
  draft_name: string;
  created_at: string;
  status: string;
  room_code: string;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { currentClub, isOwner, isMember, permissions, playerId, playerName, playerPhoto, loading: clubLoading } = useClubContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [drafts, setDrafts] = useState<DraftRoom[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [inviteRequestCount, setInviteRequestCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Member photo upload state
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showMemberSelfieEditor, setShowMemberSelfieEditor] = useState(false);

  // Owner photo upload state
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState<string | null>(null);
  const [isUploadingOwnerPhoto, setIsUploadingOwnerPhoto] = useState(false);
  const [showOwnerSelfieEditor, setShowOwnerSelfieEditor] = useState(false);

  // Onboarding selfie prompt (before 3-step walkthrough)
  const [showOnboardingSelfie, setShowOnboardingSelfie] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Fetch drafts and player count
  useEffect(() => {
    if (user && !clubLoading && currentClub) {
      fetchDrafts();
      if (isOwner) {
        fetchPlayerCount();
        fetchInviteRequestCount();
      }
    }
  }, [user, clubLoading, currentClub]);

  // Show onboarding for new owners with no players
  // If no avatar, show selfie prompt first; otherwise go straight to walkthrough
  useEffect(() => {
    if (isOwner && playerCount === 0 && !clubLoading) {
      const hasAvatar = !!(ownerPhotoUrl || user?.user_metadata?.avatar_url);
      if (!hasAvatar) {
        setShowOnboardingSelfie(true);
      } else {
        setShowOnboarding(true);
      }
    }
  }, [isOwner, playerCount, clubLoading]);

  const fetchPlayerCount = async () => {
    try {
      const { count, error } = await supabase
        .from("user_players")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      if (!error) {
        setPlayerCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching player count:", err);
    }
  };

  const fetchInviteRequestCount = async () => {
    try {
      const { count, error } = await supabase
        .from("user_players")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .not("invite_requested_at", "is", null)
        .is("linked_user_id", null);

      if (!error) {
        setInviteRequestCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching invite request count:", err);
    }
  };

  const fetchDrafts = async () => {
    try {
      let data: DraftRoom[] | null = null;
      let error: Error | null = null;

      if (currentClub && (isMember || isOwner)) {
        // Use club-scoped RPC for both owners and members
        const result = await supabase.rpc("get_club_drafts", {
          p_club_id: currentClub.id,
        });
        data = result.data as DraftRoom[] | null;
        error = result.error;
      }

      // Fallback for owners without club_id on drafts yet
      if (isOwner && (!data || data.length === 0)) {
        const result = await supabase
          .from("draft_rooms")
          .select("*")
          .eq("creator_user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(20);
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error("Error fetching drafts:", err);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleJoinDraft = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 4) {
      navigate(`/join/${code}`);
    } else {
      toast({
        title: "קוד לא תקין",
        description: "קוד החדר צריך להכיל 4 תווים",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDraft = async (draft: DraftRoom) => {
    if (draft.status === "completed") {
      toast({
        title: "לא ניתן למחוק",
        description: "כוחות שהושלמו לא ניתנים למחיקה",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `האם למחוק את "${draft.draft_name}"?`
    );
    if (!confirmed) return;

    setDeletingId(draft.id);
    try {
      const { error } = await supabase
        .from("draft_rooms")
        .delete()
        .eq("id", draft.id);

      if (error) throw error;

      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      toast({ title: "נמחק בהצלחה" });
    } catch (err) {
      console.error("Error deleting draft:", err);
      toast({
        title: "שגיאה במחיקה",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Member selfie upload handler
  const handleMemberSelfieComplete = async (croppedFile: File) => {
    if (!user?.id || !playerId) return;
    setShowMemberSelfieEditor(false);
    setIsUploadingPhoto(true);
    try {
      const compressed = await compressPhoto(croppedFile);
      const url = await uploadPlayerPhoto(user.id, playerId, compressed);
      if (!url) throw new Error("Upload failed");

      await supabase.from("user_players").update({ photo_url: url }).eq("id", playerId);
      setLocalPhotoUrl(url);
      toast({ title: "התמונה עודכנה!" });
    } catch (err) {
      console.error("Member photo upload error:", err);
      toast({ title: "שגיאה בהעלאת התמונה", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Owner selfie upload handler
  const handleOwnerSelfieComplete = async (croppedFile: File) => {
    if (!user?.id) return;
    setShowOwnerSelfieEditor(false);
    setIsUploadingOwnerPhoto(true);
    try {
      const compressed = await compressPhoto(croppedFile);
      const url = await uploadPlayerPhoto(user.id, "owner", compressed);
      if (!url) throw new Error("Upload failed");

      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setOwnerPhotoUrl(url);
      toast({ title: "התמונה עודכנה!" });

      // If this was from onboarding, proceed to walkthrough
      if (playerCount === 0) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Owner photo upload error:", err);
      toast({ title: "שגיאה בהעלאת התמונה", variant: "destructive" });
    } finally {
      setIsUploadingOwnerPhoto(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && joinCode.trim().length === 4) {
      handleJoinDraft();
    }
  };

  // Split drafts into active and completed
  const activeDrafts = drafts.filter(
    (d) => d.status === "waiting" || d.status === "drafting"
  );
  const completedDrafts = drafts.filter((d) => d.status === "completed");
  const recentCompleted = completedDrafts.slice(0, 3);

  if (authLoading || clubLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-emerald-900">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
        </div>
        <div className="relative z-10">
          {/* Skeleton header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20">
            <div className="h-9 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-8 w-8 rounded bg-white/10 animate-pulse" />
          </div>
          {/* Skeleton content */}
          <div className="px-4 py-6 max-w-md mx-auto space-y-6" dir="rtl">
            {/* Profile card skeleton */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>
            {/* CTA button skeleton */}
            <div className="h-16 rounded-md bg-emerald-500/20 animate-pulse" />
            {/* Join code skeleton */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="h-4 w-20 mx-auto rounded bg-white/10 animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="flex-1 h-12 rounded bg-white/10 animate-pulse" />
                <div className="h-12 w-20 rounded bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getDraftLink = (draft: DraftRoom) => {
    if (draft.status === "completed") return `/results/${draft.room_code}`;
    if (draft.status === "drafting") return `/draft/${draft.room_code}`;
    return `/room/${draft.room_code}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header
          className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm"
          dir="rtl"
        >
          <img src="/logo.png" alt="kohot.online" className="h-9 w-auto" />
          <div className="flex items-center gap-1">
            {/* Players button — owner only */}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10 relative"
                onClick={() => navigate("/players")}
              >
                <Users className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">השחקנים שלי</span>
                {inviteRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {inviteRequestCount}
                  </span>
                )}
              </Button>
            )}
            {/* Settings — owner only */}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setShowSettings(true)}
                title="הגדרות"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={handleSignOut}
              title="התנתק"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-md mx-auto space-y-6"
          >
            {/* Member Profile Card */}
            {isMember && playerName && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  {/* Oval avatar — click opens selfie editor */}
                  <button
                    onClick={() => setShowMemberSelfieEditor(true)}
                    className="relative flex-shrink-0"
                    disabled={isUploadingPhoto}
                  >
                    {(localPhotoUrl || playerPhoto) ? (
                      <PlayerAvatar
                        name={playerName}
                        photoUrl={localPhotoUrl || playerPhoto}
                        size="lg"
                        className="border-2 border-emerald-400/50"
                      />
                    ) : (
                      <div className="w-14 h-[4.75rem] rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <Camera className="h-6 w-6 text-white/50" />
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">
                      {playerName}
                    </h2>
                    {currentClub && (
                      <p className="text-white/60 text-sm">
                        חבר ב{currentClub.name}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs">מזוהה אוטומטית</span>
                    </div>
                  </div>
                </div>
                {/* Nudge to add photo if missing */}
                {!(localPhotoUrl || playerPhoto) && (
                  <button
                    onClick={() => setShowMemberSelfieEditor(true)}
                    className="w-full mt-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
                    disabled={isUploadingPhoto}
                  >
                    <Camera className="h-4 w-4 inline ml-1" />
                    צלם תמונה
                  </button>
                )}
              </motion.div>
            )}

            {/* Member guidance — shown when member cannot create drafts */}
            {isMember && !permissions.canCreateDrafts && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10 text-center"
              >
                <p className="text-white/60 text-sm">
                  כשהמנהל ייצור כוחות חדשים, תקבל הודעה להצטרף
                </p>
              </motion.div>
            )}

            {/* Owner Profile Card */}
            {isOwner && currentClub && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  {/* Oval avatar — click opens selfie editor */}
                  <button
                    onClick={() => setShowOwnerSelfieEditor(true)}
                    className="relative flex-shrink-0"
                    disabled={isUploadingOwnerPhoto}
                  >
                    {(ownerPhotoUrl || user?.user_metadata?.avatar_url) ? (
                      <PlayerAvatar
                        name={user?.user_metadata?.full_name || "מנהל"}
                        photoUrl={ownerPhotoUrl || user?.user_metadata?.avatar_url}
                        size="lg"
                        className="border-2 border-amber-400/50"
                      />
                    ) : (
                      <div className="w-14 h-[4.75rem] rounded-full bg-white/10 border-2 border-dashed border-amber-400/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <Camera className="h-6 w-6 text-white/50" />
                      </div>
                    )}
                    {isUploadingOwnerPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "מנהל"}
                    </h2>
                    <p className="text-white/60 text-sm">
                      {currentClub.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-amber-400 text-xs">מנהל הקבוצה</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hero CTA — Create Draft */}
            {permissions.canCreateDrafts && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="space-y-3"
              >
                <Button
                  asChild
                  size="lg"
                  className="w-full h-16 text-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                >
                  <Link to="/create-draft" className="flex items-center justify-center gap-3">
                    <Plus className="h-6 w-6" />
                    צור כוחות חדשים
                  </Link>
                </Button>

                {/* Secondary Actions - owner only */}
                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-11 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white relative"
                    >
                      <Link to="/players" className="flex items-center justify-center gap-2">
                        <Users className="h-4 w-4" />
                        ניהול שחקנים
                        {inviteRequestCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {inviteRequestCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-11 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="h-4 w-4 ml-2" />
                      הגדרות
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* PWA Install Prompt — only after first completed draft */}
            {completedDrafts.length > 0 && (
              <InstallPromptBanner variant="dashboard" />
            )}

            {/* Join Code Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/60 text-sm">יש לך קוד?</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="הקלד קוד"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  maxLength={4}
                  className="flex-1 h-12 text-center text-xl font-mono tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400/20"
                  dir="ltr"
                />
                <Button
                  onClick={handleJoinDraft}
                  disabled={joinCode.trim().length !== 4}
                  className="h-12 px-6 bg-white/10 hover:bg-white/20 text-white border-2 border-white/70"
                >
                  הצטרף
                </Button>
              </div>
            </motion.div>

            {/* Active Drafts */}
            {activeDrafts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="space-y-3"
              >
                <h2 className="text-white/80 text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  כוחות פעילים
                </h2>
                {activeDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{draft.draft_name}</h3>
                        <p className="text-sm text-white/50">
                          {formatDistanceToNow(new Date(draft.created_at), {
                            addSuffix: true,
                            locale: he,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            draft.status === "drafting"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {draft.status === "drafting" ? "בתהליך" : "ממתין"}
                        </span>
                      </div>
                    </div>
                    <div className="px-4 pb-3 flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Link to={getDraftLink(draft)}>
                          <Play className="h-4 w-4 ml-1" />
                          המשך
                        </Link>
                      </Button>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDeleteDraft(draft)}
                          disabled={deletingId === draft.id}
                        >
                          {deletingId === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Recent Completed Drafts */}
            {recentCompleted.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="space-y-3"
              >
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full text-white/60 text-sm font-medium flex items-center justify-between hover:text-white/80 transition-colors"
                >
                  <span>כוחות אחרונים</span>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showHistory && (
                  <div className="space-y-2">
                    {recentCompleted.map((draft) => (
                      <Link
                        key={draft.id}
                        to={getDraftLink(draft)}
                        className="block bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-white text-sm">
                              {draft.draft_name}
                            </h3>
                            <p className="text-xs text-white/40">
                              {formatDistanceToNow(new Date(draft.created_at), {
                                addSuffix: true,
                                locale: he,
                              })}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                            הושלם
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Empty State */}
            {!loadingDrafts && drafts.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-center py-8"
              >
                <div className="text-5xl mb-4">⚽</div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {isMember ? "עדיין אין כוחות בקבוצה" : "עדיין לא יצרת כוחות"}
                </h3>
                <p className="text-white/50 text-sm">
                  {isMember
                    ? "כשהמנהל ייצור כוחות חדשים, הם יופיעו כאן"
                    : permissions.canCreateDrafts
                      ? "לחץ על הכפתור למעלה כדי להתחיל!"
                      : "כשהמנהל ייצור כוחות חדשים, הם יופיעו כאן"}
                </p>
              </motion.div>
            )}

            {/* Loading State — draft list skeleton */}
            {loadingDrafts && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-36 rounded bg-white/10 animate-pulse" />
                        <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
                      </div>
                      <div className="h-6 w-14 rounded-full bg-white/10 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center" dir="rtl">
          <p className="text-white/30 text-xs">
            כוחות אונליין - דראפט הוגן, יותר זמן לשחק
          </p>
        </footer>
      </div>

      {/* Settings Panel - owner only */}
      {isOwner && (
        <ClubSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* Selfie Avatar Editors */}
      <SelfieAvatarEditor
        open={showMemberSelfieEditor}
        onOpenChange={setShowMemberSelfieEditor}
        onComplete={handleMemberSelfieComplete}
      />
      <SelfieAvatarEditor
        open={showOwnerSelfieEditor}
        onOpenChange={setShowOwnerSelfieEditor}
        onComplete={handleOwnerSelfieComplete}
      />

      {/* Onboarding Selfie Prompt — before 3-step walkthrough */}
      <AnimatePresence>
        {showOnboardingSelfie && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => {
                setShowOnboardingSelfie(false);
                setShowOnboarding(true);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              dir="rtl"
            >
              <div className="bg-emerald-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                <div className="text-4xl mb-3">📸</div>
                <h2 className="text-xl font-bold text-white">
                  צלם תמונה לפרופיל
                </h2>
                <p className="text-white/60 text-sm mt-2 mb-6">
                  התמונה שלך תופיע בכרטיס הכוחות
                </p>
                <Button
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base"
                  onClick={() => {
                    setShowOnboardingSelfie(false);
                    setShowOwnerSelfieEditor(true);
                  }}
                >
                  בוא נצלם!
                </Button>
                <button
                  onClick={() => {
                    setShowOnboardingSelfie(false);
                    setShowOnboarding(true);
                  }}
                  className="mt-3 text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  אולי אח"כ
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Onboarding Popup — new owner with no players */}
      <AnimatePresence>
        {showOnboarding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowOnboarding(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              dir="rtl"
            >
              <div className="bg-emerald-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">⚽</div>
                  <h2 className="text-xl font-bold text-white">
                    ברוך הבא לכוחות אונליין!
                  </h2>
                  <p className="text-white/60 text-sm mt-1">
                    3 צעדים פשוטים להתחיל
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">צור את הקבוצה שלך</p>
                      <p className="text-white/50 text-xs">כבר יצרנו לך אחת! אפשר לשנות שם בהגדרות</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">הוסף את השחקנים הקבועים</p>
                      <p className="text-white/50 text-xs">שמור אותם בספרייה לשימוש חוזר</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">ביום המשחק, בחר מי מגיע ותעשה כוחות</p>
                      <p className="text-white/50 text-xs">3 קפטנים, דראפט נחש הוגן</p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base"
                  onClick={() => {
                    setShowOnboarding(false);
                    navigate("/players");
                  }}
                >
                  הבנתי, בוא נתחיל
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
