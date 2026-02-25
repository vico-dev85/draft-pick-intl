import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

const DEFAULT_INVITE_TEMPLATE = `Hey! Join our draft: {draft_name}
Code: {room_code}
{link}`;

const DEFAULT_RESULTS_TEMPLATE = `🏆 Draft results: {draft_name}

{teams}

📍 {location}
📝 {notes}

View results: {link}`;

export function ClubSettings({ isOpen, onClose }: ClubSettingsProps) {
  const { t } = useTranslation("dashboard");
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
        title: t("settings.loadError"),
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

      toast({ title: t("settings.saved") });
      onClose();
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: t("settings.saveError"),
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
            className="fixed top-0 right-0 h-full w-full max-w-md bg-card z-50 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{t("settings.title")}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Club Name */}
                  <div className="space-y-2">
                    <Label className="text-foreground">{t("settings.clubName")}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("settings.clubNamePlaceholder")}
                      className="h-12"
                    />
                  </div>

                  {/* Default Location */}
                  <div className="space-y-2">
                    <Label className="text-foreground">{t("settings.defaultLocation")}</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t("settings.defaultLocationPlaceholder")}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("settings.defaultLocationHint")}
                    </p>
                  </div>

                  {/* Default Notes */}
                  <div className="space-y-2">
                    <Label className="text-foreground">{t("settings.defaultNotes")}</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("settings.defaultNotesPlaceholder")}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* WhatsApp Templates Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-foreground font-medium">{t("settings.whatsappTemplates")}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetTemplates}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent/10"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {t("settings.reset")}
                      </Button>
                    </div>

                    {/* Invite Template */}
                    <div className="space-y-2 mb-4">
                      <Label className="text-foreground">{t("settings.inviteTemplate")}</Label>
                      <Textarea
                        value={inviteTemplate}
                        onChange={(e) => setInviteTemplate(e.target.value)}
                        rows={4}
                        className="resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.inviteTemplateVars")}
                      </p>
                    </div>

                    {/* Results Template */}
                    <div className="space-y-2">
                      <Label className="text-foreground">{t("settings.resultsTemplate")}</Label>
                      <Textarea
                        value={resultsTemplate}
                        onChange={(e) => setResultsTemplate(e.target.value)}
                        rows={6}
                        className="resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.resultsTemplateVars")}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    {t("settings.saveSettings")}
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
