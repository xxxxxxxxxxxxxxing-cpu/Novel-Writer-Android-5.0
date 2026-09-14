import { describe, expect, it } from "vitest";
import { detectEncoding, parseManuscript } from "../lib/novel-utils";

describe("novel manuscript utilities", () => {
  it("detects Chinese chapter headings and preserves chapter order", () => {
    const result = parseManuscript("第一章 开始\n你好\n\n第2章 转折\n继续", "chinese.txt");
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe("第一章 开始");
    expect(result.chapters[1].content).toBe("继续");
    expect(detectEncoding("第一章 开始")).toBe("Unicode / Chinese headings");
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
    expect(result.chapters[0].content).toContain("A quiet beginning");
  });
});
