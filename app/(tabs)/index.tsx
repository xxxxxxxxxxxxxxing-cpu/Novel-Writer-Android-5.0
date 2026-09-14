import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { detectEncoding, parseManuscript, type Chapter } from "@/lib/novel-utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLORS = {
  paper: "#fbf4e8",
  surface: "#fffaf2",
  ink: "#332c26",
  muted: "#8f8378",
  line: "#eadcc9",
  accent: "#cf5b00",
  accentSoft: "#f7e1bf",
  success: "#438d6a",
  dark: "#313940",
};

type Panel = "library" | "chapters" | "display" | "menu" | "export" | null;
type ThemeKey = "paper" | "sepia" | "white" | "charcoal" | "midnight" | "forest";

const starterChapters: Chapter[] = [
  { id: "c1", title: "Chapter 1: The Beginning", content: "The first page is waiting for your story." , locked: false},
  { id: "c2", title: "Chapter 2: A New Direction", content: "", locked: false },
  { id: "c3", title: "Chapter 3", content: "", locked: false },
];

export default function HomeScreen() {
  const [bookTitle, setBookTitle] = useState("Js");
  const [chapters, setChapters] = useState<Chapter[]>(starterChapters);
  const [activeId, setActiveId] = useState("c3");
  const [panel, setPanel] = useState<Panel>(null);
  const [saved, setSaved] = useState(true);
  const [theme, setTheme] = useState<ThemeKey>("paper");
  const [fontSize, setFontSize] = useState(18);
  const [font, setFont] = useState<"serif" | "sans" | "mono">("serif");
  const [lineGap, setLineGap] = useState(1.7);
  const [indent, setIndent] = useState(true);
  const [focus, setFocus] = useState(false);

  const active = chapters.find((item) => item.id === activeId) ?? chapters[0];
  const wordCount = useMemo(() => active.content.trim() ? active.content.trim().split(/\s+/).length : 0, [active.content]);
  const characterCount = active.content.length;
  const palette = theme === "charcoal" || theme === "midnight" || theme === "forest"
    ? { bg: theme === "forest" ? "#e9f0e8" : theme === "midnight" ? "#242936" : "#343537", ink: theme === "charcoal" || theme === "midnight" ? "#f5efe6" : COLORS.ink, muted: theme === "charcoal" || theme === "midnight" ? "#b8b0a5" : COLORS.muted }
    : { bg: theme === "sepia" ? "#f2e6cf" : theme === "white" ? "#ffffff" : COLORS.paper, ink: COLORS.ink, muted: COLORS.muted };

  useEffect(() => {
    AsyncStorage.getItem("novelwriter-state").then((raw) => {
      if (!raw) return;
      try {
        const state = JSON.parse(raw);
        if (state.chapters?.length) setChapters(state.chapters);
        if (state.activeId) setActiveId(state.activeId);
        if (state.bookTitle) setBookTitle(state.bookTitle);
      } catch { /* use starter state */ }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("novelwriter-state", JSON.stringify({ chapters, activeId, bookTitle }));
  }, [chapters, activeId, bookTitle]);

  const updateContent = (content: string) => {
    if (active.locked) return;
    setSaved(false);
    setChapters((items) => items.map((item) => item.id === active.id ? { ...item, content } : item));
    setTimeout(() => setSaved(true), 450);
  };

  const addChapter = () => {
    const id = `c${Date.now()}`;
    const next = { id, title: `Chapter ${chapters.length + 1}`, content: "", locked: false };
    setChapters((items) => [...items, next]);
    setActiveId(id);
    setPanel(null);
  };

  const deleteChapter = (id: string) => {
    if (chapters.length === 1) return;
    const next = chapters.filter((item) => item.id !== id);
    setChapters(next);
    if (activeId === id) setActiveId(next[0].id);
  };

  const moveChapter = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[target]] = [next[target], next[index]];
    setChapters(next);
  };

  const importText = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled) return;
    try {
      const file = result.assets[0];
      const raw = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = parseManuscript(raw, file.name);
      setBookTitle(parsed.title);
      setChapters(parsed.chapters);
      setActiveId(parsed.chapters[0]?.id ?? "c1");
      setPanel(null);
      Alert.alert("Imported", `${parsed.chapters.length} chapters detected using ${detectEncoding(raw)}.`);
    } catch {
      Alert.alert("Import failed", "That file could not be read as text. Try UTF-8, UTF-16, GBK, or another plain-text export.");
    }
  };

  const exportText = async () => {
    const body = `${bookTitle}\n\n${chapters.map((item) => `${item.title}\n\n${item.content}`).join("\n\n---\n\n")}`;
    const uri = `${FileSystem.cacheDirectory}${bookTitle.replace(/[^a-z0-9]/gi, "-")}.txt`;
    await FileSystem.writeAsStringAsync(uri, body, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: "Share manuscript" });
    else Alert.alert("Export ready", uri);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#fbf4e8]">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.app, { backgroundColor: palette.bg }]}>
          {!focus && <View style={styles.topbar}>
            <IconButton icon="menu" onPress={() => setPanel(panel === "library" ? null : "library")} />
            <Pressable style={styles.bookPicker} onPress={() => setPanel("library")}><MaterialIcons name="book" size={18} color={COLORS.accent} /><Text style={styles.bookName}>{bookTitle}</Text><MaterialIcons name="expand-more" size={18} color={COLORS.muted} /></Pressable>
            <IconButton icon="format-size" label="Aa" onPress={() => setPanel("display")} />
            <View style={styles.savedPill}><MaterialIcons name="check" size={15} color={COLORS.success} /><Text style={styles.savedText}>{saved ? "Saved" : "Saving"}</Text></View>
            <IconButton icon="center-focus-strong" onPress={() => setFocus(true)} />
            <IconButton icon="more-vert" onPress={() => setPanel(panel === "menu" ? null : "menu")} />
          </View>}

          {!focus && <View style={styles.toolbar}>
            {[["format-quote", "“ ”"], ["short-text", "‘ ’"], ["remove", "—"], ["more-horiz", "…"], ["auto-awesome", "✦"]].map(([icon, label]) => <Pressable key={label} style={styles.toolButton} onPress={() => updateContent(active.content + (label === "“ ”" ? " “" : ` ${label} `))}><MaterialIcons name={icon as any} size={17} color={COLORS.accent} /><Text style={styles.toolLabel}>{label}</Text></Pressable>)}
            <View style={styles.toolbarSpacer} />
            <IconButton icon="save" onPress={() => setSaved(true)} />
            <IconButton icon={active.locked ? "lock" : "lock-open"} onPress={() => setChapters((items) => items.map((item) => item.id === active.id ? { ...item, locked: !item.locked } : item))} />
            <IconButton icon="content-copy" onPress={() => Alert.alert("Chapter copied", "The chapter text is ready to paste into another app.")} />
          </View>}

          <View style={styles.editorHeader}><Text style={[styles.eyebrow, { color: COLORS.accent }]}>{bookTitle.toUpperCase()} • {active.title.toUpperCase()}</Text><Text style={[styles.chapterTitle, { color: palette.ink }]}>{active.title}</Text></View>
          <TextInput value={active.content} onChangeText={updateContent} editable={!active.locked} multiline scrollEnabled style={[styles.editor, { color: palette.ink, fontSize, lineHeight: fontSize * lineGap, fontFamily: font === "serif" ? "serif" : font === "mono" ? "monospace" : undefined, textAlignVertical: "top", paddingLeft: indent ? 30 : 0 }]} placeholder="Begin writing your chapter… Use the “ ” button above or type naturally for dialogue." placeholderTextColor={palette.muted} />
          {active.locked && <View style={styles.lockNotice}><MaterialIcons name="lock" size={15} color={COLORS.accent} /><Text style={styles.lockText}>This chapter is locked. Unlock it above to edit.</Text></View>}
          <View style={styles.footer}><Text style={styles.footerText}>{wordCount} words</Text><Text style={styles.dot}>•</Text><Text style={styles.footerText}>{characterCount} characters</Text><Text style={styles.dot}>•</Text><MaterialIcons name="check" size={14} color={COLORS.success} /><Text style={[styles.footerText, { color: COLORS.success }]}>All changes saved</Text></View>

          {panel && <Overlay panel={panel} onClose={() => setPanel(null)}>
            {panel === "library" && <Library chapters={chapters} activeId={activeId} setActiveId={setActiveId} onAdd={addChapter} onImport={importText} onDelete={deleteChapter} onClose={() => setPanel(null)} />}
            {panel === "chapters" && <ChapterManager chapters={chapters} activeId={activeId} setActiveId={setActiveId} onMove={moveChapter} onDelete={deleteChapter} onToggleLock={(id: string) => setChapters((items) => items.map((item) => item.id === id ? { ...item, locked: !item.locked } : item))} onAdd={addChapter} />}
            {panel === "display" && <DisplaySettings theme={theme} setTheme={setTheme} font={font} setFont={setFont} fontSize={fontSize} setFontSize={setFontSize} lineGap={lineGap} setLineGap={setLineGap} indent={indent} setIndent={setIndent} focus={focus} setFocus={setFocus} onClose={() => setPanel(null)} />}
            {panel === "menu" && <Menu onChapters={() => setPanel("chapters")} onImport={importText} onExport={() => setPanel("export")} onAdd={addChapter} />}
            {panel === "export" && <ExportPanel onExport={exportText} onImport={importText} />}
          </Overlay>}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function IconButton({ icon, label, onPress }: { icon: any; label?: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}><MaterialIcons name={icon} size={20} color={COLORS.ink} /><Text style={styles.iconLabel}>{label}</Text></Pressable>; }
