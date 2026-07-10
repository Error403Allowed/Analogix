"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { getFormulaSheet } from "@/data/formulaSheets";

interface FormulaPanelProps {
  formulaPanelOpen: boolean;
  selectedSubject: string | null;
  formulaSearch: string;
  setFormulaSearch: (value: string) => void;
  expandedTopics: Set<string>;
  setExpandedTopics: (topics: Set<string>) => void;
  setFormulaPanelOpen: (open: boolean) => void;
}

const FormulaPanel = ({
  formulaPanelOpen,
  selectedSubject,
  formulaSearch,
  setFormulaSearch,
  expandedTopics,
  setExpandedTopics,
  setFormulaPanelOpen,
}: FormulaPanelProps) => {
  return (
    <>
      {/* Formula sheet side panel */}
      <AnimatePresence>
        {formulaPanelOpen && selectedSubject && (() => {
          const sheet = getFormulaSheet(selectedSubject);
          if (!sheet) return null;
          const topics = [...new Set(sheet.formulas.map(f => f.topic))];
          return (
            <motion.div
              key="formula-panel"
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "280px" }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="hidden sm:flex flex-col border border-border rounded-xl bg-card overflow-hidden shrink-0 max-h-[calc(100vh-180px)]"
              style={{ width: 280 }}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <span className="text-xs font-bold text-foreground">{sheet.label} Formulas</span>
                <button type="button" onClick={() => setFormulaPanelOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-2 py-1.5 border-b border-border/60">
                <input
                  type="text"
                  placeholder="Search formulas..."
                  value={formulaSearch}
                  onChange={(e) => setFormulaSearch(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/40 placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 formula-scroll">
                {(() => {
                  const query = formulaSearch.trim().toLowerCase();
                  if (query) {
                    const results = sheet.formulas.filter(f =>
                      f.name.toLowerCase().includes(query) ||
                      f.description.toLowerCase().includes(query) ||
                      f.topic.toLowerCase().includes(query)
                    );
                    if (results.length === 0) {
                      return <p className="text-xs text-muted-foreground/60 text-center py-4">No formulas found</p>;
                    }
                    return results.map((formula, fi) => (
                      <div key={`${formula.topic}-${formula.name}-${fi}`}
                        className="px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-default">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">{formula.topic}</p>
                        <p className="text-[11px] font-semibold text-foreground mb-1">{formula.name}</p>
                        <MarkdownRenderer content={`$${formula.latex}$`} className="text-[11px] text-primary" />
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{formula.description}</p>
                      </div>
                    ));
                  }
                  return topics.map(topic => {
                    const isExpanded = expandedTopics.has(topic);
                    const topicFormulas = sheet.formulas.filter(f => f.topic === topic);
                    return (
                      <div key={topic} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedTopics);
                            if (newExpanded.has(topic)) { newExpanded.delete(topic); } else { newExpanded.add(topic); }
                            setExpandedTopics(newExpanded);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 group-hover:text-foreground/80 flex-1 text-left">
                            {topic} <span className="font-normal opacity-50">({topicFormulas.length})</span>
                          </span>
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 ml-1">
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden space-y-1.5 pl-1"
                            >
                              {topicFormulas.map((formula, i) => (
                                <div key={`${topic}-${i}`}
                                  className="px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-default">
                                  <p className="text-[11px] font-semibold text-foreground mb-1">{formula.name}</p>
                                  <MarkdownRenderer content={`$${formula.latex}$`} className="text-[11px] text-primary" />
                                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{formula.description}</p>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
};

export default FormulaPanel;
