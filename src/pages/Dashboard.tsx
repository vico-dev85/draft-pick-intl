import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  Zap,
} from "lucide-react";
import { ClubSettings } from "@/components/ClubSettings";
import { SelfieAvatarEditor } from "@/components/SelfieAvatarEditor";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerStatsCard, ClubLeaderboardsCard } from "@/components/PlayerStats";
import { InstallPromptBanner } from "@/components/InstallPromptBanner";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Logo } from "@/components/ui/logo";
import { formatDistanceToNow } from "date-fns";

interface DraftRoom {
  id: string;
  draft_name: string;
  created_at: string;
  status: string;
  room_code: string;
}

export default function Dashboard() {
  const { t } = useTranslation("dashboard");
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

  // Quick draft player import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPlayers, setImportPlayers] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  // Member welcome (after accepting invite)
  const [showMemberWelcome, setShowMemberWelcome] = useState(false);
  const [showMemberSelfiePrompt, setShowMemberSelfiePrompt] = useState(false);

  // Onboarding selfie prompt (before 3-step walkthrough)
  const [showOnboardingSelfie, setShowOnboardingSelfie] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Member welcome after accepting invite
  useEffect(() => {
    if (isMember && !clubLoading && currentClub) {
      try {
        const flag = localStorage.getItem("pnk_just_joined_club");
        if (flag) {
          localStorage.removeItem("pnk_just_joined_club");
          setShowMemberWelcome(true);
          // Flag so the selfie prompt opens after the welcome modal closes
          localStorage.setItem("pnk_offer_selfie_after_welcome", "1");
        }
      } catch {}
    }
  }, [isMember, clubLoading, currentClub]);

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

  // Check for quick draft players to import (takes priority over normal onboarding)
  useEffect(() => {
    if (isOwner && currentClub && !clubLoading && playerCount !== null) {
      try {
        const saved = localStorage.getItem("pnk_quick_draft_players");
        if (saved) {
          const names = JSON.parse(saved) as string[];
          if (Array.isArray(names) && names.length > 0) {
            setImportPlayers(names);
            setShowImportModal(true);
            return; // Skip normal onboarding — import modal takes priority
          }
        }
      } catch { /* ignore parse errors */ }

      // Normal onboarding for new owners with no players
      if (playerCount === 0) {
        const hasAvatar = !!(ownerPhotoUrl || user?.user_metadata?.avatar_url);
        if (!hasAvatar) {
          setShowOnboardingSelfie(true);
        } else {
          setShowOnboarding(true);
        }
      }
    }
  }, [isOwner, currentClub, playerCount, clubLoading]);

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
        title: t("joinCode.invalidCode"),
        description: t("joinCode.invalidCodeDescription"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteDraft = async (draft: DraftRoom) => {
    if (draft.status === "completed") {
      toast({
        title: t("drafts.cannotDelete"),
        description: t("drafts.cannotDeleteDescription"),
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      t("drafts.confirmDelete", { name: draft.draft_name })
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
      toast({ title: t("drafts.deleted") });
    } catch (err) {
      console.error("Error deleting draft:", err);
      toast({
        title: t("drafts.deleteError"),
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
      toast({ title: t("photoUpdated") });
    } catch (err) {
      console.error("Member photo upload error:", err);
      toast({ title: t("photoUploadError"), variant: "destructive" });
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
      toast({ title: t("photoUpdated") });

      // If this was from onboarding, proceed to walkthrough
      if (playerCount === 0) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Owner photo upload error:", err);
      toast({ title: t("photoUploadError"), variant: "destructive" });
    } finally {
      setIsUploadingOwnerPhoto(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && joinCode.trim().length === 4) {
      handleJoinDraft();
    }
  };

  // Import quick draft players into user_players
  const handleImportPlayers = async () => {
    if (!user?.id || importPlayers.length === 0) return;
    setImporting(true);
    try {
      const rows = importPlayers.map((name) => ({
        user_id: user.id,
        display_name: name,
        category: "regular" as const,
      }));
      const { error } = await supabase.from("user_players").insert(rows);
      if (error) throw error;

      toast({ title: t("quickDraftImport.success", { count: importPlayers.length }) });
      localStorage.removeItem("pnk_quick_draft_players");
      localStorage.removeItem("pnk_quick_draft_room");
      setShowImportModal(false);
      setPlayerCount(importPlayers.length);
    } catch (err) {
      console.error("Error importing players:", err);
      toast({ title: t("quickDraftImport.error"), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleSkipImport = () => {
    localStorage.removeItem("pnk_quick_draft_players");
    localStorage.removeItem("pnk_quick_draft_room");
    setShowImportModal(false);
    // Trigger normal onboarding if no players
    if (playerCount === 0) {
      const hasAvatar = !!(ownerPhotoUrl || user?.user_metadata?.avatar_url);
      if (!hasAvatar) {
        setShowOnboardingSelfie(true);
      } else {
        setShowOnboarding(true);
      }
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
      <div className="min-h-screen bg-background">
        <div>
          {/* Skeleton header */}
          <div className="p-4 flex items-center justify-between border-b border-border bg-background/80">
            <div className="h-9 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          </div>
          {/* Skeleton content */}
          <div className="px-4 py-6 max-w-md mx-auto space-y-6">
            {/* Profile card skeleton */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-card">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
            {/* CTA button skeleton */}
            <div className="h-16 rounded-md bg-primary/10 animate-pulse" />
            {/* Join code skeleton */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-card">
              <div className="h-4 w-20 mx-auto rounded bg-muted animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="flex-1 h-12 rounded bg-muted animate-pulse" />
                <div className="h-12 w-20 rounded bg-muted animate-pulse" />
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
    <div className="min-h-screen bg-background bg-mesh-light">
      {/* Content Layer */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header
          className="p-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm"
        >
          <Logo size="md" />
          <div className="flex items-center gap-1">
            {/* Players button — owner only */}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/10 relative"
                onClick={() => navigate("/players")}
              >
                <Users className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t("header.myPlayers")}</span>
                {inviteRequestCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
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
                className="text-muted-foreground hover:text-foreground hover:bg-accent/10"
                onClick={() => setShowSettings(true)}
                title={t("header.settings")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <LanguagePicker />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent/10"
              onClick={handleSignOut}
              title={t("header.signOut")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6">
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
                className="bg-card rounded-xl p-4 border border-border shadow-card"
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
                        className="border-2 border-primary/50"
                      />
                    ) : (
                      <div className="w-14 h-[4.75rem] rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-heading font-bold text-foreground truncate">
                      {playerName}
                    </h2>
                    {currentClub && (
                      <p className="text-muted-foreground text-sm">
                        {t("profile.memberOf", { clubName: currentClub.name })}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                      <span className="text-primary text-xs">{t("profile.autoIdentified")}</span>
                    </div>
                  </div>
                </div>
                {/* Nudge to add photo if missing */}
                {!(localPhotoUrl || playerPhoto) && (
                  <button
                    onClick={() => setShowMemberSelfieEditor(true)}
                    className="w-full mt-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm transition-colors"
                    disabled={isUploadingPhoto}
                  >
                    <Camera className="h-4 w-4 inline mr-1" />
                    {t("profile.takePhoto")}
                  </button>
                )}
              </motion.div>
            )}

            {/* Member guidance — shown when member cannot create drafts */}
            {isMember && !permissions.canCreateDrafts && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-muted/50 rounded-xl p-4 border border-border text-center"
              >
                <p className="text-muted-foreground text-sm">
                  {t("memberGuidance")}
                </p>
              </motion.div>
            )}

            {/* Owner Profile Card */}
            {isOwner && currentClub && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 border border-border shadow-card"
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
                        name={user?.user_metadata?.full_name || t("profile.defaultOwnerName")}
                        photoUrl={ownerPhotoUrl || user?.user_metadata?.avatar_url}
                        size="lg"
                        className="border-2 border-amber-400/50"
                      />
                    ) : (
                      <div className="w-14 h-[4.75rem] rounded-full bg-muted border-2 border-dashed border-amber-400/30 flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {isUploadingOwnerPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-heading font-bold text-foreground truncate">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0] || t("profile.defaultOwnerName")}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      {currentClub.logo_url && (
                        <img
                          src={currentClub.logo_url}
                          alt=""
                          className="w-5 h-5 rounded-md object-cover border border-border"
                        />
                      )}
                      <p className="text-muted-foreground text-sm truncate">
                        {currentClub.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-amber-400 text-xs">{t("profile.clubOwner")}</span>
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
                  className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <Link to="/create-draft" className="flex items-center justify-center gap-3">
                    <Plus className="h-6 w-6" />
                    {t("cta.createDraft")}
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12 bg-card border-border text-foreground hover:bg-accent/10"
                >
                  <Link to="/solo-draft" className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4" />
                    {t("cta.splitTeams")}
                  </Link>
                </Button>

                {/* Secondary Actions - owner only */}
                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-11 bg-card border-border text-foreground hover:bg-accent/10 relative"
                    >
                      <Link to="/players" className="flex items-center justify-center gap-2">
                        <Users className="h-4 w-4" />
                        {t("cta.managePlayers")}
                        {inviteRequestCount > 0 && (
                          <span className="absolute -top-2 -left-2 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {inviteRequestCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-11 bg-card border-border text-foreground hover:bg-accent/10"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t("cta.settings")}
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
              className="bg-card rounded-xl p-4 border border-border shadow-card"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-sm">{t("joinCode.title")}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={t("joinCode.placeholder")}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  maxLength={4}
                  className="flex-1 h-12 text-center text-xl font-mono tracking-widest"
                  dir="ltr"
                />
                <Button
                  onClick={handleJoinDraft}
                  disabled={joinCode.trim().length !== 4}
                  className="h-12 px-6 bg-muted hover:bg-muted/80 text-foreground border-2 border-border"
                >
                  {t("joinCode.join")}
                </Button>
              </div>
            </motion.div>

            {/* Personal Stats — always shows when a club exists; the card handles
                empty states (owner without player record / 0 games played). */}
            {currentClub && (
              <PlayerStatsCard
                playerId={playerId}
                playerName={playerName ?? (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "You"}
                playerPhoto={localPhotoUrl || playerPhoto}
              />
            )}

            {/* Active Drafts */}
            {activeDrafts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="space-y-3"
              >
                <h2 className="text-foreground/80 text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  {t("drafts.active")}
                </h2>
                {activeDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{draft.draft_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(draft.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            draft.status === "drafting"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {draft.status === "drafting" ? t("drafts.statusDrafting") : t("drafts.statusWaiting")}
                        </span>
                      </div>
                    </div>
                    <div className="px-4 pb-3 flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Link to={getDraftLink(draft)}>
                          <Play className="h-4 w-4 mr-1" />
                          {t("drafts.continue")}
                        </Link>
                      </Button>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
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
                  className="w-full text-muted-foreground text-sm font-medium flex items-center justify-between hover:text-foreground/80 transition-colors"
                >
                  <span>{t("drafts.recent")}</span>
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
                        className="block bg-card rounded-xl p-3 border border-border shadow-card hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground text-sm">
                              {draft.draft_name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(draft.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {t("drafts.statusCompleted")}
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
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {isMember ? t("empty.memberTitle") : t("empty.ownerTitle")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isMember
                    ? t("empty.memberDescription")
                    : permissions.canCreateDrafts
                      ? t("empty.ownerDescription")
                      : t("empty.memberFallback")}
                </p>
              </motion.div>
            )}

            {/* Loading State — draft list skeleton */}
            {loadingDrafts && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-card rounded-xl p-4 border border-border shadow-card">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                      </div>
                      <div className="h-6 w-14 rounded-full bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Club Leaderboards — public, anyone in the club sees these */}
            {currentClub && (
              <div className="mt-6">
                <ClubLeaderboardsCard clubId={currentClub.id} />
              </div>
            )}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center">
          <p className="text-muted-foreground text-xs">
            {t("footer")}
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

      {/* Member Welcome Modal — after accepting invite */}
      <AnimatePresence>
        {showMemberWelcome && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowMemberWelcome(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">&#127881;</div>
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    {t("memberWelcome.title")}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {t("memberWelcome.subtitle", { clubName: currentClub?.name })}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{t("memberWelcome.step1Title")}</p>
                      <p className="text-muted-foreground text-xs">{t("memberWelcome.step1Description")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{t("memberWelcome.step2Title")}</p>
                      <p className="text-muted-foreground text-xs">{t("memberWelcome.step2Description")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{t("memberWelcome.step3Title")}</p>
                      <p className="text-muted-foreground text-xs">{t("memberWelcome.step3Description")}</p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
                  onClick={() => {
                    setShowMemberWelcome(false);
                    // If the post-invite flow asked us to offer a selfie next, do it
                    try {
                      const offer = localStorage.getItem("pnk_offer_selfie_after_welcome");
                      if (offer) {
                        localStorage.removeItem("pnk_offer_selfie_after_welcome");
                        // Small delay so the welcome modal exit anim finishes
                        setTimeout(() => setShowMemberSelfiePrompt(true), 200);
                      }
                    } catch {}
                  }}
                >
                  {t("memberWelcome.cta")}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Draft Player Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
                <div className="text-4xl mb-3">&#127881;</div>
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {t("quickDraftImport.title")}
                </h2>
                <p className="text-muted-foreground text-sm mt-2 mb-4">
                  {t("quickDraftImport.subtitle", { count: importPlayers.length })}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mb-6 max-h-32 overflow-y-auto">
                  {importPlayers.map((name, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
                  onClick={handleImportPlayers}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t("quickDraftImport.cta", { count: importPlayers.length })
                  )}
                </Button>
                <button
                  onClick={handleSkipImport}
                  className="mt-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
                  disabled={importing}
                >
                  {t("quickDraftImport.skip")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Member Selfie Prompt — shown right after the join-club welcome */}
      <AnimatePresence>
        {showMemberSelfiePrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowMemberSelfiePrompt(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
                <div className="text-4xl mb-3">📸</div>
                <h2 className="text-xl font-heading font-bold text-foreground">
                  Add your photo
                </h2>
                <p className="text-muted-foreground text-sm mt-2 mb-6">
                  Take a quick selfie so the rest of the group can spot you in
                  team line-ups and share images. You can do this anytime later.
                </p>
                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
                  onClick={() => {
                    setShowMemberSelfiePrompt(false);
                    setShowMemberSelfieEditor(true);
                  }}
                >
                  📸 Take selfie
                </Button>
                <button
                  onClick={() => setShowMemberSelfiePrompt(false)}
                  className="mt-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            >
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
                <div className="text-4xl mb-3">📸</div>
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {t("onboarding.selfie.title")}
                </h2>
                <p className="text-muted-foreground text-sm mt-2 mb-6">
                  {t("onboarding.selfie.description")}
                </p>
                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
                  onClick={() => {
                    setShowOnboardingSelfie(false);
                    setShowOwnerSelfieEditor(true);
                  }}
                >
                  {t("onboarding.selfie.cta")}
                </Button>
                <button
                  onClick={() => {
                    setShowOnboardingSelfie(false);
                    setShowOnboarding(true);
                  }}
                  className="mt-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  {t("onboarding.selfie.skip")}
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
            >
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">⚽</div>
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    {t("onboarding.welcome.title")}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {t("onboarding.welcome.subtitle")}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{t("onboarding.welcome.step1Title")}</p>
                      <p className="text-muted-foreground text-xs">{t("onboarding.welcome.step1Description")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{t("onboarding.welcome.step2Title")}</p>
                      <p className="text-muted-foreground text-xs">{t("onboarding.welcome.step2Description")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{t("onboarding.welcome.step3Title")}</p>
                      <p className="text-muted-foreground text-xs">{t("onboarding.welcome.step3Description")}</p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
                  onClick={() => {
                    setShowOnboarding(false);
                    navigate("/players");
                  }}
                >
                  {t("onboarding.welcome.cta")}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
