"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Clock, User, ArrowLeft, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SUBJECT_CATALOG } from "@/constants/subjects";

interface SharedDocument {
  document_id: string;
  subject_id: string;
  owner_user_id: string;
  owner_name: string | null;
  permission: "view" | "edit";
  shared_at: string;
  document_title: string | null;
  document_data: any;
}

export default function SharedWithMePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSharedDocuments();
  }, []);

  const loadSharedDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/shares/incoming");
      const data = await response.json();

      if (response.ok) {
        setDocuments(data.documents || []);
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error("[SharedWithMe] load failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectInfo = (subjectId: string) => {
    const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);
    return {
      label: subject?.label || subjectId,
      icon: subject?.icon || "📚",
    };
  };

  const handleOpenDocument = (doc: SharedDocument) => {
    // For shared documents, we open them via a special route
    router.push(`/shared-doc/${doc.document_id}/${doc.subject_id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black">Shared with Me</h1>
              <p className="text-sm text-muted-foreground">
                Documents others have shared with you
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50 mb-4" />
            <p className="text-muted-foreground">Loading shared documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">No shared documents yet</h2>
            <p className="text-muted-foreground text-center max-w-md">
              When someone shares a document with you, it will appear here.
              You can view or edit it based on the permissions they granted.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc, index) => {
              const subjectInfo = getSubjectInfo(doc.subject_id);
              return (
                <motion.div
                  key={`${doc.document_id}-${doc.subject_id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="hover:shadow-lg transition-all cursor-pointer group border-border/50"
                    onClick={() => handleOpenDocument(doc)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {/* Document Icon */}
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>

                          {/* Document Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                              {doc.document_title || "Untitled Document"}
                            </h3>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                <span>{doc.owner_name || "Anonymous"}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <FileText className="h-4 w-4" />
                                <span>{subjectInfo.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {new Date(doc.shared_at).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Permission Badge */}
                        <div className="shrink-0">
                          <Badge
                            variant={doc.permission === "edit" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {doc.permission === "edit" ? "✏️ Can Edit" : "👁️ Can View"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
