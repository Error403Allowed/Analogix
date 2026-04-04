"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Share2,
  Link as LinkIcon,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Clock,
  Shield,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentShare {
  id: string;
  document_id: string;
  subject_id: string;
  permission: "view" | "edit";
  expires_at: string | null;
  created_at: string;
  shared_with: {
    id: string;
    name: string | null;
  } | null;
  is_link: boolean;
}

interface UserSearchResult {
  id: string;
  name: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  subjectId: string;
  documentTitle: string;
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
}: ShareDialogProps) {
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [shareTab, setShareTab] = useState<"link" | "people">("link");
  const [selectedPermission, setSelectedPermission] = useState<"view" | "edit">(
    "view"
  );
  const [selectedExpiry, setSelectedExpiry] = useState<string>("1week");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null
  );

  // Load existing shares when dialog opens
  useEffect(() => {
    if (open) {
      loadShares();
      setShareLink(null);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && shareTab === "people") {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, shareTab]);

  const loadShares = async () => {
    setIsLoading(true);
    setNeedsMigration(false);
    try {
      const response = await fetch(
        `/api/shares/list?documentId=${documentId}&subjectId=${subjectId}&type=outgoing`
      );
      const data = await response.json();

      if (response.ok) {
        setShares(data.shares || []);
      } else if (data.needsMigration) {
        setNeedsMigration(true);
      } else {
        toast.error(data.error || "Failed to load shares");
      }
    } catch (error) {
      console.error("[ShareDialog] loadShares failed:", error);
      toast.error("Failed to load shares");
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/shares/user-search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("[ShareDialog] searchUsers failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    try {
      const expiryHours = EXPIRY_OPTIONS.find((o) => o.value === selectedExpiry)?.hours || 0;
      const expiresAt = expiryHours > 0
        ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
        : undefined;

      const response = await fetch("/api/shares/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          subjectId,
          permission: selectedPermission,
          createLink: true,
          expiresAt,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShareLink(data.url);
        toast.success("Share link created");
        loadShares();
      } else {
        toast.error(data.error || "Failed to create share link");
      }
    } catch (error) {
      console.error("[ShareDialog] handleCreateLink failed:", error);
      toast.error("Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWithUser = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    setIsLoading(true);
    try {
      const expiryHours = EXPIRY_OPTIONS.find((o) => o.value === selectedExpiry)?.hours || 0;
      const expiresAt = expiryHours > 0
        ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
        : undefined;

      const response = await fetch("/api/shares/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          subjectId,
          permission: selectedPermission,
          userId: selectedUser.id,
          expiresAt,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Shared with ${selectedUser.name || "user"}`);
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        loadShares();
      } else {
        toast.error(data.error || "Failed to share");
      }
    } catch (error) {
      console.error("[ShareDialog] handleShareWithUser failed:", error);
      toast.error("Failed to share");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const response = await fetch("/api/shares/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Share revoked");
        loadShares();
      } else {
        toast.error(data.error || "Failed to revoke share");
      }
    } catch (error) {
      console.error("[ShareDialog] handleRevokeShare failed:", error);
      toast.error("Failed to revoke share");
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "Never expires";
    const date = new Date(expiresAt);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Share Document</DialogTitle>
              <DialogDescription className="text-left">
                {documentTitle || "Untitled Document"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {needsMigration ? (
          <div className="py-8 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">Database Setup Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The sharing feature requires a database migration to be run in your Supabase project.
              </p>
              <div className="bg-muted rounded-lg p-4 text-left text-xs space-y-2">
                <p className="font-semibold">Steps to enable sharing:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to your <strong>Supabase Dashboard</strong></li>
                  <li>Navigate to <strong>SQL Editor</strong></li>
                  <li>Run the migration file: <code className="bg-background px-1 rounded">supabase/migrations/add_document_sharing.sql</code></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Tab Selection */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={shareTab === "link" ? "default" : "outline"}
            onClick={() => setShareTab("link")}
            className="flex-1"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button
            variant={shareTab === "people" ? "default" : "outline"}
            onClick={() => setShareTab("people")}
            className="flex-1"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Share with People
          </Button>
        </div>

        {shareTab === "link" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label>Permission</Label>
              </div>
              <Select
                value={selectedPermission}
                onValueChange={(v) => setSelectedPermission(v as "view" | "edit")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">👁️ Can view</SelectItem>
                  <SelectItem value="edit">✏️ Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Expiry</Label>
              </div>
              <Select
                value={selectedExpiry}
                onValueChange={setSelectedExpiry}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreateLink}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating link...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>

            {shareLink && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Share Link (click to copy)
                </Label>
                <div
                  className="flex items-center justify-between gap-2 p-2 rounded bg-background cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={handleCopyLink}
                >
                  <code className="text-xs text-muted-foreground truncate flex-1">
                    {shareLink}
                  </code>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            )}

            {/* Existing Link Shares */}
            {shares.filter((s) => s.is_link).length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-semibold">Active Link Shares</Label>
                {shares
                  .filter((s) => s.is_link)
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={share.permission === "edit" ? "default" : "secondary"}>
                            {share.permission === "edit" ? "Edit" : "View"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatExpiry(share.expires_at)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(share.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeShare(share.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>Find People</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedUser?.id === user.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      )}
                      onClick={() =>
                        setSelectedUser(
                          selectedUser?.id === user.id ? null : user
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="font-medium">{user.name || "Anonymous"}</span>
                      </div>
                      {selectedUser?.id === user.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permission & Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Permission</Label>
                <Select
                  value={selectedPermission}
                  onValueChange={(v) => setSelectedPermission(v as "view" | "edit")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Can view</SelectItem>
                    <SelectItem value="edit">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expiry</Label>
                <Select
                  value={selectedExpiry}
                  onValueChange={setSelectedExpiry}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleShareWithUser}
              disabled={isLoading || !selectedUser}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Share with {selectedUser?.name || "User"}
                </>
              )}
            </Button>

            {/* Existing User Shares */}
            {shares.filter((s) => !s.is_link).length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-semibold">Shared With</Label>
                {shares
                  .filter((s) => !s.is_link)
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                          {share.shared_with?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">
                            {share.shared_with?.name || "Anonymous"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={share.permission === "edit" ? "default" : "secondary"}>
                              {share.permission === "edit" ? "Edit" : "View"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatExpiry(share.expires_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeShare(share.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
