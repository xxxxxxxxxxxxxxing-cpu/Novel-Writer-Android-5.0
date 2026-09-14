export type Chapter = { id: string; title: string; content: string; locked: boolean };

export function detectEncoding(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return "UTF-8 BOM";
  if (text.charCodeAt(0) === 0xfffe || text.charCodeAt(0) === 0xfeff) return "UTF-16";
  if (/第\s*[一二三四五六七八九十百千万0-9]+\s*章/.test(text)) return "Unicode / Chinese headings";
  return "UTF-8";
}

const HEADING = /^(?:chapter|chap\.?|part|book|volume|section|episode|prologue|epilogue|卷|章|節|节|第\s*[一二三四五六七八九十百千万0-9]+\s*[章节卷]|[0-9]{1,4}[.、:：)）-])\s*.*$/i;

export function parseManuscript(raw: string, filename = "Imported Novel") {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const lines = normalized.split("\n");
  const matches: number[] = [];
  lines.forEach((line, index) => { if (HEADING.test(line.trim()) && line.trim().length <= 140) matches.push(index); });
  const title = filename.replace(/\.[^.]+$/, "") || "Imported Novel";
  if (matches.length === 0) return { title, chapters: [{ id: `c${Date.now()}`, title: "Imported Manuscript", content: normalized, locked: false }] };
  const chapters: Chapter[] = matches.map((start, index) => {
    const end = matches[index + 1] ?? lines.length;
    return { id: `c${Date.now()}-${index}`, title: lines[start].trim(), content: lines.slice(start + 1, end).join("\n").trim(), locked: false };
  });
  return { title, chapters };
}