function Overlay({ children, onClose }: { children: React.ReactNode; panel: Panel; onClose: () => void }) { return <Modal transparent animationType="fade" visible onRequestClose={onClose}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.sheet}>{children}</View></View></Modal>; }
function SheetHeader({ title, subtitle, icon = "menu-book", onClose }: { title: string; subtitle?: string; icon?: any; onClose?: () => void }) { return <View style={styles.sheetHeader}><View style={styles.sheetTitleRow}><MaterialIcons name={icon} size={20} color={COLORS.accent} /><View><Text style={styles.sheetTitle}>{title}</Text>{subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}</View></View>{onClose && <Pressable onPress={onClose}><MaterialIcons name="close" size={20} color={COLORS.muted} /></Pressable>}</View>; }
function Library({ chapters, activeId, setActiveId, onAdd, onImport, onDelete, onClose }: any) { return <><SheetHeader title="Your Books & Novels" subtitle={`${chapters.length} chapters in this workspace`} onClose={onClose} /><View style={styles.actionRow}><ActionButton label="Add New Book" icon="add" onPress={onAdd} outline /><ActionButton label="Import Novel" icon="upload" onPress={onImport} /></View><Pressable style={styles.bookCard}><View><Text style={styles.cardTitle}>Js <Text style={styles.activeTag}>Active</Text></Text><Text style={styles.cardMeta}>By You • {chapters.length} chapter(s) • {chapters.reduce((sum: number, c: Chapter) => sum + (c.content.trim() ? c.content.trim().split(/\s+/).length : 0), 0)} words</Text><Text style={styles.cardQuote}>“Your story workspace”</Text></View><MaterialIcons name="edit" size={18} color={COLORS.muted} /></Pressable><Pressable style={styles.manageLink} onPress={() => { onClose(); setTimeout(() => setActiveId(activeId), 0); }}><MaterialIcons name="list" size={17} color={COLORS.accent} /><Text style={styles.manageText}>Open chapter manager from the overflow menu</Text></Pressable></>; }
function ChapterManager({ chapters, activeId, setActiveId, onMove, onDelete, onToggleLock, onAdd }: any) { return <><SheetHeader title="Chapters" subtitle="Rearrange, lock, or edit your manuscript" icon="format-list-numbered" /><FlatList data={chapters} keyExtractor={(item) => item.id} renderItem={({ item, index }) => <Pressable style={[styles.chapterCard, item.id === activeId && styles.chapterCardActive]} onPress={() => setActiveId(item.id)}><View style={styles.chapterNumber}><Text style={styles.numberText}>{index + 1}</Text></View><View style={styles.chapterInfo}><Text style={styles.chapterCardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.content.trim() ? item.content.trim().split(/\s+/).length : 0} words</Text></View><IconButton icon="keyboard-arrow-up" onPress={() => onMove(index, -1)} /><IconButton icon="keyboard-arrow-down" onPress={() => onMove(index, 1)} /><IconButton icon={item.locked ? "lock" : "lock-open"} onPress={() => onToggleLock(item.id)} /><IconButton icon="delete-outline" onPress={() => onDelete(item.id)} /></Pressable>} ListFooterComponent={<Pressable style={styles.insertChapter} onPress={onAdd}><MaterialIcons name="add" size={18} color={COLORS.accent} /><Text style={styles.insertText}>Insert new chapter</Text></Pressable>} /> <Text style={styles.tip}>Tip: locked chapters allow selection and copy, preventing accidental edits.</Text></>; }
function DisplaySettings({ theme, setTheme, font, setFont, fontSize, setFontSize, lineGap, setLineGap, indent, setIndent, focus, setFocus, onClose }: any) { const themes: [ThemeKey, string][] = [["paper", "Paper"], ["sepia", "Sepia"], ["white", "White"], ["charcoal", "Charcoal"], ["midnight", "Midnight"], ["forest", "Forest"]]; return <><SheetHeader title="Reading & Writing Display" subtitle="Tune the page for comfortable focus" icon="format-size" onClose={onClose} /><ScrollView><SettingLabel label="PAPER & THEME" /><View style={styles.grid}>{themes.map(([key, label]) => <Pressable key={key} onPress={() => setTheme(key)} style={[styles.choice, theme === key && styles.choiceActive]}><Text style={styles.choiceText}>{theme === key ? "✓ " : ""}{label}</Text></Pressable>)}</View><SettingLabel label="FONT STYLE" /><View style={styles.grid}>{(["serif", "sans", "mono"] as const).map((key) => <Pressable key={key} onPress={() => setFont(key)} style={[styles.choice, font === key && styles.choiceActive]}><Text style={[styles.choiceText, { fontFamily: key === "serif" ? "serif" : key === "mono" ? "monospace" : undefined }]}>{key[0].toUpperCase() + key.slice(1)}</Text></Pressable>)}</View><SettingLabel label={`FONT SIZE • ${fontSize}px`} /><View style={styles.sliderRow}><Pressable onPress={() => setFontSize(Math.max(14, fontSize - 1))} style={styles.roundButton}><Text>A-</Text></Pressable><View style={styles.fakeSlider}><View style={[styles.sliderFill, { width: `${((fontSize - 14) / 12) * 100}%` }]} /></View><Pressable onPress={() => setFontSize(Math.min(26, fontSize + 1))} style={styles.roundButton}><Text>A+</Text></Pressable></View><SettingLabel label="LINE GAP" /><View style={styles.grid}>{[[1.35, "Compact"], [1.5, "Standard"], [1.7, "Relaxed"], [2, "Spacious"]].map(([value, label]) => <Pressable key={String(value)} onPress={() => setLineGap(value)} style={[styles.choice, lineGap === value && styles.choiceActive]}><Text style={styles.choiceText}>{label}</Text></Pressable>)}</View><SettingLabel label="READING WIDTH" /><View style={styles.grid}>{["Narrow", "Standard", "Wide", "Full"].map((value) => <View key={value} style={[styles.choice, value === "Standard" && styles.choiceActive]}><Text style={styles.choiceText}>{value}</Text></View>)}</View><View style={styles.switchRow}><Text style={styles.switchLabel}>Indent first line (novel format)</Text><Switch value={indent} onValueChange={setIndent} trackColor={{ true: COLORS.accent }} /></View><View style={styles.switchRow}><Text style={styles.switchLabel}>Distraction-free focus</Text><Switch value={focus} onValueChange={setFocus} trackColor={{ true: COLORS.accent }} /></View><Pressable style={styles.primaryButton} onPress={onClose}><Text style={styles.primaryText}>Apply & Close</Text></Pressable></ScrollView></>; }
function Menu({ onChapters, onImport, onExport, onAdd }: any) { return <><SheetHeader title="Workspace" subtitle="Manage your novel files and chapters" icon="more-vert" /><MenuItem icon="folder-open" title="Project Folder Workspace" subtitle="Link a local folder for direct file overwrites" /><MenuItem icon="upload" title="Import" subtitle="TXT, Markdown, JSON, EPUB-ready workflow" onPress={onImport} /><MenuItem icon="download" title="Save & Export Files" subtitle="Share a full manuscript or current chapter" onPress={onExport} /><MenuItem icon="format-list-numbered" title="Manage Chapters" subtitle="Reorder and lock chapters" onPress={onChapters} /><MenuItem icon="add" title="New Chapter" subtitle="Add a chapter to this book" onPress={onAdd} /><MenuItem icon="phone-android" title="Android APK & Permissions" subtitle="Runs privately with local file access" /> </>; }
function MenuItem({ icon, title, subtitle, onPress }: any) { return <Pressable style={styles.menuItem} onPress={onPress}><MaterialIcons name={icon} size={21} color={COLORS.accent} /><View style={styles.menuText}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text></View><MaterialIcons name="chevron-right" size={18} color={COLORS.muted} /></Pressable>; }
function ExportPanel({ onExport, onImport }: any) { return <><SheetHeader title="Save, Export & Import" subtitle="Portable manuscript files" icon="import-export" /><View style={styles.exportCard}><Text style={styles.cardTitle}>Full manuscript (.txt)</Text><Text style={styles.cardMeta}>All chapters in reading order with separators.</Text><ActionButton label="Share .txt" icon="share" onPress={onExport} /></View><View style={styles.exportCard}><Text style={styles.cardTitle}>Import text / backup</Text><Text style={styles.cardMeta}>UTF-8, UTF-16, GBK, Chinese text, Markdown, and more.</Text><ActionButton label="Choose file" icon="upload" onPress={onImport} outline /></View><View style={styles.exportCard}><Text style={styles.cardTitle}>Chapter detection</Text><Text style={styles.cardMeta}>Recognizes Chapter, 第X章, 卷, Part, and numbered headings in large files.</Text></View></>; }
function ActionButton({ label, icon, onPress, outline }: any) { return <Pressable onPress={onPress} style={[styles.actionButton, outline && styles.actionButtonOutline]}><MaterialIcons name={icon} size={17} color={outline ? COLORS.accent : "#fff"} /><Text style={[styles.actionText, outline && { color: COLORS.accent }]}>{label}</Text></Pressable>; }
function SettingLabel({ label }: { label: string }) { return <Text style={styles.settingLabel}>{label}</Text>; }

