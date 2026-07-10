import React from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput as RNTextInput, Modal } from "react-native";
import { Text, useTheme, ActivityIndicator, Searchbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import Icon from "../../components/Icon";
import FormulaRenderer from "../../components/FormulaRenderer";
import ChatOptionsSheet from "./ChatOptionsSheet";
import { useChatSession } from "./hooks/useChatSession";
import { PendingMessage } from "./components/PendingMessage";
import { StreamingMessage } from "./components/StreamingMessage";
import { UserMessage } from "./components/UserMessage";
import { AssistantMessage } from "./components/AssistantMessage";
import { ChatGreeting } from "./components/ChatGreeting";

export default function ChatSessionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const paperTheme = useTheme();
  const c = paperTheme.colors as any;
  const insets = useSafeAreaInsets();

  const {
    isNew, loading, text, setText, hasStreaming, sending,
    inputContentHeight, setInputContentHeight,
    attachedFiles, generatingFromFiles,
    showOptions, setShowOptions,
    selectedModel, setSelectedModel, researchMode, setResearchMode,
    analogyModeEnabled, setAnalogyModeEnabled,
    showSubjectPicker, setShowSubjectPicker, subjectSearch, setSubjectSearch,
    reExplainMessageId, setReExplainMessageId, reExplainingId,
    researchSources,
    showFormulaPanel, setShowFormulaPanel, formulaSearch, setFormulaSearch,
    userData, currentSubject, currentSubjectId, filteredSubjects,
    currentFormulaSheet, allItems, messages, userHobbies,
    handleRunCode, handleRegenerate, handleReExplain,
    handleGenerateFromFiles, handleUploadFile, removeAttachedFile, handleSend,
  } = useChatSession(route, navigation);

  if (loading && !isNew)
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.surface ?? paperTheme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: paperTheme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerSide} accessibilityLabel="Back to chats">
          <Icon name="chevron-left" size={22} color={paperTheme.colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setShowSubjectPicker(true)}
          style={[styles.modelPill, { backgroundColor: c.surfaceContainerHigh ?? paperTheme.colors.surfaceVariant + "80" }]}>
          <Icon name="school" size={13} color={paperTheme.colors.primary} />
          <Text variant="labelSmall" style={{ fontWeight: "600", color: paperTheme.colors.primary }} numberOfLines={1}>
            {currentSubject?.name ?? "General"}
          </Text>
          <Icon name="chevron-down" size={11} color={paperTheme.colors.primary} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Profile", { screen: "PersonalityEditor" })}
          style={styles.headerSide} accessibilityLabel="AI Personality">
          <Icon name="robot" size={18} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Profile", { screen: "MemoryManager" })}
          style={styles.headerSide} accessibilityLabel="Memory">
          <Icon name="brain" size={18} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Pressable onPress={() => navigation.replace("ChatSession", { sessionId: "new" })} style={styles.headerSide}>
          <Icon name="plus" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(_, i) => String(i)}
        inverted
        contentContainerStyle={styles.chatList}
        style={{ backgroundColor: "transparent" }}
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }], flex: 1 }}>
            <ChatGreeting name={userData?.me?.name ?? userData?.me?.email ?? ""} />
          </View>
        }
        renderItem={({ item }) => {
          if ("_pending" in item) return <PendingMessage content={item.content} />;
          if ("_streaming" in item) return <StreamingMessage content={item.content} onRunCode={handleRunCode} />;
          if (item.role === "user") return <UserMessage content={item.content} createdAt={item.createdAt} />;
          const isLast = messages.length > 0 && messages[0]?.id === item.id;
          return (
            <AssistantMessage
              content={item.content} createdAt={item.createdAt} id={item.id}
              messages={messages} isLastAssistant={isLast} hasStreaming={hasStreaming}
              reExplainingId={reExplainingId} researchSources={researchSources} sending={sending}
              onRunCode={handleRunCode} onRegenerate={handleRegenerate}
              onReExplainRequest={setReExplainMessageId}
            />
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: insets.bottom + 4 }]}>
        {attachedFiles.length > 0 && (
          <View style={styles.fileChipRow}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", flex: 1, gap: 4 }}>
              {attachedFiles.map((f, i) => (
                <View key={i} style={styles.fileChip}>
                  <Icon name="description" size={14} color="#6366f1" />
                  <Text style={styles.fileChipText} numberOfLines={1}>{f.name}</Text>
                  <Pressable onPress={() => removeAttachedFile(i)} hitSlop={8}>
                    <Icon name="close" size={14} color="#999" />
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.fileActions}>
              <Pressable style={({ pressed }) => [styles.fileActionBtn, { borderColor: paperTheme.colors.primary, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => handleGenerateFromFiles("flashcards")} disabled={generatingFromFiles}>
                {generatingFromFiles ? <ActivityIndicator size={10} color={paperTheme.colors.primary} /> :
                  <Text variant="labelSmall" style={{ color: paperTheme.colors.primary }}>Flashcards</Text>}
              </Pressable>
              <Pressable style={({ pressed }) => [styles.fileActionBtn, { borderColor: paperTheme.colors.primary, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => handleGenerateFromFiles("quiz")} disabled={generatingFromFiles}>
                {generatingFromFiles ? <ActivityIndicator size={10} color={paperTheme.colors.primary} /> :
                  <Text variant="labelSmall" style={{ color: paperTheme.colors.primary }}>Quiz</Text>}
              </Pressable>
            </View>
          </View>
        )}
        <View style={styles.composerWrap}>
          <View style={[styles.composerPill, { backgroundColor: c.surfaceContainerHigh ?? paperTheme.colors.surfaceVariant }]}>
            <Pressable onPress={() => setShowOptions(true)} style={styles.composerAttach} accessibilityLabel="Attach or configure">
              <Icon name="plus" size={20} color={paperTheme.colors.onSurfaceVariant} />
            </Pressable>
            <RNTextInput
              value={text} onChangeText={setText} placeholder="Ask anything..."
              placeholderTextColor={paperTheme.colors.onSurfaceVariant} multiline
              onContentSizeChange={(e) => {
                const h = e.nativeEvent.contentSize.height;
                if (h > 0) setInputContentHeight(Math.min(h, 120));
              }}
              style={[styles.input, { color: paperTheme.colors.onSurface, height: Math.min(inputContentHeight, 120) },
                Platform.OS === "web" ? ({ outline: "none" } as any) : {}]}
            />
            <Pressable onPress={handleSend} disabled={sending || !text.trim()}
              style={[styles.composerSend, { backgroundColor: text.trim() && !sending ? paperTheme.colors.primary : "transparent" }]}>
              {sending ? (
                <ActivityIndicator size={18} color={text.trim() ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant} />
              ) : (
                <Icon name="send" size={16} color={text.trim() ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <ChatOptionsSheet
        visible={showOptions} onClose={() => setShowOptions(false)}
        selectedModel={selectedModel} onSelectModel={setSelectedModel}
        researchMode={researchMode} onToggleResearch={setResearchMode}
        analogyMode={analogyModeEnabled} onToggleAnalogy={setAnalogyModeEnabled}
        onUploadFile={handleUploadFile}
        onOpenFormulas={currentFormulaSheet ? () => { setShowOptions(false); setShowFormulaPanel(true); } : undefined}
        onOpenPersonality={() => { setShowOptions(false); navigation.navigate("Profile", { screen: "PersonalityEditor" }); }}
        onOpenMemory={() => { setShowOptions(false); navigation.navigate("Profile", { screen: "MemoryManager" }); }}
      />

      <Modal visible={showSubjectPicker} animationType="slide" onRequestClose={() => setShowSubjectPicker(false)} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Select Subject</Text>
              <Pressable onPress={() => setShowSubjectPicker(false)} style={styles.closeBtn}>
                <Icon name="close" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Searchbar placeholder="Search subjects..." value={subjectSearch} onChangeText={setSubjectSearch}
              style={{ marginBottom: 12, borderRadius: 16 }} inputStyle={{ fontSize: 14 }} />
            <FlatList data={filteredSubjects} keyExtractor={s => s.id}
              renderItem={({ item: s }) => (
                <Pressable
                  style={[styles.subjectRow, { backgroundColor: s.id === currentSubjectId ? paperTheme.colors.primaryContainer : "transparent" }]}
                  onPress={() => { navigation.setParams({ subjectId: s.id }); setShowSubjectPicker(false); setSubjectSearch(""); }}>
                  <Icon name={s.icon || "book"} size={20} color={paperTheme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 12 }}>{s.name}</Text>
                  {s.id === currentSubjectId && <Icon name="check" size={18} color={paperTheme.colors.primary} />}
                </Pressable>
              )} />
          </View>
        </View>
      </Modal>

      <Modal visible={reExplainMessageId !== null} animationType="slide" onRequestClose={() => setReExplainMessageId(null)} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Explain differently</Text>
              <Pressable onPress={() => setReExplainMessageId(null)} style={styles.closeBtn}>
                <Icon name="close" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Anchor the explanation to an interest for a personalised analogy.
            </Text>
            <Pressable style={[styles.anchorRow, { backgroundColor: paperTheme.colors.surfaceVariant }]}
              onPress={() => reExplainMessageId && handleReExplain(reExplainMessageId)}>
              <Icon name="dice" size={20} color={paperTheme.colors.primary} />
              <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 12, fontWeight: "600" }}>Surprise me</Text>
            </Pressable>
            {userHobbies.map((hobby: string) => (
              <Pressable key={hobby} style={[styles.anchorRow, { backgroundColor: paperTheme.colors.surfaceVariant }]}
                onPress={() => reExplainMessageId && handleReExplain(reExplainMessageId, hobby)}>
                <Text variant="bodyMedium" style={{ flex: 1 }}>{hobby}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showFormulaPanel} animationType="slide" onRequestClose={() => setShowFormulaPanel(false)} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface, maxHeight: "70%" }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>{currentFormulaSheet?.subjectName ?? "Formulas"}</Text>
              <Pressable onPress={() => setShowFormulaPanel(false)} style={styles.closeBtn}>
                <Icon name="close" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Searchbar placeholder="Search formulas..." value={formulaSearch} onChangeText={setFormulaSearch}
              style={{ marginBottom: 12, borderRadius: 16 }} inputStyle={{ fontSize: 14 }} />
            <FlatList data={(() => {
              if (!currentFormulaSheet) return [];
              const query = formulaSearch.trim().toLowerCase();
              const all = currentFormulaSheet.categories?.flatMap((c: any) => c.formulas ?? []) ?? [];
              return query ? all.filter((f: any) =>
                f.name?.toLowerCase().includes(query) || f.description?.toLowerCase().includes(query) || f.category?.toLowerCase().includes(query)
              ) : all;
            })()} keyExtractor={(f: any) => f.id}
              renderItem={({ item: formula }: any) => (
                <View style={[styles.formulaCard, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                  {formula.category && (
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {formula.category}
                    </Text>
                  )}
                  <Text variant="bodyMedium" style={{ fontWeight: "600", marginTop: 2 }}>{formula.name}</Text>
                  {formula.latex && <FormulaRenderer math={formula.latex} minHeight={32} style={{ marginTop: 4 }} />}
                  {formula.description && (
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>{formula.description}</Text>
                  )}
                </View>
              )} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 4, height: 52 },
  headerSide: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modelPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  chatList: { flex: 1, paddingHorizontal: 4, paddingTop: 4 },
  composer: { paddingTop: 4 },
  composerWrap: { paddingHorizontal: 12 },
  composerPill: { flexDirection: "row", alignItems: "center", borderRadius: 28, paddingLeft: 4, paddingRight: 4, paddingVertical: 4, gap: 4 },
  composerAttach: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, fontSize: 15, lineHeight: 20, maxHeight: 120, backgroundColor: "transparent", paddingVertical: 8, paddingHorizontal: 4 },
  composerSend: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  fileChipRow: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 6, gap: 4, flexWrap: "wrap" },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: "rgba(99,102,241,0.1)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", maxWidth: 160 },
  fileChipText: { fontSize: 11, color: "#6366f1", flex: 1 },
  fileActions: { flexDirection: "row", gap: 6, marginTop: 4 },
  fileActionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  subjectRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  anchorRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6 },
  formulaCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
});
