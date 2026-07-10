"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BUILTIN_TYPES, PRESET_COLORS } from "../constants";
import { saveCustomTypes, saveDeletedBuiltins, saveBuiltinOverrides } from "../storage";
import type { CustomEventType, BuiltinOverrides, TypeMeta } from "../types";
import { EmojiPicker } from "./EmojiPicker";
import { TagEditorPanel } from "./TagEditorPanel";

export function ManageTagsModal({ customTypes, deletedBuiltins, builtinOverrides, onClose, onChange, onDeletedBuiltinsChange, onBuiltinOverridesChange, onAddCustomType }: {
  customTypes: CustomEventType[];
  deletedBuiltins: string[];
  builtinOverrides: BuiltinOverrides;
  onClose: () => void;
  onChange: (types: CustomEventType[]) => void;
  onDeletedBuiltinsChange: (keys: string[]) => void;
  onBuiltinOverridesChange: (overrides: BuiltinOverrides) => void;
  onAddCustomType: (label: string, icon: string, color: string) => CustomEventType | null;
}) {
  const [label, setLabel] = useState("");
  const [newIcon, setNewIcon] = useState("🏷️");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const builtinDisplay = useCallback((key: string, meta: TypeMeta) => (
    builtinOverrides[key] ? { ...meta, ...builtinOverrides[key] } : meta
  ), [builtinOverrides]);

  const saveBuiltinOverride = (key: string, labelOverride: string | undefined, color: string, icon: string) => {
    const baseType = BUILTIN_TYPES[key];
    if (!baseType) return;

    const nextLabel = labelOverride?.trim() || baseType.label;
    const builtinLabelTaken = Object.entries(BUILTIN_TYPES).some(([otherKey, meta]) => (
      otherKey !== key &&
      builtinDisplay(otherKey, meta).label.trim().toLowerCase() === nextLabel.toLowerCase()
    ));
    const customLabelTaken = customTypes.some(
      (tag) => tag.label.trim().toLowerCase() === nextLabel.toLowerCase(),
    );

    if (builtinLabelTaken || customLabelTaken) {
      toast.error("That tag name already exists");
      return;
    }

    const updated = {
      ...builtinOverrides,
      [key]: {
        color,
        icon,
        label: nextLabel,
      },
    };

    onBuiltinOverridesChange(updated);
    saveBuiltinOverrides(updated);
    setEditingKey(null);
    toast.success(`Updated "${nextLabel}"`);
  };

  const handleAdd = () => {
    const created = onAddCustomType(label, newIcon, newColor);
    if (!created) return;
    setLabel("");
    setNewIcon("🏷️");
    setNewColor(PRESET_COLORS[0]);
  };

  const handleEditCustom = (key: string, nextLabel: string | undefined, color: string, icon: string) => {
    const trimmedLabel = nextLabel?.trim();
    if (!trimmedLabel) {
      toast.error("Enter a tag name");
      return;
    }

    const labelTaken = customTypes.some(
      (tag) => tag.key !== key && tag.label.trim().toLowerCase() === trimmedLabel.toLowerCase(),
    );
    const builtinLabelTaken = Object.entries(BUILTIN_TYPES).some((entry) =>
      builtinDisplay(entry[0], entry[1]).label.trim().toLowerCase() === trimmedLabel.toLowerCase(),
    );
    if (labelTaken || builtinLabelTaken) {
      toast.error("That tag name already exists");
      return;
    }

    const updated = customTypes.map(t => t.key === key ? { ...t, label: trimmedLabel, color, icon } : t);
    onChange(updated);
    saveCustomTypes(updated);
    setEditingKey(null);
    toast.success(`Updated "${trimmedLabel}"`);
  };

  const handleRemoveCustom = (key: string) => {
    const updated = customTypes.filter(t => t.key !== key);
    onChange(updated);
    saveCustomTypes(updated);
  };

  const handleDeleteBuiltin = (key: string) => {
    const updated = [...deletedBuiltins, key];
    onDeletedBuiltinsChange(updated);
    saveDeletedBuiltins(updated);
  };

  const handleRestoreBuiltin = (key: string) => {
    const updated = deletedBuiltins.filter(k => k !== key);
    onDeletedBuiltinsChange(updated);
    saveDeletedBuiltins(updated);
  };

  const activeBuiltins = Object.entries(BUILTIN_TYPES).filter(([k]) => !deletedBuiltins.includes(k));
  const removedBuiltins = Object.entries(BUILTIN_TYPES).filter(([k]) => deletedBuiltins.includes(k));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl z-10 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Manage Tags</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>

          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Built-in</p>
          <div className="space-y-0.5 mb-4">
            {activeBuiltins.map(([key, rawM]) => {
              const m = builtinDisplay(key, rawM);
              const isEditing = editingKey === key;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-xs font-semibold text-foreground flex-1">{m.icon} {m.label}</span>
                    <button
                      type="button"
                      aria-label={`Edit ${m.label} tag`}
                      onClick={() => setEditingKey(isEditing ? null : key)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${m.label} tag`}
                      onClick={() => handleDeleteBuiltin(key)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-destructive/20 text-[10px] font-semibold text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                  {isEditing && (
                    <TagEditorPanel
                      currentLabel={m.label}
                      currentColor={m.color} currentIcon={m.icon}
                      onSave={(nextLabel, color, icon) => saveBuiltinOverride(key, nextLabel, color, icon)}
                      onCancel={() => setEditingKey(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {customTypes.length > 0 && (
            <>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Custom</p>
              <div className="space-y-0.5 mb-4">
                {customTypes.map(t => {
                  const isEditing = editingKey === t.key;
                  return (
                    <div key={t.key}>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-xs font-semibold text-foreground flex-1">{t.icon} {t.label}</span>
                        <button
                          type="button"
                          aria-label={`Edit ${t.label} tag`}
                          onClick={() => setEditingKey(isEditing ? null : t.key)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${t.label} tag`}
                          onClick={() => handleRemoveCustom(t.key)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-destructive/20 text-[10px] font-semibold text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                      {isEditing && (
                        <TagEditorPanel
                          currentLabel={t.label}
                          currentColor={t.color} currentIcon={t.icon}
                          onSave={(nextLabel, color, icon) => handleEditCustom(t.key, nextLabel, color, icon)}
                          onCancel={() => setEditingKey(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {removedBuiltins.length > 0 && (
            <>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Removed Built-in Tags</p>
              <div className="space-y-0.5 mb-4">
                {removedBuiltins.map(([key, rawM]) => {
                  const m = builtinDisplay(key, rawM);
                  return (
                    <div key={key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/20">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      <span className="text-xs font-semibold text-muted-foreground flex-1">{m.icon} {m.label}</span>
                      <button
                        type="button"
                        aria-label={`Restore ${m.label} tag`}
                        onClick={() => handleRestoreBuiltin(key)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Add New Tag</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <EmojiPicker value={newIcon} onChange={setNewIcon} />
              <input aria-label="New tag name" value={label} onChange={e => setLabel(e.target.value)} placeholder="Tag name"
                onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") handleAdd(); }}
                className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={e => { e.stopPropagation(); setNewColor(c); }}
                  className={cn("w-5 h-5 rounded-full transition-all", newColor === c && "ring-2 ring-offset-1 ring-primary")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); handleAdd(); }} disabled={!label.trim()}
              className="w-full text-xs font-bold py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all">
              Add Tag
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
