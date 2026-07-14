"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Calendar, GitBranch, ExternalLink, ChevronDown, ChevronUp,
  Sparkles, BookOpen, Shield, Clock, Users, Zap, Bug, FileText, ArrowUpRight
} from "lucide-react";

const faqs = [
  {
    question: "How do I get started?",
    answer: "Sign in with Google, select your subjects and year level during onboarding, and you're ready to start chatting with your AI tutor. You can attach files, generate flashcards, take quizzes, and more.",
    icon: Sparkles,
    color: "text-amber-400 bg-amber-500/10",
  },
  {
    question: "Is Analogix really free?",
    answer: "Yes! Analogix is 100% free to use. We believe every Australian student deserves access to quality learning tools. No subscriptions, no paywalls, no hidden costs.",
    icon: Zap,
    color: "text-emerald-400 bg-emerald-500/10",
  },
  {
    question: "How does the AI tutor work?",
    answer: "The AI tutor uses your interests and hobbies to create personalized analogies that make concepts easier to understand. It learns your preferences over time and tailors explanations to how you learn best.",
    icon: Users,
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    question: "What subjects are supported?",
    answer: "Analogix covers all major Australian curriculum subjects from Year 7 to Year 12, including Mathematics, Science, English, History, Geography, and more. Each subject has dedicated formula sheets, resources, and tailored AI explanations.",
    icon: BookOpen,
    color: "text-violet-400 bg-violet-500/10",
  },
  {
    question: "How does spaced repetition work?",
    answer: "Our flashcards use the SM-2 algorithm to schedule reviews at optimal intervals. Cards you find difficult appear more often, while cards you've mastered are shown less frequently. This maximizes retention while minimizing study time.",
    icon: Clock,
    color: "text-cyan-400 bg-cyan-500/10",
  },
  {
    question: "Can I import my school timetable?",
    answer: "Yes! You can import your school timetable via .ics file from platforms like Sentral. This automatically syncs your classes, breaks, and term dates.",
    icon: Calendar,
    color: "text-rose-400 bg-rose-500/10",
  },
  {
    question: "How do I report a bug or suggest a feature?",
    answer: "The best way is to open an issue on our GitHub repository. Navigate to the Issues tab and create a new issue with a clear description of the bug or feature request. We actively review and respond to community feedback.",
    icon: Bug,
    color: "text-orange-400 bg-orange-500/10",
  },
  {
    question: "Is my data safe?",
    answer: "Your data is stored securely using Supabase. We only access your data to provide and improve our services. We never sell your information. For full details, see our Privacy Policy.",
    icon: Shield,
    color: "text-indigo-400 bg-indigo-500/10",
  },
];

const quickLinks = [
  {
    href: "https://github.com/Error403Allowed/Analogix/issues/new/choose",
    icon: Bug,
    title: "Report a Bug",
    description: "Open a new issue on GitHub",
    color: "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/30",
  },
  {
    href: "https://github.com/Error403Allowed/Analogix/issues/new",
    icon: FileText,
    title: "Request a Feature",
    description: "Suggest new features or improvements",
    color: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/30",
  },
  {
    href: "https://github.com/Error403Allowed/Analogix",
    icon: ExternalLink,
    title: "Repository",
    description: "Explore our source code and docs",
    color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
          className="text-center mb-16"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Support</h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            Have a question, found a bug, or want to suggest a feature? Everything you need is just a click away.
          </p>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16"
        >
          {quickLinks.map((link, i) => {
            const Icon = link.icon;

            return (
            <motion.a
              key={link.title}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
              className={`group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all ${link.color}`}
            >
              <div className="w-9 h-9 rounded-xl bg-background/50 border border-border/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-semibold mb-1 text-foreground">{link.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{link.description}</p>
            </motion.a>
            );
          })}
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const Icon = faq.icon;

              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05, duration: 0.35 }}
                className="overflow-hidden bg-card rounded-2xl border border-border"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center gap-4 px-5 py-[1.125rem] text-left hover:border-primary/30 border border-transparent rounded-2xl transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${faq.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-semibold leading-tight">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-base text-muted-foreground leading-relaxed px-5 pt-5 pb-5 pl-16">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Still need help CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-12 p-8 rounded-2xl border border-border bg-card text-center"
        >
          <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg mb-2">Still need help?</h3>
          <p className="text-base text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
            The fastest way to get support is by opening a GitHub issue. Be specific and we'll get back to you fast.
          </p>
          <a
            href="https://github.com/Error403Allowed/Analogix/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Open a GitHub Issue
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-muted-foreground">
          <p>© 2026 Analogix · <a href="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</a></p>
        </div>
      </footer>
    </div>
  );
}
