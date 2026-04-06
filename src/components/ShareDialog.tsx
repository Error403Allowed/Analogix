"use client";

import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Share2,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentShare {
  id: string;
  document_id: string;
  subject_id: string;
  permission: "view" | "edit";
  expires_at: string | null;
  created_at: string;
  shared_with: { id: string; name: string | null } | null;
  is_link: boolean;
}

interface ShareDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  documentId: string;
  subjectId: string;
  documentTitle: string;
  trigger?: React.ReactNode;
}

const EXPIRY_OPTIONS = [
  { value: "1day", label: "1 day", hours: 24 },
  { value: "1week", label: "1 week", hours: 168 },
  { value: "1month", label: "1 month", hours: 720 },
  { value: "never", label: "Never expires", hours: 0 },
];

export function ShareDialog({
  open,
  onOpenChange,
  documentId,
  subjectId,
  documentTitle,
  trigger,
}: ShareDialogProps) {
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [expiry, setExpiry] = useState<string>("1week");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    if (open) {
      loadShares();
      setShareLink(null);
    }
  }, [open]);

  const loadShares = async () => {
    try {
      const res = await fetch(
        `/api/shares/list?documentId=${documentId}&subjectId=${subjectId}&type=outgoing`
      );
      const data = await res.json();
      if (res.ok) setShares(data.shares || []);
      else if (data.needsMigration) setNeedsMigration(true);
    } catch {}
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    try {
      const expiryHours = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.hours || 0;
      const expiresAt = expiryHours > 0
        ? new Date(Date.now() + expiryHours * 3_600_000).toISOString()
        : undefined;

      const res = await fetch("/api/shares/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, subjectId, permission, createLink: true, expiresAt }),
      });
      const data = await res.json();
      if (res.ok) { setShareLink(data.url); loadShares(); }
      else toast.error(data.error || "Failed to create link");
    } catch { toast.error("Failed to create link"); }
    finally { setIsLoading(false); }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await fetch("/api/shares/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });
      toast.success("Link revoked");
      loadShares();
    } catch { toast.error("Failed to revoke"); }
  };

  const linkShares = shares.filter((s) => s.is_link);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className="notion-btn-minimal" title="Share document">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg border border-border rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share</p>
          <p className="text-sm font-medium truncate mt-0.5">{documentTitle || "Untitled"}</p>
        </div>

        <div className="p-3 space-y-3">
          {needsMigration ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Run the sharing migration in Supabase first.
            </p>
          ) : (
            <>
              {/* Permission + expiry row */}
              <div className="flex gap-2">
                <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "edit")}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">👁 Can view</SelectItem>
                    <SelectItem value="edit">✏️ Can edit</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Copy-link button */}
              {shareLink ? (
                <button
                  onClick={() => handleCopy(shareLink)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 hover:bg-primary/12 border border-primary/20 transition-colors text-left"
                >
                  <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{shareLink}</span>
                  {copied
                    ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  }
                </button>
              ) : (
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleCreateLink}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                  }
                  Copy link
                </Button>
              )}

              {/* Active link shares */}
              {linkShares.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Active links</p>
                  {linkShares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between gap-2 px-1 py-1 rounded-lg hover:bg-muted/50 group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground capitalize">{share.permission}</span>
                        {share.expires_at && (
                          <span className="text-[10px] text-muted-foreground/60 truncate">
                            · exp {new Date(share.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRevoke(share.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
