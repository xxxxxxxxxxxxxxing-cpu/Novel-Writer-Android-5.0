import { describe, expect, it } from "vitest";
import { buildEpubBase64, buildZipBase64, chapterToJson, importArchiveBase64, jsonToBooks, parseManuscript, bookToJson, type Book } from "../lib/novel-utils";

describe("novel manuscript utilities", () => {
  const book: Book = { id: "b1", title: "Test Novel", author: "You", chapters: [{ id: "c1", title: "第一章 开始", content: "你好世界", locked: false }, { id: "c2", title: "Chapter 2", content: "The next page.", locked: true }] };

  it("detects Chinese chapter headings and preserves chapter order", () => {
    const result = parseManuscript("第一章 开始\n你好\n\n第2章 转折\n继续", "chinese.txt");
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe("第一章 开始");
    expect(result.chapters[1].content).toBe("继续");
  });

  it("recognizes English and numbered headings in a large text export", () => {
    const result = parseManuscript("Chapter 1: Start\nOne\n\n2. Next\nTwo\n\nPart III\nThree", "novel.txt");
    expect(result.chapters.map((chapter) => chapter.title)).toEqual(["Chapter 1: Start", "2. Next", "Part III"]);
    expect(result.chapters[0].content).toBe("One");
  });

  it("keeps plain text without headings as one imported chapter", () => {
    const result = parseManuscript("A quiet beginning.\nNo explicit chapter marker.", "notes.md");
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe("Imported Manuscript");
  });

  it("round-trips whole-book and selected-chapter JSON backups", () => {
    const restored = jsonToBooks(bookToJson(book));
    expect(restored[0].chapters).toHaveLength(2);
    expect(JSON.parse(chapterToJson(book, book.chapters[1])).chapter.title).toBe("Chapter 2");
  });

  it("exports and re-imports a whole-book ZIP archive", async () => {
    const base64 = await buildZipBase64(book);
    const restored = await importArchiveBase64(base64, "test-novel.zip");
    expect(restored.title).toBe("Test Novel");
    expect(restored.chapters.map((chapter) => chapter.title)).toEqual(["第一章 开始", "Chapter 2"]);
  });

  it("exports and re-imports an EPUB archive", async () => {
    const base64 = await buildEpubBase64(book, book.chapters[1]);
    const restored = await importArchiveBase64(base64, "chapter.epub");
    expect(restored.chapters).toHaveLength(1);
    expect(restored.chapters[0].content).toContain("The next page");
  });
});
