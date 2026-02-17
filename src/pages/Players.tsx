import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useClubContext } from "@/hooks/useClubContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Plus,
  Search,
  Camera,
  Loader2,
  X,
  Check,
  Star,
  Link as LinkIcon,
  Unlink,
  Trash2,
  Send,
  ChevronLeft,
  User,
  Mail,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { compressPhoto, uploadPlayerPhoto } from "@/lib/photoUpload";

interface Player {
  id: string;
  name: string;
  photo_url: string | null;
  category: 'regular' | 'occasional';
  linked_user_id: string | null;
  can_create_drafts: boolean;
  can_send_invites: boolean;
  invite_token: string | null;
  invite_expires_at: string | null;
  invite_requested_at: string | null;
}

const PLAYER_COLORS = [
  "player-color-1",
  "player-color-2",
  "player-color-3",
  "player-color-4",
  "player-color-5",
  "player-color-6",
  "player-color-7",
  "player-color-8",
];

function getPlayerColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2);
}

export default function Players() {
  const { user, loading: authLoading } = useAuth();
  const { currentClub, isOwner, isMember, playerId: myPlayerId, permissions } = useClubContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Selected player for bottom sheet
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Add player form (in drawer)
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit mode within player drawer
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Invite state
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && currentClub) {
      fetchPlayers();
    }
  }, [user, currentClub?.id]);

  const fetchPlayers = async () => {
    try {
      let data: Player[] = [];

      if (currentClub) {
        // Use RPC for both owners and members
        const { data: rpcData, error } = await supabase.rpc("get_club_players", {
          p_club_id: currentClub.id,
        });

        if (error) {
          // Fallback to direct query for owners (RPC might not exist yet pre-migration)
          if (isOwner) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from("user_players")
              .select("*")
              .eq("user_id", user?.id)
              .order("category")
              .order("name");

            if (fallbackError) throw fallbackError;
            data = fallbackData || [];
          } else {
            throw error;
          }
        } else {
          data = rpcData || [];
        }
      } else if (isOwner) {
        // Fallback for owners without club yet
        const { data: fallbackData, error } = await supabase
          .from("user_players")
          .select("*")
          .eq("user_id", user?.id)
          .order("category")
          .order("name");

        if (error) throw error;
        data = fallbackData || [];
      }

      setPlayers(data.map(p => ({
        ...p,
        category: p.category || 'regular',
        can_create_drafts: p.can_create_drafts || false,
        can_send_invites: p.can_send_invites || false,
        invite_requested_at: p.invite_requested_at || null,
      })));
    } catch (err) {
      console.error("Error fetching players:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את השחקנים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "קובץ גדול מדי",
        description: "גודל מקסימלי: 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressedFile = await compressPhoto(file);
      const preview = URL.createObjectURL(compressedFile);

      if (isEdit) {
        setEditPhoto(compressedFile);
        setEditPhotoPreview(preview);
      } else {
        setNewPlayerPhoto(compressedFile);
        setPhotoPreview(preview);
      }
    } catch {
      toast({
        title: "שגיאה בעיבוד התמונה",
        description: "נסה תמונה אחרת",
        variant: "destructive",
      });
    }
  };

  const uploadPhoto = async (file: File, playerId: string): Promise<string | null> => {
    if (!user?.id) return null;
    return uploadPlayerPhoto(user.id, playerId, file);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast({
        title: "שם חסר",
        description: "הכנס שם לשחקן",
        variant: "destructive",
      });
      return;
    }

    if (newPlayerName.trim().length > 30) {
      toast({
        title: "שם ארוך מדי",
        description: "מקסימום 30 תווים",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      const { data, error } = await supabase
        .from("user_players")
        .insert({
          user_id: user?.id,
          name: newPlayerName.trim(),
          category: 'regular',
          club_id: currentClub?.id || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "שחקן קיים",
            description: "כבר יש לך שחקן עם שם זה",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      let photoUrl = null;
      if (newPlayerPhoto && data) {
        photoUrl = await uploadPhoto(newPlayerPhoto, data.id);
        if (photoUrl) {
          await supabase
            .from("user_players")
            .update({ photo_url: photoUrl })
            .eq("id", data.id);
        }
      }

      const newPlayer: Player = {
        ...data,
        photo_url: photoUrl,
        category: 'regular',
        can_create_drafts: false,
        can_send_invites: false,
        invite_token: null,
        invite_expires_at: null,
        invite_requested_at: null,
      };

      setPlayers(prev => [...prev, newPlayer].sort((a, b) => {
        if (a.category !== b.category) return a.category === 'regular' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));

      setNewPlayerName("");
      setNewPlayerPhoto(null);
      setPhotoPreview(null);
      setShowAddDrawer(false);

      toast({
        title: "שחקן נוסף!",
        description: `${data.name} נוסף לספרייה`,
      });
    } catch (err) {
      console.error("Error adding player:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להוסיף את השחקן",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setEditName(player.name);
    setEditPhoto(null);
    setEditPhotoPreview(player.photo_url);
    setIsEditing(false);
  };

  const handleUpdatePlayer = async () => {
    if (!selectedPlayer || !editName.trim()) return;

    setIsUpdating(true);

    try {
      let photoUrl = selectedPlayer.photo_url;

      if (editPhoto) {
        photoUrl = await uploadPhoto(editPhoto, selectedPlayer.id);
      }

      const { error } = await supabase
        .from("user_players")
        .update({
          name: editName.trim(),
          photo_url: photoUrl,
        })
        .eq("id", selectedPlayer.id);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "שם קיים",
            description: "כבר יש לך שחקן עם שם זה",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setPlayers(prev =>
        prev
          .map(p =>
            p.id === selectedPlayer.id ? { ...p, name: editName.trim(), photo_url: photoUrl } : p
          )
          .sort((a, b) => {
            if (a.category !== b.category) return a.category === 'regular' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
      );

      setSelectedPlayer({ ...selectedPlayer, name: editName.trim(), photo_url: photoUrl });
      setIsEditing(false);
      toast({ title: "שחקן עודכן" });
    } catch (err) {
      console.error("Error updating player:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את השחקן",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /** Member: update own photo only */
  const handleUpdateOwnPhoto = async () => {
    if (!selectedPlayer || !editPhoto) return;

    setIsUpdating(true);

    try {
      const photoUrl = await uploadPhoto(editPhoto, selectedPlayer.id);

      if (photoUrl) {
        const { error } = await supabase
          .from("user_players")
          .update({ photo_url: photoUrl })
          .eq("id", selectedPlayer.id);

        if (error) throw error;

        setPlayers(prev =>
          prev.map(p =>
            p.id === selectedPlayer.id ? { ...p, photo_url: photoUrl } : p
          )
        );

        setSelectedPlayer({ ...selectedPlayer, photo_url: photoUrl });
        setIsEditing(false);
        toast({ title: "תמונה עודכנה" });
      }
    } catch (err) {
      console.error("Error updating photo:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את התמונה",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCategoryChange = async (category: 'regular' | 'occasional') => {
    if (!selectedPlayer) return;

    try {
      const { error } = await supabase.rpc('update_player_category', {
        p_player_id: selectedPlayer.id,
        p_category: category,
      });

      if (error) throw error;

      setPlayers(prev =>
        prev
          .map(p => p.id === selectedPlayer.id ? { ...p, category } : p)
          .sort((a, b) => {
            if (a.category !== b.category) return a.category === 'regular' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
      );

      setSelectedPlayer({ ...selectedPlayer, category });
    } catch (err) {
      console.error("Error updating category:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את הקטגוריה",
        variant: "destructive",
      });
    }
  };

  const handlePermissionChange = async (permission: 'can_create_drafts' | 'can_send_invites', value: boolean) => {
    if (!selectedPlayer || !selectedPlayer.linked_user_id) return;

    try {
      const { error } = await supabase.rpc('update_player_permissions', {
        p_player_id: selectedPlayer.id,
        p_can_create_drafts: permission === 'can_create_drafts' ? value : undefined,
        p_can_send_invites: permission === 'can_send_invites' ? value : undefined,
      });

      if (error) throw error;

      setPlayers(prev =>
        prev.map(p => p.id === selectedPlayer.id ? { ...p, [permission]: value } : p)
      );

      setSelectedPlayer({ ...selectedPlayer, [permission]: value });
    } catch (err) {
      console.error("Error updating permission:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את ההרשאה",
        variant: "destructive",
      });
    }
  };

  const handleSendInvite = async () => {
    if (!selectedPlayer) return;

    setIsSendingInvite(true);

    try {
      const { data, error } = await supabase.rpc('generate_player_invite', {
        p_player_id: selectedPlayer.id,
      }) as { data: { token: string; player_name: string } | null; error: Error | null };

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      // Create WhatsApp invite message
      const inviteUrl = `${window.location.origin}/?invite=${data.token}`;
      const message = `היי ${data.player_name}! 👋
הצטרף לקבוצה שלנו ב-kohot.online

✓ צפה בהיסטוריית הכוחות שלך
✓ ארגן כוחות בעצמך

${inviteUrl}`;

      // Open WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: "הזמנה נוצרה",
        description: "תוקף ההזמנה: 48 שעות",
      });
    } catch (err) {
      console.error("Error sending invite:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור הזמנה",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleUnlink = async () => {
    if (!selectedPlayer) return;

    try {
      const { error } = await supabase.rpc('unlink_player', {
        p_player_id: selectedPlayer.id,
      });

      if (error) throw error;

      setPlayers(prev =>
        prev.map(p => p.id === selectedPlayer.id ? {
          ...p,
          linked_user_id: null,
          can_create_drafts: false,
          can_send_invites: false,
        } : p)
      );

      setSelectedPlayer({
        ...selectedPlayer,
        linked_user_id: null,
        can_create_drafts: false,
        can_send_invites: false,
      });

      toast({ title: "החשבון נותק" });
    } catch (err) {
      console.error("Error unlinking:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לנתק את החשבון",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;

    try {
      const { error } = await supabase
        .from("user_players")
        .delete()
        .eq("id", selectedPlayer.id);

      if (error) throw error;

      setPlayers(prev => prev.filter(p => p.id !== selectedPlayer.id));
      setSelectedPlayer(null);
      setShowDeleteConfirm(false);

      toast({ title: "שחקן נמחק" });
    } catch (err) {
      console.error("Error deleting player:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את השחקן",
        variant: "destructive",
      });
    }
  };

  // Players who requested an invite (not yet linked)
  const requestedPlayers = players.filter(p => p.invite_requested_at && !p.linked_user_id);
  const requestedIds = new Set(requestedPlayers.map(p => p.id));

  const regularPlayers = players.filter(p => p.category === 'regular' && !requestedIds.has(p.id));
  const occasionalPlayers = players.filter(p => p.category === 'occasional' && !requestedIds.has(p.id));

  const filteredRequested = requestedPlayers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRegular = regularPlayers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOccasional = occasionalPlayers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if selected player is "me" (linked to current user)
  const isMyPlayer = (player: Player) => {
    return isMember && player.linked_user_id === user?.id;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 pb-24">
        {/* Header */}
        <header className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-40" dir="rtl">
          <Link to="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowRight className="h-4 w-4" />
            <span>חזרה</span>
          </Link>
          <h1 className="text-lg font-bold text-white">שחקנים</h1>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>
        </header>

        {/* Search Bar (collapsible) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-black/20 border-b border-white/10"
            >
              <div className="p-3" dir="rtl">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="חיפוש שחקן..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="px-4 py-4" dir="rtl">
          {players.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-black/20 rounded-xl border border-white/10"
            >
              <div className="text-5xl mb-4">👥</div>
              {isOwner ? (
                <>
                  <h3 className="text-lg font-medium text-white mb-2">הוסף את השחקנים שלך</h3>
                  <p className="text-white/60 text-sm mb-4 px-4">
                    אלו השחקנים שמשחקים איתך בדרך כלל.
                    <br />
                    בכל משחק תבחר מי מגיע ותעשה כוחות.
                  </p>
                  <Button
                    onClick={() => setShowAddDrawer(true)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף שחקן
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-white mb-2">אין שחקנים עדיין</h3>
                  <p className="text-white/60 text-sm px-4">
                    המנהל עדיין לא הוסיף שחקנים לקבוצה.
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Requested Players Section — top priority */}
              {filteredRequested.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-sm font-medium text-emerald-400">ביקשו הזמנה ({filteredRequested.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredRequested.map((player, index) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        onClick={() => handlePlayerClick(player)}
                        index={index}
                        isMe={isMyPlayer(player)}
                        isRequested
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Regular Players Section */}
              {filteredRegular.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <h2 className="text-sm font-medium text-white/70">קבועים ({filteredRegular.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredRegular.map((player, index) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        onClick={() => handlePlayerClick(player)}
                        index={index}
                        isMe={isMyPlayer(player)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Occasional Players Section */}
              {filteredOccasional.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-white/70 mb-3">מזדמנים ({filteredOccasional.length})</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredOccasional.map((player, index) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        onClick={() => handlePlayerClick(player)}
                        index={index}
                        isMe={isMyPlayer(player)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* No results */}
              {searchQuery && filteredRegular.length === 0 && filteredOccasional.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  לא נמצאו שחקנים
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* FAB - Add Player (owner only) */}
      {isOwner && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          onClick={() => setShowAddDrawer(true)}
          className="fixed bottom-6 left-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center z-30"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      )}

      {/* Add Player Drawer (owner only) */}
      {isOwner && (
        <Drawer open={showAddDrawer} onOpenChange={setShowAddDrawer}>
          <DrawerContent className="bg-emerald-900 border-white/10">
            <DrawerHeader className="text-right" dir="rtl">
              <DrawerTitle className="text-white">הוסף שחקן חדש</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4" dir="rtl">
              <div className="space-y-2">
                <Label className="text-white/80">שם</Label>
                <Input
                  placeholder="שם השחקן"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  maxLength={30}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">תמונה (אופציונלי)</Label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setNewPlayerPhoto(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg cursor-pointer hover:bg-white/30 transition-colors text-white">
                      <Camera className="h-4 w-4" />
                      <span className="text-sm">בחר תמונה</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handlePhotoChange(e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <Button
                onClick={handleAddPlayer}
                disabled={isAdding || !newPlayerName.trim()}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף שחקן
                  </>
                )}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Player Details Drawer */}
      <Drawer open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DrawerContent className="bg-emerald-900 border-white/10 max-h-[85vh]">
          {selectedPlayer && (
            <div className="overflow-y-auto">
              <DrawerHeader className="text-center pb-0" dir="rtl">
                <DrawerClose asChild>
                  <button className="absolute top-4 left-4 p-2 text-white/60 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </DrawerClose>

                {/* Player Avatar & Name */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="relative">
                    {isEditing && (isOwner || isMyPlayer(selectedPlayer)) ? (
                      <>
                        {editPhotoPreview ? (
                          <img
                            src={editPhotoPreview}
                            alt={editName}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-20 h-20 rounded-full ${getPlayerColor(selectedPlayer.name)} flex items-center justify-center text-white font-bold text-2xl`}>
                            {getInitials(editName || selectedPlayer.name)}
                          </div>
                        )}
                        <label className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-2 cursor-pointer">
                          <Camera className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handlePhotoChange(e, true)}
                            className="hidden"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        {selectedPlayer.photo_url ? (
                          <img
                            src={selectedPlayer.photo_url}
                            alt={selectedPlayer.name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-20 h-20 rounded-full ${getPlayerColor(selectedPlayer.name)} flex items-center justify-center text-white font-bold text-2xl`}>
                            {getInitials(selectedPlayer.name)}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isEditing && isOwner ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-center text-lg font-bold bg-white/10 border-white/20 text-white max-w-[200px]"
                      maxLength={30}
                    />
                  ) : (
                    <DrawerTitle className="text-white text-xl">{selectedPlayer.name}</DrawerTitle>
                  )}

                  {/* "This is me" badge for members */}
                  {isMyPlayer(selectedPlayer) && (
                    <div className="flex items-center gap-1.5 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      <User className="h-3.5 w-3.5" />
                      זה אני
                    </div>
                  )}

                  {/* Connected Status */}
                  {isOwner && (
                    <div className={`flex items-center gap-1.5 text-sm ${selectedPlayer.linked_user_id ? 'text-emerald-400' : 'text-white/50'}`}>
                      <div className={`w-2 h-2 rounded-full ${selectedPlayer.linked_user_id ? 'bg-emerald-400' : 'bg-white/30'}`} />
                      {selectedPlayer.linked_user_id ? 'מחובר' : 'לא מחובר'}
                    </div>
                  )}
                </div>
              </DrawerHeader>

              <div className="p-4 space-y-4" dir="rtl">
                {/* Owner: Edit/Save Button */}
                {isOwner && (
                  <>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setIsEditing(false);
                            setEditName(selectedPlayer.name);
                            setEditPhoto(null);
                            setEditPhotoPreview(selectedPlayer.photo_url);
                          }}
                          className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                        >
                          <X className="h-4 w-4 ml-2" />
                          ביטול
                        </Button>
                        <Button
                          onClick={handleUpdatePlayer}
                          disabled={isUpdating || !editName.trim()}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 ml-2" />
                              שמור
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Camera className="h-4 w-4 ml-2" />
                        ערוך שם ותמונה
                      </Button>
                    )}
                  </>
                )}

                {/* Member: Edit own photo only */}
                {isMember && isMyPlayer(selectedPlayer) && (
                  <>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setIsEditing(false);
                            setEditPhoto(null);
                            setEditPhotoPreview(selectedPlayer.photo_url);
                          }}
                          className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                        >
                          <X className="h-4 w-4 ml-2" />
                          ביטול
                        </Button>
                        <Button
                          onClick={handleUpdateOwnPhoto}
                          disabled={isUpdating || !editPhoto}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 ml-2" />
                              שמור תמונה
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Camera className="h-4 w-4 ml-2" />
                        {selectedPlayer.photo_url ? "עדכן תמונה" : "הוסף תמונה"}
                      </Button>
                    )}
                  </>
                )}

                {/* Category Selector (owner only) */}
                {isOwner && (
                  <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                    <Label className="text-white/70 text-sm mb-3 block">סוג שחקן</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCategoryChange('regular')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          selectedPlayer.category === 'regular'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        <Star className={`h-4 w-4 ${selectedPlayer.category === 'regular' ? 'fill-amber-400' : ''}`} />
                        קבוע
                      </button>
                      <button
                        onClick={() => handleCategoryChange('occasional')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          selectedPlayer.category === 'occasional'
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        מזדמן
                      </button>
                    </div>
                  </div>
                )}

                {/* Permissions (owner only, for linked players) */}
                {isOwner && selectedPlayer.linked_user_id && (
                  <div className="bg-black/20 rounded-xl p-4 border border-white/10 space-y-4">
                    <Label className="text-white/70 text-sm">הרשאות</Label>

                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">יכול ליצור כוחות</span>
                      <Switch
                        checked={selectedPlayer.can_create_drafts}
                        onCheckedChange={(v) => handlePermissionChange('can_create_drafts', v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">יכול להזמין שחקנים</span>
                      <Switch
                        checked={selectedPlayer.can_send_invites}
                        onCheckedChange={(v) => handlePermissionChange('can_send_invites', v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Invite request banner */}
                {selectedPlayer.invite_requested_at && !selectedPlayer.linked_user_id && (
                  <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <p className="text-emerald-400 text-sm font-medium">
                      שחקן זה ביקש להצטרף לקבוצה
                    </p>
                  </div>
                )}

                {/* Invite / Unlink Button (owner only) */}
                {isOwner && (
                  <>
                    {selectedPlayer.linked_user_id ? (
                      <Button
                        onClick={handleUnlink}
                        className="w-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Unlink className="h-4 w-4 ml-2" />
                        נתק חשבון
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSendInvite}
                        disabled={isSendingInvite}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSendingInvite ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 ml-2" />
                            הזמן להצטרף
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}

                {/* Invite button for members with permission */}
                {isMember && permissions.canSendInvites && !isMyPlayer(selectedPlayer) && !selectedPlayer.linked_user_id && (
                  <Button
                    onClick={handleSendInvite}
                    disabled={isSendingInvite}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 ml-2" />
                        הזמן להצטרף
                      </>
                    )}
                  </Button>
                )}

                {/* Delete Button (owner only) */}
                {isOwner && (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחק שחקן
                  </Button>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>בטוח למחוק את {selectedPlayer?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו לא ניתנת לביטול
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlayer}
              className="bg-destructive hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Player Row Component
function PlayerRow({ player, onClick, index, isMe, isRequested }: { player: Player; onClick: () => void; index: number; isMe: boolean; isRequested?: boolean }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 backdrop-blur-sm rounded-xl border transition-colors text-right ${
        isRequested
          ? "bg-emerald-500/10 border-emerald-400/30 hover:bg-emerald-500/20 border-r-2 border-r-emerald-400"
          : isMe
            ? "bg-emerald-500/10 border-emerald-400/30 hover:bg-emerald-500/20"
            : "bg-black/30 border-white/10 hover:bg-black/40"
      }`}
    >
      {/* Avatar */}
      {player.photo_url ? (
        <img
          src={player.photo_url}
          alt={player.name}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className={`w-12 h-12 rounded-full ${getPlayerColor(player.name)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
          {getInitials(player.name)}
        </div>
      )}

      {/* Name & Status */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{player.name}</p>
        {isRequested ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <Mail className="h-3 w-3" />
            ביקש הזמנה
          </p>
        ) : isMe ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <User className="h-3 w-3" />
            זה אני
          </p>
        ) : player.linked_user_id ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            מחובר
          </p>
        ) : null}
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {player.category === 'regular' && (
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
        )}
        <ChevronLeft className="h-4 w-4 text-white/40" />
      </div>
    </motion.button>
  );
}
