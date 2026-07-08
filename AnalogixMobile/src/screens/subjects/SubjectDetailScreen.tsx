import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Alert, Linking } from "react-native";
import { Text, useTheme, ActivityIndicator, Portal, Modal, TextInput, Button, Checkbox } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SUBJECT_DETAIL, SUBJECT, DOCUMENTS, CREATE_DOCUMENT, SAVE_SUBJECT_NOTES, ADD_MARK, DUPLICATE_DOCUMENT } from "../../graphql/queries/subject";
import { ME } from "../../graphql/queries/user";
import { RESOURCES, SUBJECT_LABELS } from "../../shared/resources";
import {
  ExpressiveActionPill,
  ExpressiveCard,
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveRailCard,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";
import Icon from "../../components/Icon";
import { SUBJECT_CATALOG } from "../../shared/subjects/catalog";
import { SkeletonList } from "../../components/SkeletonLoader";
import SubjectCustomizationSheet from "../../components/SubjectCustomizationSheet";

type ResourceTab = "pastPapers" | "textbooks";

export default function SubjectDetailScreen() {
  const paperTheme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { subjectId, name } = route.params;
  const { data, loading } = useQuery(SUBJECT_DETAIL, { variables: { id: subjectId } });
  const { data: subjectData } = useQuery(SUBJECT, { variables: { id: subjectId } });
  const { data: docsData, refetch: refetchDocs } = useQuery(DOCUMENTS, { variables: { subjectId } });
  const { data: meData } = useQuery(ME);
  const [createDocument] = useMutation(CREATE_DOCUMENT);
  const [saveNotes] = useMutation(SAVE_SUBJECT_NOTES);
  const [addMark] = useMutation(ADD_MARK);
  const [duplicateDocument] = useMutation(DUPLICATE_DOCUMENT);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docRole, setDocRole] = useState("note");
  const [showAddHomework, setShowAddHomework] = useState(false);
  const [hwTitle, setHwTitle] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showAddMark, setShowAddMark] = useState(false);
  const [markTitle, setMarkTitle] = useState("");
  const [markScore, setMarkScore] = useState("");
  const [markTotal, setMarkTotal] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [activeResourceTab, setActiveResourceTab] = useState<ResourceTab>("pastPapers");

  type Chapter = {
    id: string;
    name: string;
    topics?: { id: string; name: string }[];
  }

  const chapters = data?.subject?.chapters ?? [];
  const subject = data?.subject;
  const notes = subjectData?.subject?.notes;
  const marks = subjectData?.subject?.marks ?? [];

  type Homework = {
    id: string;
    title: string;
    dueDate?: string | null;
    completed: boolean;
  };

  const homework = notes?.homework ?? [];
  const links = notes?.links ?? [];
  const documents = docsData?.documents ?? [];
  const userState = meData?.me?.state;
  const me = meData?.me;

  const subjectResources = useMemo(() => {
    if (!me?.subjects) return RESOURCES.filter((r) => r.subjectId === subjectId);
    const ids = me.subjects.map((s: any) => {
      const e = Object.entries(SUBJECT_LABELS).find(([, l]) => l === s);
      return e ? e[0] : s.toLowerCase();
    });
    return RESOURCES.filter((r) => ids.includes(r.subjectId));
  }, [me, subjectId]);
  const subjectResource = subjectResources.find((r) => r.subjectId === subjectId);
  const visiblePapers = (subjectResource?.pastPapers ?? []).filter((l: any) => {
    if (!userState || !l.states || l.states.length === 0) return true;
    return l.states.includes(userState) || l.states.includes("ALL");
  });
  const visibleTextbooks = subjectResource?.textbooks ?? [];
  const pendingCount = homework.filter((h: any) => !h.completed).length;
  const topicsCount = chapters.reduce((a: number, c: any) => a + (c.topics?.length ?? 0), 0);
  const subjectDescription = SUBJECT_CATALOG.find(
    (s) => s.id === subjectId || s.label.toLowerCase() === subjectId?.toLowerCase()
  )?.description;

  const handleCreateDocument = async () => {
    if (!docTitle.trim()) return;
    try {
      const { data: created } = await createDocument({ variables: { input: { subjectId, title: docTitle.trim(), content: "", role: docRole } } });
      const doc = created?.createDocument;
      setShowCreateDoc(false); setDocTitle(""); setDocRole("note"); refetchDocs();
      if (doc?.id) navigation.navigate("DocumentEditor", { subjectId, documentId: doc.id });
    } catch (err) { console.error(err); }
  };
  
  const handleToggleHomework = async (item: Homework) => {
    try { const updated = homework.map((h: any) => h.id === item.id ? { ...h, completed: !h.completed } : h); await saveNotes({ variables: { subjectId, notes: { homework: updated } } }); } catch (err) { console.error(err); }
  };
  const handleDeleteHomework = (item: Homework) => {
    Alert.alert("Delete homework", "Remove \"" + item.title + "\"?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { try { const updated = homework.filter((h: any) => h.id !== item.id); await saveNotes({ variables: { subjectId, notes: { homework: updated } } }); } catch (err) { console.error(err); } } },
    ]);
  };
  const handleAddHomework = async () => {
    if (!hwTitle.trim()) return;
    try { const newItem = { id: "hw_" + Date.now(), title: hwTitle.trim(), dueDate: hwDueDate.trim() || null, completed: false }; const updated = [...homework, newItem]; await saveNotes({ variables: { subjectId, notes: { homework: updated } } }); setShowAddHomework(false); setHwTitle(""); setHwDueDate(""); } catch (err) { console.error(err); }
  };
  const handleAddLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    try { const norm = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : "https://" + linkUrl.trim(); const newItem = { id: "link_" + Date.now(), title: linkTitle.trim(), url: norm }; const updated = [...links, newItem]; await saveNotes({ variables: { subjectId, notes: { links: updated } } }); setShowLinkForm(false); setLinkTitle(""); setLinkUrl(""); } catch (err) { console.error(err); }
  };
  const handleDeleteLink = (id: string) => {
    Alert.alert("Delete link", "Remove this link?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { try { const updated = links.filter((l: any) => l.id !== id); await saveNotes({ variables: { subjectId, notes: { links: updated } } }); } catch (err) { console.error(err); } } },
    ]);
  };
  const handleAddMark = async () => {
    if (!markTitle.trim() || !markScore.trim()) return;
    try { const score = parseFloat(markScore); const total = parseFloat(markTotal) || 100; await addMark({ variables: { subjectId, input: { title: markTitle.trim(), score, total, date: new Date().toISOString() } } }); setShowAddMark(false); setMarkTitle(""); setMarkScore(""); setMarkTotal(""); } catch (err) { console.error(err); }
  };

  const handleDuplicateDocument = async (doc: any) => {
    Alert.alert("Duplicate document", `Copy "${doc.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Duplicate", onPress: async () => {
        try {
          await duplicateDocument({ variables: { documentId: doc.id, subjectId } });
          refetchDocs();
        } catch (err) { console.error(err); }
      }},
    ]);
  };

  return (
    <ExpressiveScreen title={name ?? "Subject"} onBack={() => navigation.goBack()}>
      {loading ? <SkeletonList count={3} style={{ marginTop: 20, marginHorizontal: 12 }} /> : !subject ? <ExpressiveEmptyState icon="book-alert" title="Subject not found" subtitle="Go back and choose another subject." /> : (
        <>
          <ExpressiveHeroPanel style={styles.hero} accent="tertiary">
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onTertiaryContainer, opacity: 0.85, fontWeight: "800", letterSpacing: 1 }}>{chapters.length} CHAPTERS</Text>
                <Text variant="headlineSmall" style={{ color: paperTheme.colors.onTertiaryContainer, fontWeight: "900", marginTop: 4 }}>{name}</Text>
                {subjectDescription ? <Text variant="bodySmall" style={{ color: paperTheme.colors.onTertiaryContainer, opacity: 0.7, marginTop: 2 }}>{subjectDescription}</Text> : null}
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onTertiaryContainer, opacity: 0.75, marginTop: 4 }}>{pendingCount} pending tasks</Text>
              </View>
              <View style={[styles.heroIcon, { backgroundColor: paperTheme.colors.surface }]}><Icon name="book-open-page-variant" size={30} color={paperTheme.colors.tertiary} /></View>
            </View>
            <View style={styles.statRow}>
              <ExpressiveRailCard value={documents.length} label="Docs" icon="file-document" />
              <ExpressiveRailCard value={marks.length} label="Marks" icon="chart-line" />
              <ExpressiveRailCard value={topicsCount} label="Topics" icon="format-list-bulleted" />
            </View>
            <View style={styles.actionsRow}>
              <ExpressiveActionPill label="AI Tutor" icon="robot" onPress={() => navigation.navigate("Tutor", { screen: "ChatList", params: { subjectId } })} />
              <ExpressiveActionPill label="Customise" icon="palette" onPress={() => setCustomizing(true)} />
            </View>
          </ExpressiveHeroPanel>
          <ExpressiveSection title="Documents">
            {documents.length === 0 ? <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>No documents yet.</Text> : documents.map((doc: any) => (
              <Pressable key={doc.id} onLongPress={() => handleDuplicateDocument(doc)}>
                <ExpressiveListRow title={doc.title} subtitle={doc.lastUpdated ? new Date(doc.lastUpdated).toLocaleDateString() : "Untitled"} icon="file-document-outline" onPress={() => navigation.navigate("DocumentEditor", { subjectId, documentId: doc.id })} />
              </Pressable>
            ))}
            <ExpressiveActionPill label="New document" icon="plus" onPress={() => setShowCreateDoc(true)} />
          </ExpressiveSection>
          <ExpressiveSection title="Homework">
            {homework.length === 0 ? <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>All caught up! No tasks here yet.</Text> : homework.map((item: any) => (
              <ExpressiveCard key={item.id} tone="low">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Checkbox status={item.completed ? "checked" : "unchecked"} onPress={() => handleToggleHomework(item)} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, textDecorationLine: item.completed ? "line-through" : "none" }}>{item.title}</Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>{item.completed ? "Completed" : "Pending"}{item.dueDate ? " · Due " + new Date(item.dueDate).toLocaleDateString() : ""}</Text>
                  </View>
                  <Pressable onPress={() => handleDeleteHomework(item)} hitSlop={8}><Icon name="delete-outline" size={20} color={paperTheme.colors.error} /></Pressable>
                </View>
              </ExpressiveCard>
            ))}
            <ExpressiveActionPill label="Add homework" icon="plus" onPress={() => setShowAddHomework(true)} />
          </ExpressiveSection>
          <ExpressiveSection title="Marks">
            {marks.length === 0 ? <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>No marks recorded yet.</Text> : marks.map((mark: any) => {
              const pct = mark.total > 0 ? (mark.score / mark.total) * 100 : 0;
              const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <ExpressiveCard key={mark.id} tone="low">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color + "20" }}><Text style={{ fontWeight: "900", color, fontSize: 13 }}>{Math.round(pct)}%</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{mark.title}</Text>
                      <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>{mark.score}/{mark.total}{mark.date ? " · " + new Date(mark.date).toLocaleDateString() : ""}</Text>
                    </View>
                  </View>
                </ExpressiveCard>
              );
            })}
            <ExpressiveActionPill label="Add mark" icon="plus" onPress={() => setShowAddMark(true)} />
          </ExpressiveSection>
          <ExpressiveSection title="Resources" actionLabel={activeResourceTab === "pastPapers" ? "Textbooks" : "Past Papers"} onAction={() => setActiveResourceTab(activeResourceTab === "pastPapers" ? "textbooks" : "pastPapers")}>
            {!subjectResource ? <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>No resources for this subject yet.</Text> : activeResourceTab === "pastPapers" ? (
              visiblePapers.length === 0 ? <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>No past papers available for your state yet.</Text> : (
                <View style={{ gap: 10 }}>
                  {visiblePapers.map((link, i) => (
                    <Pressable key={"p-" + i} onPress={() => Linking.openURL(link.url)}>
                      <ExpressiveCard tone="low">
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Icon name="file-document-outline" size={20} color={paperTheme.colors.primary} />
                          <View style={{ flex: 1 }}>
                            <Text variant="bodyLarge" numberOfLines={2} style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{link.title}</Text>
                            {link.description ? <Text variant="bodySmall" numberOfLines={2} style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>{link.description}</Text> : null}
                          </View>
                          <Icon name="open-in-new" size={16} color={paperTheme.colors.onSurfaceVariant} />
                        </View>
                      </ExpressiveCard>
                    </Pressable>
                  ))}
                </View>
              )
            ) : visibleTextbooks.length === 0 ? <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>No textbooks available yet.</Text> : (
              <View style={{ gap: 10 }}>
                {visibleTextbooks.map((link, i) => (
                  <Pressable key={"b-" + i} onPress={() => Linking.openURL(link.url)}>
                    <ExpressiveCard tone="low">
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Icon name="book-open-variant" size={20} color={paperTheme.colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyLarge" numberOfLines={2} style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{link.title}</Text>
                          {link.description ? <Text variant="bodySmall" numberOfLines={2} style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>{link.description}</Text> : null}
                        </View>
                        <Icon name="open-in-new" size={16} color={paperTheme.colors.onSurfaceVariant} />
                      </View>
                    </ExpressiveCard>
                  </Pressable>
                ))}
              </View>
            )}
          </ExpressiveSection>

          {links.length > 0 && (
            <ExpressiveSection title="Links" actionLabel="Add" onAction={() => setShowLinkForm(true)}>
              {links.map((link: any) => (
                <Pressable key={link.id} onPress={() => Linking.openURL(link.url)} onLongPress={() => handleDeleteLink(link.id)}>
                  <ExpressiveCard tone="low">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Icon name="link-variant" size={20} color={paperTheme.colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyLarge" numberOfLines={1} style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{link.title}</Text>
                        <Text variant="bodySmall" numberOfLines={1} style={{ color: paperTheme.colors.onSurfaceVariant }}>{link.url}</Text>
                      </View>
                    </View>
                  </ExpressiveCard>
                </Pressable>
              ))}
            </ExpressiveSection>
          )}

          {chapters.length > 0 && (
            <ExpressiveSection title="Syllabus">
              {chapters.map((c: any, idx: number) => (
                <ExpressiveCard key={c.id} tone="low">
                  <Pressable onPress={() => navigation.navigate("Study", { screen: "StudyHub", params: { subjectId } })}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: paperTheme.colors.primary }}>
                        <Text style={{ color: paperTheme.colors.onPrimary, fontWeight: "900", fontSize: 12 }}>{idx + 1}</Text>
                      </View>
                      <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, flex: 1 }}>{c.name}</Text>
                      <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
                    </View>
                  </Pressable>
                  {c.topics?.map((t: any) => (
                    <Pressable key={t.id} onPress={() => navigation.navigate("Study", { screen: "Flashcards", params: { subjectId } })}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 4, paddingLeft: 38, paddingVertical: 4 }}>
                        <Icon name="circle-small" size={18} color={paperTheme.colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, flex: 1 }}>{t.name}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ExpressiveCard>
              ))}
            </ExpressiveSection>
          )}
        </>
      )}

      <Portal>
        <Modal visible={showCreateDoc} onDismiss={() => setShowCreateDoc(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 12 }}>New document</Text>
          <TextInput mode="outlined" label="Title" value={docTitle} onChangeText={setDocTitle} style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={paperTheme.colors.primary} onPress={handleCreateDocument} disabled={!docTitle.trim()}>Create</Button>
        </Modal>
        <Modal visible={showAddHomework} onDismiss={() => setShowAddHomework(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 12 }}>Add homework</Text>
          <TextInput mode="outlined" label="Title" value={hwTitle} onChangeText={setHwTitle} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Due date (YYYY-MM-DD, optional)" value={hwDueDate} onChangeText={setHwDueDate} style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={paperTheme.colors.primary} onPress={handleAddHomework} disabled={!hwTitle.trim()}>Add</Button>
        </Modal>
        <Modal visible={showLinkForm} onDismiss={() => setShowLinkForm(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 12 }}>Add link</Text>
          <TextInput mode="outlined" label="Title" value={linkTitle} onChangeText={setLinkTitle} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="URL" value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={paperTheme.colors.primary} onPress={handleAddLink} disabled={!linkTitle.trim() || !linkUrl.trim()}>Add</Button>
        </Modal>
        <Modal visible={showAddMark} onDismiss={() => setShowAddMark(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 12 }}>Add mark</Text>
          <TextInput mode="outlined" label="Title (e.g. SAC 1)" value={markTitle} onChangeText={setMarkTitle} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Score" value={markScore} onChangeText={setMarkScore} keyboardType="decimal-pad" style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Total (default 100)" value={markTotal} onChangeText={setMarkTotal} keyboardType="decimal-pad" style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={paperTheme.colors.primary} onPress={handleAddMark} disabled={!markTitle.trim() || !markScore.trim()}>Add</Button>
        </Modal>
      </Portal>

      <SubjectCustomizationSheet visible={customizing} subjectId={subjectId} subjectName={name} onDismiss={() => setCustomizing(false)} />
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 20 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", gap: 14 },
  actionsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  modal: { margin: 20, padding: 24, borderRadius: 26 },
});
