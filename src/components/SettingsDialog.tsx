import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { achievementStore } from "@/utils/achievementStore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const router = useRouter();
  const { signOut } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [prefs, setPrefs] = useState(() =>
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {},
  );
  const [name, setName] = useState(prefs.name || "");

  const handleSave = () => {
    localStorage.setItem("userPreferences", JSON.stringify({ ...prefs, name }));
    window.dispatchEvent(new Event("userPreferencesUpdated"));
    toast.success("Settings saved!");
    onOpenChange(false);
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will delete all progress, including achievements and exams.")) {
      localStorage.clear();
      achievementStore.reset();
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    router.replace("/onboarding");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("This permanently deletes your account and profile data. Continue?")) return;
    const confirmation = prompt('Type DELETE to confirm.');
    if (confirmation !== "DELETE") {
      toast.error("Account deletion cancelled.");
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not delete your account.");
      }

      localStorage.clear();
      achievementStore.reset();
      toast.success("Account deleted.");
      onOpenChange(false);
      router.replace("/onboarding");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete your account.";
      toast.error(message);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass p-6 border-border sm:max-w-[425px] shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account preferences and data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="glass"
            />
          </div>
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="notifications" className="flex flex-col space-y-1">
              <span>Notifications</span>
              <span className="font-normal text-xs text-muted-foreground">Receive alerts about exams</span>
            </Label>
            <Switch id="notifications" defaultChecked />
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
            <div>
              <h4 className="text-sm font-bold text-destructive mb-2">Danger Zone</h4>
              <Button variant="destructive" size="sm" onClick={handleReset} className="w-full mb-2">
                Reset All Data
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                className="w-full"
                disabled={deletingAccount}
              >
                {deletingAccount ? "Deleting Account..." : "Delete Account"}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
           <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
           <Button onClick={handleSave} className="gradient-primary">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
