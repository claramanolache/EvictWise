import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Use local version for renderer process
GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

interface TextItemWithFontSize {
  str: string;
  fontSize: number;
  x: number;
  y: number;
}

interface LineData {
  items: TextItemWithFontSize[];
  text: string;
  fontSize: number;
}

/**
 * Parses a PDF file and returns markdown-formatted text, preserving headings, lists, tables, and extracting images.
 * - Headings: detected by top 3 font sizes
 * - Lists: ordered/unordered by prefixes
 * - Tables: consistent column counts
 * - Images: saved to outputDir, referenced in markdown
 * @param filePath Path to the PDF file.
 * @param outputDir Directory where extracted images will be saved.
 */
export async function parsePdfToMarkdown(file: Blob): Promise<string> {
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  const allFontSizes: number[] = [];
  const pagesLines: LineData[][] = [];
  const imageRefs: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Extract text items
    const mapped: TextItemWithFontSize[] = items.map((item) => {
      const [, , , fontSize, x, y] = item.transform;
      allFontSizes.push(fontSize);
      return { str: item.str, fontSize, x, y };
    });

    // Group into lines
    mapped.sort((a, b) => b.y - a.y || a.x - b.x);
    const buckets: TextItemWithFontSize[][] = [];
    const yT = 2;
    for (const it of mapped) {
      const b = buckets.find((line) => Math.abs(line[0].y - it.y) < yT);
      if (b) b.push(it);
      else buckets.push([it]);
    }

    const pageLines: LineData[] = buckets
      .map((lineItems) => {
        lineItems.sort((a, b) => a.x - b.x);
        const text = lineItems
          .map((i) => i.str)
          .join(" ")
          .trim();
        const maxFont = Math.max(...lineItems.map((i) => i.fontSize));
        return { items: lineItems, text, fontSize: maxFont };
      })
      .filter((l) => l.text.length > 0);

    pagesLines.push(pageLines);
  }

  // Determine heading sizes
  const uniqueSizes = Array.from(new Set(allFontSizes)).sort((a, b) => b - a);
  const headingSizes = uniqueSizes.slice(0, 3);

  const mdLines: string[] = [];

  // Insert images at start
  if (imageRefs.length > 0) {
    mdLines.push(...imageRefs);
    mdLines.push("");
  }

  // Build markdown
  for (const pageLines of pagesLines) {
    let i = 0;
    while (i < pageLines.length) {
      const line = pageLines[i];
      const cols = line.items.length;

      // Table detection
      if (cols >= 2) {
        let j = i + 1;
        while (j < pageLines.length && pageLines[j].items.length === cols) j++;
        if (j - i >= 2) {
          const header = pageLines[i].items.map((it) => it.str.trim());
          const rows = pageLines
            .slice(i + 1, j)
            .map((l) => l.items.map((it) => it.str.trim()));
          mdLines.push("|" + header.join(" | ") + "|");
          mdLines.push("|" + header.map(() => "---").join(" | ") + "|");
          for (const row of rows) mdLines.push("|" + row.join(" | ") + "|");
          i = j;
          continue;
        }
      }

      // Headings
      const lvl = headingSizes.findIndex(
        (hs) => Math.abs(line.fontSize - hs) < 1,
      );
      if (lvl !== -1) {
        mdLines.push(`${"#".repeat(lvl + 1)} ${line.text}`);
      }
      // Ordered
      else if (/^\d+[\.\)]\s+/.test(line.text)) {
        const c = line.text.replace(/^\d+[\.\)]\s+/, "");
        mdLines.push(`1. ${c}`);
      }
      // Unordered
      else if (/^[\u2022\-\*]\s+/.test(line.text)) {
        const c = line.text.replace(/^[\u2022\-\*]\s+/, "");
        mdLines.push(`- ${c}`);
      }
      // Paragraph
      else {
        mdLines.push(line.text);
      }
      i++;
    }
    mdLines.push("");
  }

  return mdLines.join("\n");
}
