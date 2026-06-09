import jsPDF from "jspdf";

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface TextFragment {
  text: string;
  bold: boolean;
}

interface WordToken {
  text: string;
  bold: boolean;
}

type Block =
  | { type: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list-item"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

interface RenderState {
  y: number;
  pageHeight: number;
  margin: number;
  pageWidth: number;
  maxWidth: number;
  primaryColor: string;
  bodyColor: string;
  borderColor: string;
}

// Splits the text by markdown bold markers `**`
function parseInlineFormatting(text: string): TextFragment[] {
  const fragments: TextFragment[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const normalText = text.substring(lastIndex, match.index);
    if (normalText) {
      fragments.push({ text: normalText, bold: false });
    }
    fragments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    fragments.push({ text: remainingText, bold: false });
  }

  return fragments;
}

// Wraps a sequence of text fragments into lines that fit within maxWidth
function wrapFragments(fragments: TextFragment[], maxWidth: number, doc: jsPDF): TextFragment[][] {
  const tokens: WordToken[] = [];
  
  for (const frag of fragments) {
    const parts = frag.text.split(/(\s+)/);
    for (const part of parts) {
      if (part) {
        tokens.push({ text: part, bold: frag.bold });
      }
    }
  }

  const lines: TextFragment[][] = [];
  let currentLine: TextFragment[] = [];
  let currentLineWidth = 0;

  for (const token of tokens) {
    doc.setFont("helvetica", token.bold ? "bold" : "normal");
    const tokenWidth = doc.getTextWidth(token.text);

    if (currentLineWidth + tokenWidth > maxWidth && currentLineWidth > 0) {
      lines.push(currentLine);
      if (/^\s+$/.test(token.text)) {
        currentLine = [];
        currentLineWidth = 0;
      } else {
        currentLine = [{ text: token.text, bold: token.bold }];
        currentLineWidth = tokenWidth;
      }
    } else {
      if (currentLine.length > 0 && currentLine[currentLine.length - 1].bold === token.bold) {
        currentLine[currentLine.length - 1].text += token.text;
      } else {
        currentLine.push({ text: token.text, bold: token.bold });
      }
      currentLineWidth += tokenWidth;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

// Draw a line of fragments inline at the given x, y
function drawFragmentLine(line: TextFragment[], x: number, y: number, doc: jsPDF) {
  let currentX = x;
  for (const frag of line) {
    doc.setFont("helvetica", frag.bold ? "bold" : "normal");
    doc.text(frag.text, currentX, y);
    currentX += doc.getTextWidth(frag.text);
  }
}

// Parse markdown into structural blocks
function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({
        type: `h${level}` as any,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Bullet List Items
    const listMatch = line.match(/^[-*+]\s+(.*)$/);
    if (listMatch) {
      blocks.push({
        type: "list-item",
        text: listMatch[1].trim(),
      });
      i++;
      continue;
    }

    // Numbered List Items
    const numListMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numListMatch) {
      blocks.push({
        type: "list-item",
        text: numListMatch[1].trim(),
      });
      i++;
      continue;
    }

    // Table Block
    if (line.startsWith("|")) {
      let nextLine = (lines[i + 1] || "").trim();
      if (nextLine.startsWith("|") && /^[|:\-\s]+$/.test(nextLine)) {
        const headers = parseTableRow(line);
        const rows: string[][] = [];
        i += 2; // skip header and separator lines

        while (i < lines.length) {
          const nextRowLine = lines[i].trim();
          if (!nextRowLine.startsWith("|")) {
            break;
          }
          rows.push(parseTableRow(nextRowLine));
          i++;
        }

        blocks.push({
          type: "table",
          headers,
          rows,
        });
        continue;
      }
    }

    // Paragraph Block (accumulate lines until empty line or next block element)
    let paragraphText = line;
    i++;
    while (i < lines.length) {
      const nextLine = lines[i].trim();
      if (
        !nextLine ||
        nextLine.startsWith("#") ||
        nextLine.startsWith("|") ||
        /^[-*+]\s+/.test(nextLine) ||
        /^\d+\.\s+/.test(nextLine) ||
        /^(?:-{3,}|\*{3,}|_{3,})$/.test(nextLine)
      ) {
        break;
      }
      paragraphText += " " + nextLine;
      i++;
    }
    blocks.push({
      type: "paragraph",
      text: paragraphText.trim(),
    });
  }

  return blocks;
}

function parseTableRow(line: string): string[] {
  const cells = line.split("|");
  let start = 0;
  let end = cells.length;
  if (cells[0].trim() === "") start = 1;
  if (cells[cells.length - 1].trim() === "") end = cells.length - 1;
  return cells.slice(start, end).map((c) => c.trim());
}

// Main PDF generator
export function downloadPdf(title: string, content: string) {
  // Replace the Rupee symbol '₹' with 'Rs.' to avoid encoding issues in standard jsPDF fonts
  const cleanedContent = content.replace(/₹/g, "Rs.");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  
  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  
  // Extract ticker from title if possible, e.g., "SBIN.NS_news_report"
  const tickerMatch = title.match(/^([A-Za-z0-9.]+)/);
  const ticker = tickerMatch ? tickerMatch[1] : "STOCK REPORT";
  
  // Clean report title for layout title
  const displayTitle = title
    .replace(/_/g, " ")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

  // Render state
  const state: RenderState = {
    y: margin,
    pageHeight,
    margin,
    pageWidth,
    maxWidth,
    primaryColor: "#0F172A", // Slate 900
    bodyColor: "#334155",    // Slate 700
    borderColor: "#E2E8F0",  // Slate 200
  };

  // Draw an elegant gold stripe at the very top of the first page to frame the document beautifully
  doc.setFillColor(234, 179, 8); // Golden (#eab308)
  doc.rect(margin, margin - 15, maxWidth, 4, "F");

  // 1. Draw Beautiful, Clean First Page Title (Matches Website Navbar)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("ARTHA ANALYTICS", margin, margin + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("STOCK INTELLIGENCE & RESEARCH SYSTEM", margin, margin + 31);

  // Ticker text on the right (Black/Slate 900)
  const tickerText = `${ticker.toUpperCase()} · NSE`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate 900
  const tickerWidth = doc.getTextWidth(tickerText);
  doc.text(tickerText, margin + maxWidth - tickerWidth, margin + 22);

  // Divider line (Golden)
  doc.setDrawColor(234, 179, 8); // Golden (#eab308)
  doc.setLineWidth(1.5);
  doc.line(margin, margin + 40, margin + maxWidth, margin + 40);

  state.y = margin + 55;

  // 2. Parse Markdown
  const blocks = parseMarkdown(cleanedContent);

  // 3. Render Blocks
  blocks.forEach((block) => {
    switch (block.type) {
      case "h1":
        drawHeading(block.text, 1, state, doc);
        break;
      case "h2":
        drawHeading(block.text, 2, state, doc);
        break;
      case "h3":
        drawHeading(block.text, 3, state, doc);
        break;
      case "h4":
      case "h5":
      case "h6":
        drawHeading(block.text, 4, state, doc);
        break;
      case "paragraph":
        drawParagraph(block.text, state, doc);
        break;
      case "list-item":
        drawListItem(block.text, state, doc);
        break;
      case "table":
        drawTable(block.headers, block.rows, state, doc);
        break;
      case "hr":
        drawHr(state, doc);
        break;
    }
  });



  // 4. Post-process to add headers, footers, and page numbers
  addHeaderFooters(doc, displayTitle, ticker);

  // Save the document
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

function drawHeading(text: string, level: number, state: RenderState, doc: jsPDF) {
  let fontSize = 11.5;
  let spacingBefore = 11;
  let spacingAfter = 7;
  let textColor = [15, 23, 42]; // Slate 900

  if (level === 1) {
    fontSize = 18;
    spacingBefore = 20;
    spacingAfter = 12;
  } else if (level === 2) {
    fontSize = 14;
    spacingBefore = 16;
    spacingAfter = 9;
  } else if (level === 3) {
    fontSize = 12;
    spacingBefore = 12;
    spacingAfter = 7;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  
  const wrappedLines = doc.splitTextToSize(text, state.maxWidth);
  const totalHeight = wrappedLines.length * (fontSize + 3) + spacingBefore + spacingAfter;

  if (state.y + totalHeight > state.pageHeight - state.margin) {
    doc.addPage();
    state.y = state.margin;
  } else {
    state.y += spacingBefore;
  }

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  wrappedLines.forEach((line: string) => {
    doc.text(line, state.margin, state.y + fontSize - 2);
    state.y += fontSize + 2;
  });

  state.y += spacingAfter;

  if (level === 1) {
    doc.setDrawColor(234, 179, 8); // Golden (#eab308)
    doc.setLineWidth(1.5);
    doc.line(state.margin, state.y - 4, state.margin + state.maxWidth, state.y - 4);
    state.y += 6;
  }
}

function drawParagraph(text: string, state: RenderState, doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5); // Increased from 9.5
  doc.setTextColor(51, 65, 85); // Slate 700

  const fragments = parseInlineFormatting(text);
  const wrappedLines = wrapFragments(fragments, state.maxWidth, doc);
  const pLineHeight = 15; // Increased from 13.5

  wrappedLines.forEach((line) => {
    if (state.y + pLineHeight > state.pageHeight - state.margin) {
      doc.addPage();
      state.y = state.margin;
    }
    drawFragmentLine(line, state.margin, state.y + 8, doc);
    state.y += pLineHeight;
  });

  state.y += 6;
}

function drawListItem(text: string, state: RenderState, doc: jsPDF) {
  const bullet = "• ";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const bulletWidth = doc.getTextWidth(bullet);
  const indent = 15;
  const listMaxWidth = state.maxWidth - indent;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5); // Increased from 9.5
  doc.setTextColor(51, 65, 85); // Slate 700

  const fragments = parseInlineFormatting(text);
  const wrappedLines = wrapFragments(fragments, listMaxWidth, doc);
  const bulletLineHeight = 15; // Increased from 13.5

  const totalHeight = wrappedLines.length * bulletLineHeight;
  if (state.y + totalHeight > state.pageHeight - state.margin) {
    doc.addPage();
    state.y = state.margin;
  }

  wrappedLines.forEach((line, idx) => {
    if (idx === 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // Black/Slate 900
      doc.text(bullet, state.margin + 4, state.y + 8);
    }
    drawFragmentLine(line, state.margin + indent, state.y + 8, doc);
    state.y += bulletLineHeight;
  });

  state.y += 3;
}

function drawTable(headers: string[], rows: string[][], state: RenderState, doc: jsPDF) {
  const colCount = headers.length;
  if (colCount === 0) return;

  const tableWidth = state.maxWidth;
  const startX = state.margin;

  const cellPadding = 6;
  const fontSize = 9.5; // Increased from 8.5
  const headerFontSize = 10; // Increased from 9
  const lineSpacing = 13; // Increased from 11

  // 1. Calculate ideal width for each column based on actual text measurement
  const idealWidths = new Array(colCount).fill(0);
  for (let c = 0; c < colCount; c++) {
    // Measure header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(headerFontSize);
    const headerText = headers[c];
    let maxW = doc.getTextWidth(headerText) + cellPadding * 2 + 6;

    // Measure rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    for (const row of rows) {
      if (row[c]) {
        const cellText = row[c].replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
        const cellW = doc.getTextWidth(cellText) + cellPadding * 2 + 6;
        if (cellW > maxW) {
          maxW = cellW;
        }
      }
    }
    idealWidths[c] = maxW;
  }

  // Helper to determine if a column contains dates (e.g. YYYY-MM-DD)
  const isDateColumn = (colIdx: number) => {
    if (headers[colIdx].toLowerCase().includes("date")) return true;
    return rows.some((row) => row[colIdx] && /\d{4}-\d{2}-\d{2}/.test(row[colIdx]));
  };

  // 2. Allocate column widths
  const totalIdeal = idealWidths.reduce((a, b) => a + b, 0);
  let colWidths: number[] = [];

  if (totalIdeal <= tableWidth) {
    // Expand to fill the table width
    const extra = (tableWidth - totalIdeal) / colCount;
    colWidths = idealWidths.map((w) => w + extra);
  } else {
    // Columns need to be scaled down.
    // We protect small columns (like Date, Priority, impact levels) so they don't wrap,
    // and let long text columns (e.g. news description) absorb the wrapping.
    let remainingWidth = tableWidth;
    let flexibleColsCount = 0;
    let flexibleColsIdealSum = 0;
    const isFlexible = new Array(colCount).fill(false);

    for (let c = 0; c < colCount; c++) {
      const isDate = isDateColumn(c);
      
      // If ideal width is small (e.g., < 100pt) or it's a date column (where we want to guarantee at least 80pt)
      if (idealWidths[c] < 100 || (isDate && idealWidths[c] < 120)) {
        isFlexible[c] = false;
        // Date columns get at least 80 points to guarantee no wrapping
        const protectedWidth = isDate ? Math.max(idealWidths[c], 80) : idealWidths[c];
        remainingWidth -= protectedWidth;
        idealWidths[c] = protectedWidth; // update ideal width for layout
      } else {
        isFlexible[c] = true;
        flexibleColsCount++;
        flexibleColsIdealSum += idealWidths[c];
      }
    }

    // If we over-allocated protected columns, fallback to pure proportional allocation
    if (remainingWidth < 35 * flexibleColsCount || remainingWidth < 0) {
      colWidths = idealWidths.map((w) => (w / totalIdeal) * tableWidth);
    } else {
      colWidths = new Array(colCount);
      for (let c = 0; c < colCount; c++) {
        if (isFlexible[c]) {
          colWidths[c] = (idealWidths[c] / flexibleColsIdealSum) * remainingWidth;
        } else {
          colWidths[c] = idealWidths[c];
        }
      }
    }
  }

  const wrapCell = (text: string, colWidth: number, isBold: boolean) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const maxTextWidth = colWidth - cellPadding * 2;
    const cleaned = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
    return doc.splitTextToSize(cleaned, maxTextWidth);
  };

  const drawRow = (rowCells: string[], isHeader: boolean, bgAlt: boolean = false) => {
    const wrappedCells = rowCells.map((cellText, colIdx) => {
      return wrapCell(cellText, colWidths[colIdx], isHeader);
    });

    const maxLines = Math.max(...wrappedCells.map((w) => w.length), 1);
    const rowHeight = maxLines * lineSpacing + cellPadding * 2;

    if (state.y + rowHeight > state.pageHeight - state.margin) {
      doc.addPage();
      state.y = state.margin;
      if (!isHeader) {
        // Redraw header on the new page
        drawRow(headers, true);
      }
    }

    const currentY = state.y;

    // Background fill
    if (isHeader) {
      doc.setFillColor(241, 245, 249); // light blue gray
      doc.rect(startX, currentY, tableWidth, rowHeight, "F");
    } else if (bgAlt) {
      doc.setFillColor(250, 250, 250); // very light grey for alternating rows
      doc.rect(startX, currentY, tableWidth, rowHeight, "F");
    }

    let currentX = startX;
    for (let c = 0; c < colCount; c++) {
      const colWidth = colWidths[c];
      const lines = wrappedCells[c];

      // Cell border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(currentX, currentY, colWidth, rowHeight, "S");

      // Cell text
      doc.setFont("helvetica", isHeader ? "bold" : "normal");
      doc.setFontSize(isHeader ? headerFontSize : fontSize);
      doc.setTextColor(isHeader ? 15 : 51, isHeader ? 23 : 65, isHeader ? 42 : 85);

      lines.forEach((lineText: string, lineIdx: number) => {
        const textY = currentY + cellPadding + lineIdx * lineSpacing + fontSize - 1;
        doc.text(lineText, currentX + cellPadding, textY);
      });

      currentX += colWidth;
    }

    state.y += rowHeight;
  };

  // Draw table header
  drawRow(headers, true);

  // Draw rows with alternating backgrounds
  rows.forEach((row, idx) => {
    drawRow(row, false, idx % 2 === 1);
  });

  state.y += 12;
}

function drawHr(state: RenderState, doc: jsPDF) {
  if (state.y + 15 > state.pageHeight - state.margin) {
    doc.addPage();
    state.y = state.margin;
  } else {
    state.y += 6;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(state.margin, state.y, state.margin + state.maxWidth, state.y);
  state.y += 10;
}

function addHeaderFooters(doc: jsPDF, title: string, ticker: string) {
  const pageCount = doc.getNumberOfPages();
  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Running Header on pages 2 and later
    if (i > 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text("ARTHA ANALYTICS", margin, margin - 15);
      
      doc.setFont("helvetica", "normal");
      doc.text(` · STOCK RESEARCH REPORT · ${ticker.toUpperCase()}`, margin + doc.getTextWidth("ARTHA ANALYTICS"), margin - 15);

      // Line below header
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.5);
      doc.line(margin, margin - 8, pageWidth - margin, margin - 8);
    }

    // Running Footer on all pages
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400

    // Footer divider line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - margin + 8, pageWidth - margin, pageHeight - margin + 8);

    // Footer text
    const dateText = `Generated on ${today}`;
    doc.text(dateText, margin, pageHeight - margin + 18);

    const pageText = `Page ${i} of ${pageCount}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - margin + 18);
  }
}
