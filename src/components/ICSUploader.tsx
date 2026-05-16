import { useState, useRef } from "react";
import { FileUp, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseICS } from "@/utils/icsParser";
import { eventStore } from "@/utils/eventStore";
import { cn } from "@/lib/utils";

interface ICSUploaderProps {
  allTypes: Record<string, { color: string; label: string; icon: string }>;
}

const ICSUploader = ({ allTypes }: ICSUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("event");
  const [showTagMenu, setShowTagMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const pickFile = (file: File) => {
    if (!file.name.endsWith(".ics")) { toast.error("Please upload a .ics file"); return; }
    // Default to "event" if it exists, else first available tag
    const defaultTag = allTypes["event"] ? "event" : Object.keys(allTypes)[0] ?? "event";
    setSelectedTag(defaultTag);
    setPendingFile(file);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pickFile(f); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; };

  const handleImport = async () => {
    if (!pendingFile) return;
    setIsProcessing(true);
    try {
      const events = await parseICS(pendingFile);
      if (events.length === 0) { toast.error("No events found in that calendar file"); return; }
      // Override the type on every imported event with the chosen tag
      const tagged = events.map(ev => ({ ...ev, type: selectedTag }));
      eventStore.addMultiple(tagged);
      toast.success(`Imported ${tagged.length} events as "${allTypes[selectedTag]?.label ?? selectedTag}"!`);
      setPendingFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse calendar file");
    } finally {
      setIsProcessing(false);
    }
  };

  const tagMeta = allTypes[selectedTag] ?? { color: "#3b82f6", label: selectedTag, icon: "📌" };

  // ── Tag picker step ──
  if (pendingFile) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">File ready</p>
          <p className="text-xs font-semibold text-foreground truncate">{pendingFile.name}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">Assign tag</p>
          <div className="relative">
            <button
              onClick={() => setShowTagMenu(s => !s)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all"
              style={{ backgroundColor: tagMeta.color + "18", borderColor: tagMeta.color + "50", color: tagMeta.color }}
            >
              <span>{tagMeta.icon}</span>
              <span className="flex-1 text-left">{tagMeta.label}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {showTagMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                {Object.entries(allTypes).map(([key, m]) => (
                  <button key={key}
                    onClick={() => { setSelectedTag(key); setShowTagMenu(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors text-left",
                      selectedTag === key && "bg-muted/60"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                    {selectedTag === key && <Check className="w-3 h-3 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPendingFile(null)}
            className="flex-1 text-xs font-semibold py-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing}
            className="flex-1 text-xs font-bold py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {isProcessing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    );
  }

  // ── Drop zone ──
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-6 text-center transition-all",
        isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".ics" className="hidden" />
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <FileUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Import .ics</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Drop here or click to browse</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          Select File
        </Button>
      </div>
    </div>
  );
};

export default ICSUploader;