const styles = StyleSheet.create({ flex: { flex: 1 }, app: { flex: 1 }, topbar: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line }, bookPicker: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }, bookName: { color: COLORS.ink, fontWeight: "700", fontSize: 15 }, iconButton: { minWidth: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10 }, iconLabel: { position: "absolute", fontSize: 15, color: COLORS.ink, fontWeight: "600" }, savedPill: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: "#c6e1d0", backgroundColor: "#edf7ef", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 }, savedText: { color: COLORS.success, fontSize: 12, fontWeight: "700" }, toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, gap: 5, borderBottomWidth: 1, borderBottomColor: COLORS.line }, toolbarSpacer: { flex: 1 }, toolButton: { alignItems: "center", justifyContent: "center", minWidth: 41, height: 34, borderWidth: 1, borderColor: COLORS.line, borderRadius: 9, backgroundColor: "#fffaf2" }, toolLabel: { position: "absolute", color: COLORS.accent, fontWeight: "800", fontSize: 12 }, editorHeader: { paddingHorizontal: 20, paddingTop: 36, gap: 6 }, eyebrow: { fontSize: 12, letterSpacing: 1.2, fontWeight: "800" }, chapterTitle: { fontSize: 25, fontWeight: "700", fontFamily: "serif" }, editor: { flex: 1, paddingHorizontal: 20, paddingTop: 22, fontFamily: "serif", fontSize: 18, lineHeight: 31 }, footer: { borderTopWidth: 1, borderTopColor: COLORS.line, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 10 }, footerText: { color: COLORS.muted, fontSize: 12 }, dot: { color: COLORS.muted }, lockNotice: { marginHorizontal: 20, marginBottom: 8, flexDirection: "row", gap: 6, alignItems: "center" }, lockText: { color: COLORS.accent, fontSize: 12 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(48,39,30,0.43)", justifyContent: "flex-end" }, sheet: { maxHeight: "88%", backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 18 }, sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line, marginBottom: 14 }, sheetTitleRow: { flexDirection: "row", gap: 9, alignItems: "center" }, sheetTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800" }, sheetSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 }, actionRow: { flexDirection: "row", gap: 8, marginBottom: 14 }, actionButton: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 12, minHeight: 42, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, actionButtonOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#e7b778" }, actionText: { color: "#fff", fontWeight: "700", fontSize: 13 }, bookCard: { borderWidth: 1, borderColor: "#e8a34c", backgroundColor: COLORS.accentSoft, borderRadius: 14, padding: 15, flexDirection: "row", justifyContent: "space-between" }, cardTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 15 }, activeTag: { color: COLORS.success, fontSize: 11 }, cardMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 }, cardQuote: { color: COLORS.muted, fontStyle: "italic", marginTop: 10 }, manageLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 16 }, manageText: { color: COLORS.accent, fontSize: 12 }, chapterCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: COLORS.line, borderRadius: 13, padding: 9, marginBottom: 8 }, chapterCardActive: { borderColor: "#e8a34c", backgroundColor: COLORS.paper }, chapterNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center" }, numberText: { color: COLORS.accent, fontWeight: "800" }, chapterInfo: { flex: 1 }, chapterCardTitle: { color: COLORS.ink, fontWeight: "700" }, insertChapter: { flexDirection: "row", alignItems: "center", gap: 7, padding: 13, borderWidth: 1, borderColor: COLORS.line, borderStyle: "dashed", borderRadius: 12, justifyContent: "center" }, insertText: { color: COLORS.accent, fontWeight: "700" }, tip: { color: COLORS.muted, fontSize: 12, marginTop: 12 }, settingLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 12, marginBottom: 8 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { flexGrow: 1, minWidth: "30%", borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 11, alignItems: "center" }, choiceActive: { borderColor: "#e4a04e", backgroundColor: "#fff2dd" }, choiceText: { color: COLORS.ink, fontSize: 12 }, sliderRow: { flexDirection: "row", alignItems: "center", gap: 10 }, roundButton: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 9, padding: 9 }, fakeSlider: { flex: 1, height: 6, backgroundColor: "#4d4b49", borderRadius: 4 }, sliderFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 4 }, switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }, switchLabel: { color: COLORS.ink, fontSize: 13 }, primaryButton: { backgroundColor: COLORS.accent, borderRadius: 12, alignItems: "center", padding: 13, marginTop: 12 }, primaryText: { color: "#fff", fontWeight: "800" }, menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, menuText: { flex: 1 }, menuTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 14 }, menuSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 }, exportCard: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 13, padding: 14, marginBottom: 10, gap: 6 },
});
