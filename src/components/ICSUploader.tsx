import { useState, useRef } from "react";
import { Upload, FileUp, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseICS } from "@/utils/icsParser";
import { eventStore } from "@/utils/eventStore";

const ICSUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".ics")) {
      toast.error("Please upload a .ics file");
      return;
    }

    setIsProcessing(true);
    try {
      const events = await parseICS(file);
      eventStore.addMultiple(events);
      toast.success(`Imported ${events.length} events!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to parse calendar file");
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".ics"
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isProcessing ? 'bg-primary/20 animate-pulse' : 'bg-muted'}`}>
          {isProcessing ? (
            <Check className="w-6 h-6 text-primary" />
          ) : (
            <FileUp className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <h4 className="font-bold text-foreground">Import Schedule</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Drop your .ics file here or click to browse
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          Select File
        </Button>
      </div>
    </div>
  );
};

export default ICSUploader;
