"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  Shield, User, Settings, Brain, Database, Lock, Share2,
  Globe, Scale, Cookie, Baby, Clock, FileText, ExternalLink,
  ChevronDown, ArrowUpRight, GitBranch
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Section = {
  id: string;
  icon: LucideIcon;
  color: string;
  title: string;
  content?: string;
  items?: Array<string | { name: string; desc: string }>;
  note?: string;
};

const sections: Section[] = [
  {
    id: "account",
    icon: User,
    color: "text-blue-400 bg-blue-500/10",
    title: "Account Information",
    content: "When you sign in with Google, we collect basic profile information including your name, email address, and profile picture. This is used to create and manage your account.",
  },
  {
    id: "preferences",
    icon: Settings,
    color: "text-violet-400 bg-violet-500/10",
    title: "User Preferences",
    content: "We store your preferences locally in your browser, including selected subjects and year level, hobbies and interests for personalized analogies, theme preferences (light/dark mode, color scheme), and UI customization settings.",
  },
  {
    id: "study",
    icon: Brain,
    color: "text-emerald-400 bg-emerald-500/10",
    title: "Study Data",
    content: "To provide personalized learning features, we store chat conversations with our AI tutor (stored securely in Supabase), flashcard sets and study progress, quiz results and performance statistics, calendar events and reminders, and document notes and study guides.",
  },
  {
    id: "ai",
    icon: Database,
    color: "text-cyan-400 bg-cyan-500/10",
    title: "AI Interactions",
    content: "Messages you send to our AI tutor are processed to provide responses tailored to your learning needs. These messages are stored so you can continue conversations and access past discussions.",
  },
  {
    id: "usage",
    icon: FileText,
    color: "text-amber-400 bg-amber-500/10",
    title: "How We Use Your Information",
    content: "We use your information to provide, maintain, and improve our services; personalize your learning experience with tailored analogies; track your study progress and provide spaced repetition scheduling; generate flashcards, quizzes, and study guides; sync your calendar with school timetables; and communicate about your account and service updates.",
  },
  {
    id: "security",
    icon: Lock,
    color: "text-rose-400 bg-rose-500/10",
    title: "Data Storage and Security",
    content: "Your data is stored securely using Supabase with appropriate technical and organizational measures to protect against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit using HTTPS/TLS and encrypted at rest where supported.",
  },
  {
    id: "sharing",
    icon: Share2,
    color: "text-orange-400 bg-orange-500/10",
    title: "Data Sharing",
    content: "We do not sell, trade, or otherwise transfer your personal information to third parties except: service providers who assist us in operating our application (e.g., AI processing via Groq); legal requirements when required by law or valid public authority requests; or with your explicit consent.",
  },
  {
    id: "thirdparty",
    icon: Globe,
    color: "text-indigo-400 bg-indigo-500/10",
    title: "Third-Party Services",
    items: [
      { name: "Supabase", desc: "Database and authentication" },
      { name: "Groq", desc: "AI language model processing" },
      { name: "Vercel", desc: "Hosting and analytics" },
    ],
    note: "Each service has its own privacy policy governing their handling of your data.",
  },
  {
    id: "rights",
    icon: Scale,
    color: "text-teal-400 bg-teal-500/10",
    title: "Your Rights",
    items: [
      "Access the personal information we hold about you",
      "Correct inaccurate or incomplete information",
      "Request deletion of your personal information",
      "Data portability",
      "Opt out of certain data processing activities",
    ],
    note: 'To exercise these rights, contact us through our <a href="/support" class="text-primary hover:underline">Support page</a>.',
  },
  {
    id: "cookies",
    icon: Cookie,
    color: "text-yellow-400 bg-yellow-500/10",
    title: "Cookies and Local Storage",
    content: "We use local storage in your browser to store preferences and session data including authentication tokens (stored securely by Supabase), UI preferences and settings, and study progress data for offline functionality. Unlike cookies, local storage data is not automatically sent with HTTP requests and is limited to the domain that created it.",
  },
  {
    id: "children",
    icon: Baby,
    color: "text-pink-400 bg-pink-500/10",
    title: "Children's Privacy",
    content: "Analogix is designed for students, including children under 13. We are committed to complying with applicable privacy laws for children, including the Australian Privacy Act and relevant state regulations. We collect only the minimum information necessary to provide our services to student users.",
  },
  {
    id: "retention",
    icon: Clock,
    color: "text-gray-400 bg-gray-500/10",
    title: "Data Retention",
    content: "We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time through our Support page.",
  },
];

export default function PrivacyPage() {
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Analogix
          </a>
          <a
            href="https://github.com/Error403Allowed/Analogix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitBranch className="w-5 h-5" />
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 pb-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            Last updated: May 2026. We're committed to protecting your privacy and being transparent about how we handle your data.
          </p>
        </motion.div>

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="p-8 rounded-2xl border border-border bg-card mb-12"
        >
          <p className="text-base text-muted-foreground leading-relaxed">
            Analogix is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application and services. We believe you deserve to know exactly what data we collect and why — no hidden surprises.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section, i) => {
            const Icon = section.icon;

            return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.04, duration: 0.35 }}
              className="overflow-hidden bg-card rounded-2xl border border-border"
            >
              <button
                onClick={() => setOpenSection(openSection === i ? null : i)}
                className="w-full flex items-center gap-4 px-5 py-[1.125rem] text-left hover:border-primary/30 border border-transparent rounded-2xl transition-all"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${section.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-semibold leading-tight">{section.title}</span>
                <motion.div
                  animate={{ rotate: openSection === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openSection === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    {section.content && (
                      <p className="text-base text-muted-foreground leading-relaxed px-5 pt-5 pb-5 pl-16">
                        {section.content}
                      </p>
                    )}
                    {section.items && (
                      <div className="px-5 pt-5 pb-5 pl-16">
                        <ul className="space-y-2 mb-3">
                          {section.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-2.5 text-base text-muted-foreground">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              {typeof item === "string" ? (
                                <span>{item}</span>
                              ) : (
                                <span><strong className="text-foreground">{item.name}:</strong> {item.desc}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {section.note && (
                          <p
                            className="text-base text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.note) }}
                          />
                        )}
                      </div>
                    )}
                    {"items" in section && section.note && !section.items && (
                      <p
                        className="text-base text-muted-foreground px-5 pb-5 pl-16"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.note) }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            );
          })}
        </div>

        {/* Changes to Policy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-10 p-8 rounded-2xl border border-border bg-card"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Changes to This Policy</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date at the top. We encourage you to review this Privacy Policy periodically for any changes.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.75 }}
          className="mt-6 p-8 rounded-2xl border border-border bg-card text-center"
        >
          <h3 className="font-bold text-lg mb-2">Questions or Concerns?</h3>
          <p className="text-base text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
            If you have questions about this Privacy Policy or our data practices, reach out through our Support page or open an issue on GitHub.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/support"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Shield className="w-4 h-4 mr-2" />
              Contact Support
            </a>
            <a
              href="https://github.com/Error403Allowed/Analogix"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl border border-border bg-card text-sm font-bold hover:bg-accent transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              GitHub Repository
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-muted-foreground">
          <p>© 2026 Analogix · <a href="/support" className="hover:text-foreground hover:underline">Support</a></p>
        </div>
      </footer>
    </div>
  );
}
