import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { achievementStore } from "@/utils/achievementStore";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
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

          <div className="pt-4 border-t border-border">
             <h4 className="text-sm font-bold text-destructive mb-2">Danger Zone</h4>
             <Button variant="destructive" size="sm" onClick={handleReset} className="w-full">
               Reset All Data
             </Button>
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
