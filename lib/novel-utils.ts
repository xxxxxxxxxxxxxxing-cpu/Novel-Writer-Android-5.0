import JSZip from "jszip";

export type Chapter = { id: string; title: string; content: string; locked: boolean };
export type Book = { id: string; title: string; author: string; chapters: Chapter[] };

export function detectEncoding(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return "UTF-8 BOM";
  if (text.charCodeAt(0) === 0xfffe || text.charCodeAt(0) === 0xfeff) return "UTF-16";
  if (/第\s*[一二三四五六七八九十百千万0-9]+\s*章/.test(text)) return "Unicode / Chinese headings";
  return "UTF-8";
}

const HEADING = /^(?:chapter|chap\.?|part|book|volume|section|episode|prologue|epilogue|卷|章|節|节|第\s*[一二三四五六七八九十百千万0-9]+\s*[章节卷]|[0-9]{1,4}[.、:：)）-])\s*.*$/i;

export function parseManuscript(raw: string, filename = "Imported Novel") {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const lines = normalized ? normalized.split("\n") : [""];
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

export function bookToJson(book: Book): string {
  return JSON.stringify({ format: "NovelWriter JSON Backup", version: 1, book }, null, 2);
}

export function chapterToJson(book: Book, chapter: Chapter): string {
  return JSON.stringify({ format: "NovelWriter Chapter", version: 1, bookTitle: book.title, chapter }, null, 2);
}

export function jsonToBooks(raw: string): Book[] {
  const data = JSON.parse(raw);
  if (data.book?.chapters) return [{ ...data.book, id: data.book.id || `b${Date.now()}` }];
  if (data.books) return data.books;
  if (data.chapter) return [{ id: `b${Date.now()}`, title: data.bookTitle || "Imported Book", author: "Imported", chapters: [data.chapter] }];
  throw new Error("Unsupported NovelWriter JSON format");
}

function safeName(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "novel"; }
function escapeXml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function textToXhtml(text: string) { return text.split(/\n\s*\n/).map((paragraph) => `<p>${escapeXml(paragraph).replace(/\n/g, "<br/>\n")}</p>`).join("\n"); }
function stripMarkup(html: string) { return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim(); }

export async function buildZipBase64(book: Book, selectedChapter?: Chapter): Promise<string> {
  const zip = new JSZip();
  const chapters = selectedChapter ? [selectedChapter] : book.chapters;
  zip.file("novelwriter.json", selectedChapter ? chapterToJson(book, selectedChapter) : bookToJson(book));
  chapters.forEach((chapter, index) => zip.file(`chapters/${String(index + 1).padStart(3, "0")}-${safeName(chapter.title)}.txt`, `${chapter.title}\n\n${chapter.content}`));
  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}

export async function buildEpubBase64(book: Book, selectedChapter?: Chapter): Promise<string> {
  const zip = new JSZip();
  const chapters = selectedChapter ? [selectedChapter] : book.chapters;
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const manifest = chapters.map((_, index) => `<item id="c${index}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("");
  const spine = chapters.map((_, index) => `<itemref idref="c${index}"/>`).join("");
  const nav = chapters.map((chapter, index) => `<li><a href="chapter-${index + 1}.xhtml">${escapeXml(chapter.title)}</a></li>`).join("");
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(book.title)}</dc:title><dc:creator>${escapeXml(book.author)}</dc:creator><dc:identifier id="bookid">novelwriter-${Date.now()}</dc:identifier><dc:language>en</dc:language></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${manifest}</manifest><spine toc="ncx">${spine}</spine></package>`);
  zip.file("OEBPS/toc.ncx", `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap>${chapters.map((chapter, index) => `<navPoint id="nav${index}" playOrder="${index + 1}"><navLabel><text>${escapeXml(chapter.title)}</text></navLabel><content src="chapter-${index + 1}.xhtml"/></navPoint>`).join("")}</navMap></ncx>`);
  zip.file("OEBPS/nav.xhtml", `<!doctype html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(book.title)}</title></head><body><nav epub:type="toc"><h1>${escapeXml(book.title)}</h1><ol>${nav}</ol></nav></body></html>`);
  chapters.forEach((chapter, index) => zip.file(`OEBPS/chapter-${index + 1}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(chapter.title)}</title></head><body><h1>${escapeXml(chapter.title)}</h1>${textToXhtml(chapter.content)}</body></html>`));
  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}

export async function importArchiveBase64(base64: string, filename: string): Promise<{ title: string; chapters: Chapter[] }> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return jsonToBooks(await zip.file("novelwriter.json")!.async("string")).map((book) => ({ title: book.title, chapters: book.chapters }))[0];
  const jsonFile = zip.file("novelwriter.json") || zip.file(/novelwriter\.json$/i)[0];
  if (jsonFile) {
    const books = jsonToBooks(await jsonFile.async("string"));
    return { title: books[0].title, chapters: books[0].chapters };
  }
  const textFiles = Object.values(zip.files).filter((file) => !file.dir && (lower.endsWith(".epub") ? /(?:^|\/)chapter-\d+\.xhtml$/i.test(file.name) : /\.(txt|md|markdown|xhtml|html?)$/i.test(file.name)));
  const chunks = await Promise.all(textFiles.map(async (file) => stripMarkup(await file.async("string"))));
  return parseManuscript(chunks.join("\n\n"), filename);
}
