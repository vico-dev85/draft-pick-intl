import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Save, RotateCcw } from "lucide-react";

interface ClubData {
  id: string;
  name: string;
  default_location: string | null;
  default_notes: string | null;
  whatsapp_invite_template: string | null;
  whatsapp_results_template: string | null;
}

interface ClubSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_INVITE_TEMPLATE = `היי! הצטרפו לכוחות: {draft_name}
קוד: {room_code}
{link}`;

const DEFAULT_RESULTS_TEMPLATE = `🏆 תוצאות כוחות: {draft_name}

{teams}

📍 {location}
📝 {notes}

לצפייה בתוצאות: {link}`;

export function ClubSettings({ isOpen, onClose }: ClubSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<ClubData | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [inviteTemplate, setInviteTemplate] = useState("");
  const [resultsTemplate, setResultsTemplate] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchClub();
    }
  }, [isOpen]);

  const fetchClub = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_user_club");

      if (error) throw error;

      const clubData = data as ClubData;
      setClub(clubData);
      setName(clubData.name || "");
      setLocation(clubData.default_location || "");
      setNotes(clubData.default_notes || "");
      setInviteTemplate(clubData.whatsapp_invite_template || DEFAULT_INVITE_TEMPLATE);
      setResultsTemplate(clubData.whatsapp_results_template || DEFAULT_RESULTS_TEMPLATE);
    } catch (err) {
      console.error("Error fetching club:", err);
      toast({
        title: "שגיאה בטעינת ההגדרות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_club_settings", {
        p_name: name || null,
        p_default_location: location || null,
        p_default_notes: notes || null,
        p_whatsapp_invite_template: inviteTemplate || null,
        p_whatsapp_results_template: resultsTemplate || null,
      });

      if (error) throw error;

      toast({ title: "ההגדרות נשמרו בהצלחה" });
      onClose();
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "שגיאה בשמירת ההגדרות",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetTemplates = () => {
    setInviteTemplate(DEFAULT_INVITE_TEMPLATE);
    setResultsTemplate(DEFAULT_RESULTS_TEMPLATE);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-emerald-900 z-50 shadow-2xl overflow-hidden flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
              <h2 className="text-xl font-bold text-white">הגדרות הקבוצה</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                </div>
              ) : (
                <>
                  {/* Club Name */}
                  <div className="space-y-2">
                    <Label className="text-white/80">שם הקבוצה</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="הקבוצה שלי"
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Default Location */}
                  <div className="space-y-2">
                    <Label className="text-white/80">מיקום ברירת מחדל</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="לדוגמה: מגרש הכדורגל ליד הקניון"
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    <p className="text-xs text-white/40">
                      יוצג בדף התוצאות ובהודעות וואטסאפ
                    </p>
                  </div>

                  {/* Default Notes */}
                  <div className="space-y-2">
                    <Label className="text-white/80">הערות ברירת מחדל</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="לדוגמה: להביא חולצות שחורות וצהובות"
                      rows={2}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                    />
                  </div>

                  {/* WhatsApp Templates Section */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium">תבניות וואטסאפ</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetTemplates}
                        className="text-white/50 hover:text-white hover:bg-white/10"
                      >
                        <RotateCcw className="h-4 w-4 ml-1" />
                        איפוס
                      </Button>
                    </div>

                    {/* Invite Template */}
                    <div className="space-y-2 mb-4">
                      <Label className="text-white/80">הזמנה לכוחות</Label>
                      <Textarea
                        value={inviteTemplate}
                        onChange={(e) => setInviteTemplate(e.target.value)}
                        rows={4}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-xs text-white/40">
                        משתנים: {"{draft_name}"}, {"{room_code}"}, {"{link}"}
                      </p>
                    </div>

                    {/* Results Template */}
                    <div className="space-y-2">
                      <Label className="text-white/80">שיתוף תוצאות</Label>
                      <Textarea
                        value={resultsTemplate}
                        onChange={(e) => setResultsTemplate(e.target.value)}
                        rows={6}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-xs text-white/40">
                        משתנים: {"{draft_name}"}, {"{teams}"}, {"{location}"}, {"{notes}"}, {"{link}"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5 ml-2" />
                    שמור הגדרות
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
