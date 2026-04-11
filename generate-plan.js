const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, TableLayoutType, SectionType, TableOfContents,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════════
// GO-1 PALETTE (Graphite Orange)
// ═══════════════════════════════════════════════════════════════
const GO1 = {
  bg: "1A2330", primary: "FFFFFF", accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" }
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function emptyPara() {
  return new Paragraph({ spacing: { before: 0, after: 0 }, children: [] });
}

// calcTitleLayout and splitTitleLines from design-system.md
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([
    ..."\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF01\uFF1F",
    ..."\u7684\u4E0E\u548C\u53CA\u4E4B\u5728\u4E8E\u4E3A",
    ..."-_\u2014\u2013\u00B7/",
    ..." \t",
  ]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) {
      breakAt = charsPerLine;
      const prevChar = remaining[breakAt - 1];
      const nextChar = remaining[breakAt];
      if (prevChar && nextChar && !breakAfter.has(prevChar) && !breakAfter.has(nextChar) &&
          /[\u4e00-\u9fff]/.test(prevChar) && /[\u4e00-\u9fff]/.test(nextChar)) {
        breakAt -= 1;
      }
    }
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════
// TABLE HELPERS
// ═══════════════════════════════════════════════════════════════
const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };

function headerCell(text, widthPct) {
  const opts = {
    children: [new Paragraph({
      spacing: { line: 312 },
      children: [new TextRun({ text, bold: true, size: 21, color: GO1.table.headerText, font: { eastAsia: "SimHei", ascii: "Calibri" } })],
    })],
    shading: { type: ShadingType.CLEAR, fill: GO1.table.headerBg },
    borders: noBorders,
    margins: cellMargins,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
  };
  return new TableCell(opts);
}

function dataCell(text, widthPct, opts = {}) {
  const cellOpts = {
    children: [new Paragraph({
      spacing: { line: 312 },
      children: [new TextRun({ text: text || "", size: 21, color: "000000", font: { eastAsia: "SimSun", ascii: "Calibri" } })],
    })],
    borders: noBorders,
    margins: cellMargins,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
  };
  if (opts.shading) cellOpts.shading = { type: ShadingType.CLEAR, fill: opts.shading };
  return new TableCell(cellOpts);
}

function dataCellBold(text, widthPct, opts = {}) {
  const cellOpts = {
    children: [new Paragraph({
      spacing: { line: 312 },
      children: [new TextRun({ text: text || "", size: 21, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Calibri" } })],
    })],
    borders: noBorders,
    margins: cellMargins,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
  };
  if (opts.shading) cellOpts.shading = { type: ShadingType.CLEAR, fill: opts.shading };
  return new TableCell(cellOpts);
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const pcts = colWidths.map(w => Math.round(w / totalW * 100));
  // Adjust rounding
  const diff = 100 - pcts.reduce((a, b) => a + b, 0);
  pcts[pcts.length - 1] += diff;

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => headerCell(h, pcts[i])),
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    cantSplit: true,
    children: row.map((cell, ci) => {
      if (typeof cell === "object" && cell.bold) {
        return dataCellBold(cell.text, pcts[ci], { shading: ri % 2 === 1 ? GO1.table.surface : undefined });
      }
      return dataCell(cell, pcts[ci], { shading: ri % 2 === 1 ? GO1.table.surface : undefined });
    }),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: GO1.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: GO1.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: GO1.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  });
}

// ═══════════════════════════════════════════════════════════════
// BODY PARAGRAPH HELPERS
// ═══════════════════════════════════════════════════════════════
function bodyPara(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: "000000", font: { eastAsia: "SimSun", ascii: "Times New Roman" } })],
  });
}

function bodyParaBold(text, rest) {
  const children = [new TextRun({ text, size: 24, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })];
  if (rest) children.push(new TextRun({ text: rest, size: 24, color: "000000", font: { eastAsia: "SimSun", ascii: "Times New Roman" } }));
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 60 },
    children,
  });
}

function spacer(before = 120) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [] });
}

// ═══════════════════════════════════════════════════════════════
// COVER (R4: Top Color Block)
// ═══════════════════════════════════════════════════════════════
function buildCoverR4(config) {
  const P = GO1.cover;
  const palette = GO1;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;

  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 26);
  const titleSize = titlePt * 2;

  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const subtitleH = config.subtitle ? (12 * 23 + 200) : 0;
  const upperContentH = titleBlockHeight + subtitleH;
  const UPPER_MIN = 7500;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);
  const DIVIDER_H = 60;

  const contentEstimate = titleLines.length * (titlePt * 23 + 200) + (config.subtitle ? (12 * 23 + 200) : 0);
  const spacerIntrinsic = 280;
  const topSpacing = Math.max(UPPER_H - contentEstimate - spacerIntrinsic - 800, 400);

  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { fill: palette.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: line, size: titleSize, bold: true,
              color: P.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
          })),
          config.subtitle ? new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor,
              font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
          }) : null,
        ].filter(Boolean),
      })],
    })],
  });

  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: DIVIDER_H, rule: "exact" },
      children: [new TableCell({ borders: noBorders, shading: { fill: palette.accent }, children: [emptyPara()] })],
    })],
  });

  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    ...(config.metaLines || []).map(line => new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: line, size: 28, color: P.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    })),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: config.footerLeft || "", size: 22, color: P.footerColor }),
        new TextRun({ text: "          " }),
        new TextRun({ text: config.footerRight || "", size: 22, color: P.footerColor }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ═══════════════════════════════════════════════════════════════
function buildBody() {
  const content = [];

  // ── 1. \u6267\u884C\u6458\u8981 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "1. \u6267\u884C\u6458\u8981", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u672C\u8BA1\u5212\u4E66\u65E8\u5728\u4E3A iPSC\uFF08\u8BF1\u5BFC\u6027\u591A\u80FD\u5E72\u7EC6\u80DE\uFF09\u5B9E\u9A8C\u5BA4\u6253\u9020\u4E00\u5957\u6570\u5B57\u5316\u751F\u4EA7\u7BA1\u7406\u7CFB\u7EDF\u3002\u4E0E\u4F20\u7EDF\u7684\u5B9E\u9A8C\u5BA4\u4FE1\u606F\u7BA1\u7406\u7CFB\u7EDF\uFF08LIMS\uFF09\u4E0D\u540C\uFF0C\u672C\u7CFB\u7EDF\u7684\u6838\u5FC3\u521B\u65B0\u5728\u4E8E\u91C7\u7528\u201C\u53CC\u6A21\u5F0F\u4EA4\u4E92\u67B6\u6784\u201D\u2014\u2014\u540C\u65F6\u652F\u6301 AI \u5BF9\u8BDD\u5F0F\u64CD\u4F5C\u4E0E\u4F20\u7EDF\u8868\u5355\u64CD\u4F5C\uFF0C\u4E24\u79CD\u6A21\u5F0F\u5171\u4EAB\u7EDF\u4E00\u7684\u4E1A\u52A1\u903B\u8F91\u548C\u6570\u636E\u5C42\u3002"));

  content.push(bodyPara("\u67B6\u6784\u8BBE\u8BA1\u7684\u6838\u5FC3\u539F\u7406\u662F\u201C\u610F\u56FE\u5C42\u62BD\u8C61\u201D\uFF1A\u65E0\u8BBA\u7528\u6237\u901A\u8FC7\u8868\u5355\u586B\u5199\u8FD8\u662F\u4E0E AI \u5BF9\u8BDD\uFF0C\u5176\u64CD\u4F5C\u610F\u56FE\u90FD\u4F1A\u88AB\u8F6C\u5316\u4E3A\u7EDF\u4E00\u7684\u610F\u56FE\u5BF9\u8C61\uFF0C\u7ECF\u7531\u76F8\u540C\u7684\u5E94\u7528\u670D\u52A1\u5C42\u5904\u7406\uFF0C\u6700\u7EC8\u4F5C\u7528\u4E8E\u6570\u636E\u5E93\u3002\u8FD9\u4E00\u8BBE\u8BA1\u4F7F\u5F97 AI \u80FD\u529B\u7684\u5F15\u5165\u4E0D\u9700\u8981\u91CD\u5199\u4E1A\u52A1\u903B\u8F91\uFF0C\u800C\u53EA\u9700\u5B9E\u73B0\u4E00\u4E2A\u65B0\u7684\u610F\u56FE\u89E3\u6790\u5668\u3002"));

  content.push(bodyPara("MVP\uFF08\u6700\u5C0F\u53EF\u884C\u4EA7\u54C1\uFF09\u9636\u6BB5\u805A\u7126\u4E8E iPSC \u7EC6\u80DE\u4EA7\u54C1\u7EBF\uFF0C\u8986\u76D6\u6279\u6B21\u7BA1\u7406\u3001\u7535\u5B50\u6279\u751F\u4EA7\u8BB0\u5F55\uFF08eBPR\uFF09\u3001\u8D28\u68C0\u7BA1\u7406\u3001\u5206\u6790\u8BC1\u660E\u4E66\uFF08CoA\uFF09\u3001\u8FFD\u6EAF\u67E5\u8BE2\u7B49\u6838\u5FC3\u6A21\u5757\u3002\u540C\u65F6\uFF0C\u4E3A\u540E\u7EED AI \u6A21\u5F0F\u7684\u5F15\u5165\u9884\u5EFA\u4E86\u4E03\u9879\u67B6\u6784\u51C6\u5907\uFF0C\u5305\u62EC\u72EC\u7ACB\u72B6\u6001\u673A\u670D\u52A1\u3001\u7EDF\u4E00\u6821\u9A8C\u670D\u52A1\u3001\u7EDF\u4E00\u5BA1\u8BA1\u65E5\u5FD7\u3001\u64CD\u4F5C\u610F\u56FE\u5C42\u3001\u4E0A\u4E0B\u6587\u670D\u52A1\u3001\u786E\u8BA4\u5361\u7247\u534F\u8BAE\u548C\u6A21\u677F\u53EF\u7F16\u7A0B\u63A5\u53E3\u3002"));

  content.push(bodyPara("\u672C\u9879\u76EE\u91C7\u7528 AI \u8F85\u52A9\u5F00\u53D1\u65B9\u5F0F\uFF0C\u7531 1\u20132 \u540D\u5F00\u53D1\u8005\u6267\u884C\uFF0C\u603B\u5468\u671F\u7EA6 16 \u5468\u3002\u6280\u672F\u6808\u57FA\u4E8E Next.js 16 + TypeScript + SQLite + Prisma ORM\uFF0C\u5E76\u96C6\u6210 z-ai-web-dev-sdk \u4F5C\u4E3A\u540E\u7AEF AI \u80FD\u529B\u63A5\u53E3\u3002\u8FD9\u79CD\u7EC4\u5408\u5728\u4FDD\u8BC1\u7CFB\u7EDF\u53EF\u9760\u6027\u7684\u540C\u65F6\uFF0C\u5927\u5E45\u63D0\u5347\u4E86\u5F00\u53D1\u6548\u7387\u3002"));

  // ── 2. \u73B0\u72B6\u4E0E\u95EE\u9898\u5206\u6790 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "2. \u73B0\u72B6\u4E0E\u95EE\u9898\u5206\u6790", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 2.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "2.1 \u884C\u4E1A\u80CC\u666F", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u968F\u7740\u518D\u751F\u533B\u5B66\u548C\u7EC6\u80DE\u6CBB\u7597\u6280\u672F\u7684\u5FEB\u901F\u53D1\u5C55\uFF0CiPSC \u5B9E\u9A8C\u5BA4\u7684\u6570\u5B57\u5316\u8F6C\u578B\u5DF2\u6210\u4E3A\u884C\u4E1A\u5FC5\u7136\u8D8B\u52BF\u3002\u5F53\u524D\uFF0CiPSC \u5B9E\u9A8C\u5BA4\u7684\u4E1A\u52A1\u901A\u5E38\u6DB5\u76D6\u4E09\u5927\u4EA7\u54C1\u7EBF\uFF1A\u670D\u52A1\u9879\u76EE\uFF08\u4E3A\u5BA2\u6237\u63D0\u4F9B\u5B9A\u5236\u5316\u7EC6\u80DE\u57F9\u517B\u670D\u52A1\uFF09\u3001\u73B0\u8D27\u7EC6\u80DE\u4EA7\u54C1\uFF08\u6807\u51C6\u5316\u7EC6\u80DE\u4EA7\u54C1\u9500\u552E\uFF09\u4EE5\u53CA\u8BD5\u5242\u76D2\uFF08\u57F9\u517B\u57FA\u3001\u5206\u5316\u8BD5\u5242\u7B49\uFF09\u3002\u7136\u800C\uFF0C\u5927\u591A\u6570\u5B9E\u9A8C\u5BA4\u4ECD\u4F9D\u8D56\u7EB8\u8D28\u8BB0\u5F55\u548C\u624B\u5DE5\u64CD\u4F5C\uFF0C\u9762\u4E34\u6570\u636E\u5B64\u5C9B\u3001\u53EF\u8FFD\u6EAF\u6027\u4E0D\u8DB3\u3001\u91CD\u590D\u6027\u8868\u5355\u586B\u5199\u7B49\u7A81\u51FA\u75DB\u70B9\u3002"));

  // 2.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "2.2 \u4F20\u7EDF LIMS \u65B9\u6848\u7684\u5C40\u9650", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u4F20\u7EDF LIMS \u7CFB\u7EDF\u91C7\u7528\u201C\u8868\u5355\u7ED1\u5B9A\u67B6\u6784\u201D\uFF1A\u4E1A\u52A1\u903B\u8F91\u76F4\u63A5\u5D4C\u5165\u5728 UI \u7EC4\u4EF6\u4E2D\uFF0C\u524D\u7AEF\u63A7\u5236\u5668\u627F\u8F7D\u4E86\u6821\u9A8C\u89C4\u5219\u548C\u72B6\u6001\u673A\u903B\u8F91\u3002\u8FD9\u79CD\u67B6\u6784\u5B58\u5728\u663E\u8457\u5C40\u9650\uFF1A\u9996\u5148\uFF0C\u7531\u4E8E\u4E1A\u52A1\u903B\u8F91\u4E0E\u754C\u9762\u7D27\u8026\u5408\uFF0C\u65E0\u6CD5\u4E3A AI \u6A21\u5F0F\u63D0\u4F9B\u7EDF\u4E00\u7684\u4E1A\u52A1\u89C4\u5219\u63A5\u53E3\uFF1B\u5176\u6B21\uFF0C\u591A\u4EA7\u54C1\u7EBF\u914D\u7F6E\u7684\u7EF4\u62A4\u6210\u672C\u6781\u9AD8\uFF0C\u6BCF\u589E\u52A0\u4E00\u4E2A\u4EA7\u54C1\u7EBF\u5C31\u9700\u8981\u5F00\u53D1\u4E00\u5957\u5B8C\u6574\u7684\u8868\u5355\u548C\u6D41\u7A0B\uFF1B\u6700\u540E\uFF0C\u65E5\u5E38\u91CD\u590D\u6027\u64CD\u4F5C\u7684\u7528\u6237\u4F53\u9A8C\u8F83\u5DEE\uFF0C\u5B9E\u9A8C\u4EBA\u5458\u9700\u8981\u53CD\u590D\u586B\u5199\u76F8\u4F3C\u7684\u8868\u5355\u5B57\u6BB5\u3002"));

  // 2.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "2.3 \u53CC\u6A21\u5F0F\u67B6\u6784\u7684\u5FC5\u8981\u6027", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u4E3A\u89E3\u51B3\u4F20\u7EDF LIMS \u7684\u5C40\u9650\uFF0C\u672C\u7CFB\u7EDF\u63D0\u51FA\u201C\u53CC\u6A21\u5F0F\u67B6\u6784\u201D\u3002\u5176\u6838\u5FC3\u601D\u8DEF\u662F\uFF1A\u8868\u5355 UI \u548C AI \u5BF9\u8BDD\u90FD\u662F\u7CFB\u7EDF\u7684\u7B49\u4EF7\u5165\u53E3\uFF0C\u5B83\u4EEC\u901A\u8FC7\u7EDF\u4E00\u7684\u201C\u610F\u56FE\u5C42\u201D\u5C06\u7528\u6237\u64CD\u4F5C\u610F\u56FE\u4F20\u9012\u7ED9\u5E94\u7528\u670D\u52A1\u5C42\uFF0C\u518D\u7531\u5E94\u7528\u670D\u52A1\u5C42\u8C03\u7528\u57DF\u5C42\u7684\u72B6\u6001\u673A\u548C\u6821\u9A8C\u89C4\u5219\uFF0C\u6700\u7EC8\u4F5C\u7528\u4E8E\u6570\u636E\u5E93\u3002\u67B6\u6784\u94FE\u8DEF\u4E3A\uFF1A\u8868\u5355/AI \u2192 \u610F\u56FE\u5C42 \u2192 \u5E94\u7528\u670D\u52A1 \u2192 \u6570\u636E\u5E93\u3002\u4E0B\u8868\u5BF9\u6BD4\u4E86\u4E09\u79CD\u67B6\u6784\u65B9\u6848\u7684\u5DEE\u5F02\uFF1A"));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u7EF4\u5EA6", "\u4F20\u7EDF LIMS", "AI \u9A71\u52A8\u5BF9\u8BDD", "\u672C\u65B9\u6848\uFF1A\u53CC\u6A21\u5F0F"],
    [
      ["\u7528\u6237\u5165\u53E3", "\u4EC5\u8868\u5355", "\u4EC5 AI \u5BF9\u8BDD", "\u8868\u5355 + AI \u5BF9\u8BDD"],
      ["\u4E1A\u52A1\u903B\u8F91\u4F4D\u7F6E", "\u524D\u7AEF UI \u7EC4\u4EF6", "\u540E\u7AEF LLM \u6A21\u578B", "\u72EC\u7ACB\u5E94\u7528\u670D\u52A1\u5C42"],
      ["\u6570\u636E\u6821\u9A8C", "\u524D\u7AEF\u8868\u5355\u9A8C\u8BC1", "LLM \u81EA\u884C\u5224\u65AD", "\u7EDF\u4E00\u6821\u9A8C\u670D\u52A1 API"],
      ["\u72B6\u6001\u7BA1\u7406", "\u6309\u94AE\u4E8B\u4EF6\u786C\u7F16\u7801", "\u63D0\u793A\u8BCD\u9A71\u52A8", "\u72EC\u7ACB\u72B6\u6001\u673A\u670D\u52A1"],
      ["\u53EF\u6269\u5C55\u6027", "\u4F4E\uFF08\u9700\u91CD\u5199 UI\uFF09", "\u4E2D\uFF08\u4F9D\u8D56 LLM\uFF09", "\u9AD8\uFF08\u65B0\u589E\u610F\u56FE\u5373\u53EF\uFF09"],
    ],
    [12, 18, 18, 18]
  ));

  // ── 3. \u67B6\u6784\u8BBE\u8BA1\u4E0E\u6280\u672F\u9009\u578B ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "3. \u67B6\u6784\u8BBE\u8BA1\u4E0E\u6280\u672F\u9009\u578B", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 3.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "3.1 \u67B6\u6784\u6838\u5FC3\uFF1A\u610F\u56FE\u5C42\u62BD\u8C61", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u672C\u7CFB\u7EDF\u91C7\u7528\u5206\u5C42\u67B6\u6784\u8BBE\u8BA1\uFF0C\u5404\u5C42\u804C\u8D23\u6E05\u6670\u3001\u8026\u5408\u5EA6\u4F4E\u3002\u8868\u73B0\u5C42\u5305\u542B\u8868\u5355 UI \u548C AI \u5BF9\u8BDD UI \u4E24\u4E2A\u5E76\u884C\u5165\u53E3\uFF0C\u5B83\u4EEC\u5C06\u7528\u6237\u7684\u64CD\u4F5C\u610F\u56FE\u8F6C\u5316\u4E3A\u7EDF\u4E00\u7684\u610F\u56FE\u5BF9\u8C61\u3002\u610F\u56FE\u5C42\u8D1F\u8D23\u610F\u56FE\u7684\u89E3\u6790\u3001\u6620\u5C04\u548C\u8F6C\u53D1\uFF0C\u662F\u8868\u5355\u6A21\u5F0F\u548C AI \u6A21\u5F0F\u5171\u4EAB\u4E1A\u52A1\u903B\u8F91\u7684\u5173\u952E\u62BD\u8C61\u3002\u5E94\u7528\u670D\u52A1\u5C42\u627F\u8F7D\u7EAF\u7CB9\u7684\u4E1A\u52A1\u903B\u8F91\uFF0C\u5305\u62EC\u6279\u6B21\u7BA1\u7406\u3001eBPR \u6D41\u7A0B\u3001\u8D28\u68C0\u5224\u5B9A\u7B49\u3002\u57DF\u5C42\u5305\u542B\u72B6\u6001\u673A\u5B9A\u4E49\u3001\u6821\u9A8C\u89C4\u5219\u548C\u4E1A\u52A1\u7EA6\u675F\u3002\u6570\u636E\u5C42\u901A\u8FC7 Prisma ORM \u63D0\u4F9B\u7EDF\u4E00\u7684\u6570\u636E\u8BBF\u95EE\u63A5\u53E3\u3002"));

  // 3.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "3.2 \u6280\u672F\u6808\u9009\u578B", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u7C7B\u522B", "\u6280\u672F", "\u9009\u578B\u7406\u7531"],
    [
      ["\u524D\u7AEF\u6846\u67B6", "Next.js 16 + TypeScript", "App Router\u3001SSR\u3001\u5168\u6808\u7EDF\u4E00\uFF0C\u9002\u5408 AI \u8F85\u52A9\u5F00\u53D1\u5FEB\u901F\u8FED\u4EE3"],
      ["UI \u7EC4\u4EF6\u5E93", "shadcn/ui + Tailwind CSS 4", "\u7EC4\u4EF6\u53EF\u5B9A\u5236\u3001\u65E0\u9501\u5B9A\u3001\u8BBE\u8BA1\u7CFB\u7EDF\u5B8C\u6574"],
      ["\u6570\u636E\u5E93", "SQLite + Prisma ORM", "\u96F6\u8FD0\u7EF4\u3001\u7C7B\u578B\u5B89\u5168\uFF0C\u5B9E\u9A8C\u5BA4\u573A\u666F\u5E76\u53D1\u91CF\u4E0D\u5927"],
      ["\u8BA4\u8BC1", "NextAuth.js v4", "\u8F7B\u91CF RBAC\uFF0C\u652F\u6301\u591A\u89D2\u8272"],
      ["\u72B6\u6001\u7BA1\u7406", "Zustand + TanStack Query", "\u5BA2\u6237\u7AEF + \u670D\u52A1\u7AEF\u72B6\u6001\u5206\u79BB"],
      ["AI SDK", "z-ai-web-dev-sdk", "LLM\u3001VLM\u3001ASR\u3001TTS \u80FD\u529B\u96C6\u6210"],
    ],
    [12, 20, 38]
  ));

  // 3.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "3.3 AI \u8F85\u52A9\u5F00\u53D1\u7684\u6280\u672F\u7EA6\u675F", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u7EF4\u5EA6", "\u7EA6\u675F", "\u8BF4\u660E"],
    [
      ["AI SDK \u4EC5\u540E\u7AEF\u4F7F\u7528", "z-ai-web-dev-sdk \u5728 API Route \u4E2D\u8C03\u7528", "\u524D\u7AEF\u4E0D\u76F4\u63A5\u8C03\u7528 AI \u6A21\u578B\uFF0C\u786E\u4FDD\u5B89\u5168\u548C\u53EF\u63A7\u6027"],
      ["\u6D41\u6C34\u7EBF\u4F18\u5148", "\u6BCF\u4E2A\u6A21\u5757\u5148\u5B8C\u6210\u524D\u7AEF UI \u518D\u8865\u540E\u7AEF", "\u8BA9\u7528\u6237\u5C3D\u65E9\u770B\u5230\u53EF\u89C6\u5316\u7ED3\u679C\uFF0C\u53CA\u65F6\u8C03\u6574\u65B9\u5411"],
      ["\u63A5\u53E3\u5148\u884C", "API Route \u5148\u4E8E\u4E1A\u52A1\u903B\u8F91", "\u5148\u5B9A\u4E49\u6E05\u6670\u7684\u63A5\u53E3\u5951\u7EA6\uFF0CAI \u751F\u6210\u4EE3\u7801\u66F4\u51C6\u786E"],
      ["\u6A21\u5757\u72EC\u7ACB", "\u5355\u4E2A\u6587\u4EF6\u5B8C\u6210\u5355\u4E2A\u804C\u8D23", "\u964D\u4F4E AI \u7406\u89E3\u4E0A\u4E0B\u6587\u7684\u96BE\u5EA6\uFF0C\u51CF\u5C11\u5E7B\u89C9"],
    ],
    [12, 24, 34]
  ));

  // ── 4. \u4E03\u9879\u67B6\u6784\u51C6\u5907 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "4. \u4E03\u9879\u67B6\u6784\u51C6\u5907", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 4.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "4.1 \u6982\u8FF0", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u4E03\u9879\u67B6\u6784\u51C6\u5907\u662F\u672C\u7CFB\u7EDF\u5B9E\u73B0\u53CC\u6A21\u5F0F\u5171\u5B58\u7684\u57FA\u7840\u8BBE\u65BD\u3002\u5B83\u4EEC\u5728 MVP \u9636\u6BB5\u4EE5\u786C\u7F16\u7801\u5F62\u5F0F\u9884\u5EFA\uFF0C\u786E\u4FDD\u8868\u5355\u6A21\u5F0F\u53EF\u4EE5\u6B63\u5E38\u5DE5\u4F5C\uFF1B\u540C\u65F6\uFF0C\u5B83\u4EEC\u7684\u63A5\u53E3\u8BBE\u8BA1\u5145\u5206\u8003\u8651\u4E86 AI \u6A21\u5F0F\u7684\u9700\u6C42\uFF0C\u4F7F\u5F97\u540E\u7EED\u9636\u6BB5\u53EF\u4EE5\u65E0\u7F1D\u6269\u5C55\u3002\u8FD9\u4E03\u9879\u51C6\u5907\u5305\u62EC\uFF1A\u72EC\u7ACB\u72B6\u6001\u673A\u670D\u52A1\u3001\u7EDF\u4E00\u6821\u9A8C\u670D\u52A1\u3001\u7EDF\u4E00\u5BA1\u8BA1\u65E5\u5FD7\u3001\u64CD\u4F5C\u610F\u56FE\u5C42\u3001\u4E0A\u4E0B\u6587\u670D\u52A1\u3001\u786E\u8BA4\u5361\u7247\u534F\u8BAE\u548C\u6A21\u677F\u53EF\u7F16\u7A0B\u63A5\u53E3\u3002"));

  // 4.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "4.2 \u4F18\u5148\u7EA7\u77E9\u9635", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u4F18\u5148\u7EA7", "\u51C6\u5907\u9879", "MVP \u9636\u6BB5\u8981\u6C42", "\u540E\u7EED\u9636\u6BB5\u8865\u5145"],
    [
      ["P0", {text: "\u72EC\u7ACB\u72B6\u6001\u673A\u670D\u52A1", bold: true}, "\u5B8C\u6574\u5B9E\u73B0\uFF0C\u652F\u6301\u5168\u90E8\u72B6\u6001\u6D41\u8F6C", "\u589E\u52A0\u81EA\u5B9A\u4E49\u72B6\u6001\u6D41\u914D\u7F6E"],
      ["P0", {text: "\u7EDF\u4E00\u6821\u9A8C\u670D\u52A1", bold: true}, "\u540E\u7AEF\u6821\u9A8C API\uFF0C\u8868\u5355\u53EF\u8C03\u7528", "\u589E\u52A0\u66F4\u591A\u4E1A\u52A1\u89C4\u5219\u6821\u9A8C"],
      ["P0", {text: "\u7EDF\u4E00\u5BA1\u8BA1\u65E5\u5FD7", bold: true}, "\u5355\u4E00\u5BA1\u8BA1\u8868\uFF0C\u542B input_mode \u5B57\u6BB5", "AI \u6A21\u5F0F\u4E0B\u7684\u5BF9\u8BDD\u539F\u6587\u4FDD\u5B58"],
      ["P1", {text: "\u64CD\u4F5C\u610F\u56FE\u5C42", bold: true}, "\u786C\u7F16\u7801\u610F\u56FE\u6620\u5C04\uFF0C\u8868\u5355\u901A\u8FC7\u610F\u56FE\u5C42\u63D0\u4EA4", "\u610F\u56FE\u6CE8\u518C\u8868 + \u52A8\u6001\u610F\u56FE\u52A0\u8F7D"],
      ["P1", {text: "\u4E0A\u4E0B\u6587\u670D\u52A1", bold: true}, "\u57FA\u7840\u7248\u672C\uFF0C\u63D0\u4F9B\u6279\u6B21\u5F53\u524D\u72B6\u6001\u548C\u5386\u53F2", "AI \u5B8C\u6574\u4E0A\u4E0B\u6587\uFF08\u9ED8\u8BA4\u503C\u3001\u4E0B\u4E00\u6B65\u63D0\u793A\uFF09"],
      ["P1", {text: "\u786E\u8BA4\u5361\u7247\u534F\u8BAE", bold: true}, "\u6570\u636E\u7ED3\u6784\u5B9A\u4E49 + \u8868\u5355\u6A21\u5F0F\u6E32\u67D3", "AI \u6A21\u5F0F\u7684\u667A\u80FD\u63D0\u53D6 + \u7F6E\u4FE1\u5EA6\u6807\u8BB0"],
      ["P2", {text: "\u6A21\u677F\u53EF\u7F16\u7A0B\u63A5\u53E3", bold: true}, "\u786C\u7F16\u7801 eBPR \u6A21\u677F", "\u52A8\u6001\u6A21\u677F\u914D\u7F6E + ai_hint \u5B57\u6BB5"],
    ],
    [6, 14, 22, 22]
  ));

  // 4.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "4.3 \u6BCF\u9879\u51C6\u5907\u7684\u7B80\u660E\u8BF4\u660E", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyParaBold("\u72EC\u7ACB\u72B6\u6001\u673A\u670D\u52A1\uFF1A", "\u5C06\u6279\u6B21\u72B6\u6001\u7684\u8F6C\u6362\u89C4\u5219\u4ECE UI \u7EC4\u4EF6\u4E2D\u62BD\u79BB\u51FA\u6765\uFF0C\u6210\u4E3A\u72EC\u7ACB\u7684\u670D\u52A1\u3002\u4EFB\u4F55\u6A21\u5F0F\uFF08\u8868\u5355\u6216 AI\uFF09\u90FD\u901A\u8FC7\u8C03\u7528\u72B6\u6001\u673A API \u6765\u63A8\u8FDB\u72B6\u6001\u6D41\u8F6C\uFF0C\u786E\u4FDD\u72B6\u6001\u4E00\u81F4\u6027\u3002"));
  content.push(bodyParaBold("\u7EDF\u4E00\u6821\u9A8C\u670D\u52A1\uFF1A", "\u63D0\u4F9B\u7EDF\u4E00\u7684\u540E\u7AEF\u6821\u9A8C API\uFF0C\u8868\u5355\u6A21\u5F0F\u548C AI \u6A21\u5F0F\u90FD\u901A\u8FC7\u8C03\u7528\u540C\u4E00\u4E2A\u6821\u9A8C\u63A5\u53E3\u6765\u9A8C\u8BC1\u6570\u636E\u3002\u6821\u9A8C\u89C4\u5219\u6765\u81EA\u4EA7\u54C1\u6A21\u677F\u914D\u7F6E\uFF0C\u652F\u6301\u52A8\u6001\u6269\u5C55\u3002"));
  content.push(bodyParaBold("\u7EDF\u4E00\u5BA1\u8BA1\u65E5\u5FD7\uFF1A", "\u6240\u6709\u64CD\u4F5C\u8BB0\u5F55\u7EDF\u4E00\u5B58\u50A8\u5728\u540C\u4E00\u5F20\u5BA1\u8BA1\u8868\u4E2D\uFF0C\u5305\u542B input_mode \u5B57\u6BB5\u6807\u8BC6\u64CD\u4F5C\u6765\u6E90\uFF08\u8868\u5355\u6216 AI\uFF09\u3002\u8FD9\u4E3A\u8FFD\u6EAF\u548C\u5408\u89C4\u5BA1\u8BA1\u63D0\u4F9B\u4E86\u57FA\u7840\u3002"));
  content.push(bodyParaBold("\u64CD\u4F5C\u610F\u56FE\u5C42\uFF1A", "\u5C06\u7528\u6237\u64CD\u4F5C\u62BD\u8C61\u4E3A\u7EDF\u4E00\u7684\u610F\u56FE\u5BF9\u8C61\u3002MVP \u9636\u6BB5\u91C7\u7528\u786C\u7F16\u7801\u610F\u56FE\u6620\u5C04\uFF0C\u8868\u5355\u63D0\u4EA4\u5148\u8F6C\u5316\u4E3A\u610F\u56FE\u518D\u6267\u884C\uFF0C\u4E3A AI \u6A21\u5F0F\u7684\u610F\u56FE\u89E3\u6790\u5668\u63D0\u4F9B\u63A5\u53E3\u3002"));
  content.push(bodyParaBold("\u4E0A\u4E0B\u6587\u670D\u52A1\uFF1A", "\u4E3A AI \u5BF9\u8BDD\u63D0\u4F9B\u6279\u6B21\u7684\u5F53\u524D\u72B6\u6001\u3001\u5386\u53F2\u64CD\u4F5C\u548C\u76F8\u5173\u6570\u636E\u3002MVP \u9636\u6BB5\u63D0\u4F9B\u57FA\u7840\u7248\u672C\uFF0C\u540E\u7EED\u6269\u5C55\u4E3A\u5305\u542B\u9ED8\u8BA4\u503C\u548C\u4E0B\u4E00\u6B65\u63D0\u793A\u7684\u5B8C\u6574\u7248\u672C\u3002"));
  content.push(bodyParaBold("\u786E\u8BA4\u5361\u7247\u534F\u8BAE\uFF1A", "\u5B9A\u4E49 AI \u7406\u89E3\u7528\u6237\u610F\u56FE\u540E\u5411\u7528\u6237\u5C55\u793A\u7684\u786E\u8BA4\u5361\u7247\u6570\u636E\u7ED3\u6784\u3002MVP \u9636\u6BB5\u4EC5\u5B9E\u73B0\u8868\u5355\u6A21\u5F0F\u7684\u6E32\u67D3\uFF0C\u540E\u7EED\u6269\u5C55\u4E3A\u542B\u7F6E\u4FE1\u5EA6\u6807\u8BB0\u7684\u667A\u80FD\u63D0\u53D6\u6A21\u5F0F\u3002"));
  content.push(bodyParaBold("\u6A21\u677F\u53EF\u7F16\u7A0B\u63A5\u53E3\uFF1A", "\u5C06 eBPR \u6B65\u9AA4\u6A21\u677F\u62BD\u8C61\u4E3A\u53EF\u914D\u7F6E\u7684\u6570\u636E\u7ED3\u6784\u3002MVP \u9636\u6BB5\u91C7\u7528\u786C\u7F16\u7801\u6A21\u677F\uFF0C\u540E\u7EED\u6269\u5C55\u4E3A\u52A8\u6001\u914D\u7F6E\u5E76\u589E\u52A0 ai_hint \u5B57\u6BB5\u4EE5\u652F\u6301 AI \u81EA\u52A8\u586B\u5199\u3002"));

  // ── 5. MVP \u529F\u80FD\u8303\u56F4 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "5. MVP \u529F\u80FD\u8303\u56F4\uFF08\u9636\u6BB5\u4E00\uFF09", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 5.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "5.1 MVP \u5B9A\u4F4D", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("MVP \u9636\u6BB5\u805A\u7126\u4E8E iPSC \u7EC6\u80DE\u4EA7\u54C1\u7EBF\uFF0C\u8FD9\u662F\u6807\u51C6\u5316\u7A0B\u5EA6\u6700\u9AD8\u7684\u4E1A\u52A1\u7EBF\u3002\u5176\u4ED6\u4E24\u6761\u4EA7\u54C1\u7EBF\u5728 MVP \u9636\u6BB5\u4EC5\u63D0\u4F9B\u57FA\u7840\u652F\u6301\u3002"));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u4EA7\u54C1\u7EBF", "MVP \u72B6\u6001", "\u7406\u7531"],
    [
      ["iPSC \u7EC6\u80DE\u4EA7\u54C1", "\u5B8C\u6574\u652F\u6301", "\u6D41\u7A0B\u6807\u51C6\u5316\u7A0B\u5EA6\u6700\u9AD8"],
      ["\u670D\u52A1\u9879\u76EE", "\u57FA\u7840\u6279\u6B21\u7BA1\u7406", "\u5F85\u6269\u5C55\u9636\u6BB5\u5B8C\u5584 eBPR \u548C\u8D28\u68C0"],
      ["\u8BD5\u5242\u76D2", "\u4EC5\u57FA\u7840\u914D\u7F6E", "\u975E\u6838\u5FC3\u4E1A\u52A1\uFF0C\u540E\u671F\u8FED\u4EE3"],
    ],
    [14, 18, 30]
  ));

  // 5.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "5.2 \u6838\u5FC3\u529F\u80FD\u6A21\u5757", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u6A21\u5757", "\u529F\u80FD\u70B9", "\u4F18\u5148\u7EA7", "\u67B6\u6784\u7EA6\u675F"],
    [
      [{text: "\u6279\u6B21\u7BA1\u7406", bold: true}, "\u521B\u5EFA\u3001\u72B6\u6001\u6D41\u8F6C\u3001\u8BE6\u60C5\u3001\u5217\u8868\u7B5B\u9009", "P0", "\u901A\u8FC7\u72B6\u6001\u673A API \u7BA1\u7406\u72B6\u6001\uFF0C\u7981\u6B62\u76F4\u63A5\u4FEE\u6539\u72B6\u6001\u5B57\u6BB5"],
      [{text: "eBPR", bold: true}, "\u6B65\u9AA4\u5F15\u5BFC\u5F55\u5165\u3001\u7269\u6599\u5F55\u5165\u3001\u9644\u4EF6\u4E0A\u4F20\u3001\u5F02\u5E38\u4E0A\u62A5", "P0", "\u8868\u5355\u63D0\u4EA4\u5FC5\u987B\u901A\u8FC7\u610F\u56FE\u5C42 + \u6821\u9A8C\u670D\u52A1"],
      [{text: "\u8D28\u68C0\u7BA1\u7406", bold: true}, "\u8D28\u68C0\u4EFB\u52A1\u521B\u5EFA\u3001\u7ED3\u679C\u5F55\u5165\u3001\u81EA\u52A8\u5224\u5B9A", "P0", "\u6821\u9A8C\u89C4\u5219\u6765\u81EA\u4EA7\u54C1\u6A21\u677F\uFF0C\u901A\u8FC7\u6821\u9A8C API \u8C03\u7528"],
      [{text: "CoA \u7BA1\u7406", bold: true}, "CoA \u8349\u7A3F\u751F\u6210\u3001\u5BA1\u6838\u6D41\u7A0B\u3001PDF \u5BFC\u51FA", "P0", "\u4ECE\u8D28\u68C0\u6570\u636E\u81EA\u52A8\u6D41\u8F6C\uFF0C\u542B\u7535\u5B50\u7B7E\u540D"],
      [{text: "\u8FFD\u6EAF\u67E5\u8BE2", bold: true}, "\u6279\u6B21\u751F\u547D\u5468\u671F\u3001\u7269\u6599\u8FFD\u6EAF\u3001\u65F6\u95F4\u7EBF", "P0", "\u57FA\u4E8E\u7EDF\u4E00\u5BA1\u8BA1\u65E5\u5FD7\u67E5\u8BE2"],
      [{text: "\u57FA\u7840\u914D\u7F6E", bold: true}, "\u7528\u6237\u7BA1\u7406\u3001\u89D2\u8272\u6743\u9650 (RBAC)\u3001\u57FA\u7840\u6570\u636E", "P0", "NextAuth.js + \u4E1A\u52A1\u89D2\u8272\u6743\u9650\u7CFB\u7EDF"],
      [{text: "\u7269\u6599\u626B\u7801", bold: true}, "\u626B\u7801\u5F55\u5165\u7269\u6599\u6279\u53F7", "P1", "\u4F5C\u4E3A\u610F\u56FE\u53C2\u6570\u7684\u5FEB\u6377\u8F93\u5165\u65B9\u5F0F"],
    ],
    [10, 22, 6, 30]
  ));

  // 5.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "5.3 MVP \u660E\u786E\u4E0D\u5305\u542B\u7684\u529F\u80FD", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u529F\u80FD", "\u6401\u7F6E\u539F\u56E0", "\u8BA1\u5212\u9636\u6BB5"],
    [
      ["AI \u5BF9\u8BDD\u5DE5\u4F5C\u53F0\u754C\u9762", "MVP \u4EC5\u505A\u67B6\u6784\u51C6\u5907\uFF0C\u4E0D\u5F00\u53D1 AI UI", "\u9636\u6BB5\u4E8C"],
      ["\u670D\u52A1\u9879\u76EE\u5B8C\u6574 eBPR", "\u670D\u52A1\u9879\u76EE\u6D41\u7A0B\u5DEE\u5F02\u5927\uFF0C\u9700\u72EC\u7ACB\u6A21\u677F", "\u9636\u6BB5\u4E8C"],
      ["\u9AD8\u7EA7\u62A5\u8868\u7EDF\u8BA1", "\u5C5E\u4E8E\u589E\u503C\u529F\u80FD\uFF0C\u4E0D\u5F71\u54CD\u6838\u5FC3\u6D41\u7A0B", "\u9636\u6BB5\u4E09"],
      ["AI \u56FE\u7247\u5206\u6790", "\u9700\u8981\u4E13\u4E1A\u8BAD\u7EC3\u6570\u636E\u548C\u6A21\u578B", "\u9636\u6BB5\u4E09"],
      ["\u7CFB\u7EDF\u96C6\u6210", "\u9700\u8981\u63A5\u53E3\u5BF9\u63A5\uFF0C\u53EF\u540E\u671F\u5B9E\u73B0", "\u9636\u6BB5\u4E09"],
      ["\u8BED\u97F3\u8F93\u5165 (ASR)", "\u4F9D\u8D56\u540E\u7AEF\u670D\u52A1\uFF0C\u5F85\u5BF9\u8BDD\u5DE5\u4F5C\u53F0\u4E00\u8D77\u5F00\u53D1", "\u9636\u6BB5\u4E8C"],
    ],
    [18, 28, 10]
  ));

  // ── 6. \u5206\u9636\u6BB5\u5F00\u53D1\u8BA1\u5212 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "6. \u5206\u9636\u6BB5\u5F00\u53D1\u8BA1\u5212", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 6.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "6.1 \u603B\u4F53\u89C4\u5212", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u9636\u6BB5", "\u540D\u79F0", "\u5468\u671F", "\u6838\u5FC3\u76EE\u6807"],
    [
      ["\u9636\u6BB5\u4E00", "MVP \u6838\u5FC3", "\u7B2C 1\u20138 \u5468", "\u5B9E\u73B0\u8868\u5355\u6A21\u5F0F\u5168\u6D41\u7A0B\uFF0C\u5B8C\u6210\u67B6\u6784\u51C6\u5907"],
      ["\u9636\u6BB5\u4E8C", "AI \u80FD\u529B\u96C6\u6210", "\u7B2C 9\u201312 \u5468", "\u5F00\u53D1 AI \u5BF9\u8BDD\u5DE5\u4F5C\u53F0\uFF0C\u6269\u5C55\u670D\u52A1\u9879\u76EE\u652F\u6301"],
      ["\u9636\u6BB5\u4E09", "\u6269\u5C55\u4E0E\u4F18\u5316", "\u7B2C 13\u201316 \u5468", "\u914D\u7F6E\u5316\u67B6\u6784\u3001\u62A5\u8868\u3001\u9AD8\u7EA7 AI \u529F\u80FD"],
      ["\u9636\u6BB5\u56DB", "\u6D4B\u8BD5\u4E0E\u4E0A\u7EBF", "\u7B2C 17\u201318 \u5468", "\u7CFB\u7EDF\u6D4B\u8BD5\u3001\u7528\u6237\u57F9\u8BAD\u3001\u6B63\u5F0F\u4E0A\u7EBF"],
    ],
    [8, 12, 14, 32]
  ));

  // 6.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "6.2 \u9636\u6BB5\u4E00\u8BE6\u7EC6\u62C6\u89E3\uFF08MVP \u2014 \u7B2C 1\u20138 \u5468\uFF09", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 6.2.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text: "\u7B2C 1\u20132 \u5468\uFF1A\u57FA\u7840\u67B6\u6784\u642D\u5EFA", size: 24, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u5B8C\u6210\u6570\u636E\u5E93 Schema \u8BBE\u8BA1\uFF08Prisma\uFF09\u3001\u8BA4\u8BC1\u7CFB\u7EDF\uFF08NextAuth.js + RBAC\uFF09\u3001P0 \u67B6\u6784\u9879\u76EE\u539F\u578B\uFF08\u72B6\u6001\u673A\u6838\u5FC3 + \u6821\u9A8C\u670D\u52A1\u9AA8\u67B6 + \u5BA1\u8BA1\u65E5\u5FD7\u8868\uFF09\u3001\u9879\u76EE\u57FA\u7840\u8BBE\u65BD\uFF08\u5E03\u5C40\u3001\u8DEF\u7531\u3001\u9519\u8BEF\u5904\u7406\u3001API \u7EA6\u5B9A\uFF09\u3002"));
  content.push(bodyParaBold("\u91CC\u7A0B\u7891\uFF1A", "\u80FD\u591F\u521B\u5EFA\u7528\u6237\u3001\u767B\u5F55\u3001\u6743\u9650\u63A7\u5236\u6B63\u5E38\u5DE5\u4F5C\u3002"));

  // 6.2.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text: "\u7B2C 3\u20134 \u5468\uFF1A\u6279\u6B21\u7BA1\u7406 + eBPR", size: 24, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u5B9E\u73B0\u6279\u6B21 CRUD \u53CA\u901A\u8FC7\u72B6\u6001\u673A API \u8FDB\u884C\u72B6\u6001\u7BA1\u7406\u3001eBPR \u6B65\u9AA4\u5F15\u5BFC\u8868\u5355\u53CA\u901A\u8FC7\u610F\u56FE\u5C42\u63D0\u4EA4\u3001\u7269\u6599\u5F55\u5165\u53CA\u9644\u4EF6\u4E0A\u4F20\u3001\u5F02\u5E38\u4E0A\u62A5\u4F5C\u4E3A\u610F\u56FE\u63D0\u4EA4\u3002"));
  content.push(bodyParaBold("\u91CC\u7A0B\u7891\uFF1A", "\u80FD\u591F\u521B\u5EFA\u6279\u6B21\u5E76\u5B8C\u6210\u751F\u4EA7\u8BB0\u5F55\u5F55\u5165\u3002"));

  // 6.2.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text: "\u7B2C 5\u20136 \u5468\uFF1A\u8D28\u68C0 + CoA", size: 24, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u5B9E\u73B0\u8D28\u68C0\u4EFB\u52A1\u521B\u5EFA\u3001\u7ED3\u679C\u5F55\u5165\u53CA\u81EA\u52A8\u5224\u5B9A\u3001CoA \u8349\u7A3F\u4ECE\u8D28\u68C0\u6570\u636E\u81EA\u52A8\u751F\u6210\u3001\u5BA1\u6838\u5DE5\u4F5C\u6D41\u53CA\u7535\u5B50\u7B7E\u540D\u3001PDF \u5BFC\u51FA\u529F\u80FD\u3002"));
  content.push(bodyParaBold("\u91CC\u7A0B\u7891\uFF1A", "\u80FD\u591F\u5B8C\u6210\u8D28\u68C0\u5168\u6D41\u7A0B\u5E76\u751F\u6210 CoA\u3002"));

  // 6.2.4
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text: "\u7B2C 7\u20138 \u5468\uFF1A\u8FFD\u6EAF + \u914D\u7F6E + \u8054\u8C03", size: 24, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u5B9E\u73B0\u6279\u6B21\u751F\u547D\u5468\u671F\u8FFD\u6EAF\u53CA\u7269\u6599\u8FFD\u6EAF\u3001\u57FA\u7840\u6570\u636E\u7BA1\u7406\uFF08\u7269\u6599\u3001\u8BBE\u5907\u3001\u4EA7\u54C1\u6A21\u677F\uFF09\u3001\u4E0A\u4E0B\u6587\u670D\u52A1\u57FA\u7840\u7248\u672C\u3001\u7AEF\u5230\u7AEF\u96C6\u6210\u6D4B\u8BD5\u3001MVP \u5185\u90E8\u6F14\u793A\u3002"));
  content.push(bodyParaBold("\u91CC\u7A0B\u7891\uFF1A", "MVP \u5B8C\u6210\uFF0C\u53EF\u8FDB\u884C\u5185\u90E8\u6F14\u793A\u3002"));

  // 6.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "6.3 \u9636\u6BB5\u4E8C\u8BE6\u7EC6\u62C6\u89E3\uFF08AI \u96C6\u6210 \u2014 \u7B2C 9\u201312 \u5468\uFF09", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u9636\u6BB5\u4E8C\u7684\u6838\u5FC3\u662F\u5F00\u53D1 AI \u5BF9\u8BDD\u5F15\u64CE\uFF08\u540E\u7AEF LLM \u96C6\u6210\uFF09\u3001\u5BF9\u8BDD\u5DE5\u4F5C\u7A7A UI\uFF08\u5DE6\u4FA7\u8FB9\u680F + \u53F3\u4FA7\u5BF9\u8BDD\uFF09\u3001\u786E\u8BA4\u5361\u7247\u534F\u8BAE\u5B9E\u73B0\uFF08\u542B\u7F6E\u4FE1\u5EA6\u663E\u793A\uFF09\u3001\u670D\u52A1\u9879\u76EE eBPR \u6A21\u677F\u3001\u6A21\u5F0F\u5207\u6362\u673A\u5236\uFF08\u8868\u5355 \u2194 \u5BF9\u8BDD\uFF09\u3001\u4E0A\u4E0B\u6587\u670D\u52A1\u5B8C\u6574\u7248\u672C\uFF08\u9ED8\u8BA4\u503C\u3001\u4E0B\u4E00\u6B65\u63D0\u793A\uFF09\u3002"));
  content.push(bodyParaBold("\u91CC\u7A0B\u7891\uFF1A", "AI \u5BF9\u8BDD\u6A21\u5F0F\u53EF\u7528\uFF0C\u4E0E\u8868\u5355\u6A21\u5F0F\u65E0\u7F1D\u5207\u6362\u3002"));

  // 6.4
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "6.4 \u9636\u6BB5\u4E09 + \u56DB\u7B80\u8FF0", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u9636\u6BB5\u4E09\uFF08\u7B2C 13\u201316 \u5468\uFF09\u805A\u7126\u4E8E\u6269\u5C55\u4E0E\u4F18\u5316\uFF1A\u914D\u7F6E\u5316\u67B6\u6784\u652F\u6301\uFF08\u52A8\u6001\u72B6\u6001\u6D41\u3001\u6A21\u677F\u914D\u7F6E\uFF09\u3001\u62A5\u8868\u4E0E\u6570\u636E\u53EF\u89C6\u5316\u3001\u9AD8\u7EA7 AI \u529F\u80FD\uFF08\u56FE\u7247\u5206\u6790\u3001\u8BED\u97F3\u8F93\u5165\uFF09\u3002\u9636\u6BB5\u56DB\uFF08\u7B2C 17\u201318 \u5468\uFF09\u8FDB\u884C\u7CFB\u7EDF\u6D4B\u8BD5\u3001\u7528\u6237\u57F9\u8BAD\u3001\u6B63\u5F0F\u4E0A\u7EBF\u3002"));

  // ── 7. AI \u8F85\u52A9\u5F00\u53D1\u7B56\u7565 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "7. AI \u8F85\u52A9\u5F00\u53D1\u7B56\u7565", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 7.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "7.1 \u56E2\u961F\u914D\u7F6E", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u89D2\u8272", "\u4EBA\u6570", "\u804C\u8D23", "AI \u8F85\u52A9\u65B9\u5F0F"],
    [
      ["\u4EA7\u54C1\u7ECF\u7406/\u4E1A\u52A1\u4E13\u5BB6", "1", "\u4E1A\u52A1\u6D41\u7A0B\u68B3\u7406\u3001\u9700\u6C42\u786E\u8BA4\u3001\u9A8C\u6536", "\u63D0\u4F9B\u6E05\u6670\u4E1A\u52A1\u63CF\u8FF0\uFF0C\u7531 AI \u751F\u6210 PRD \u548C\u63A5\u53E3\u5B9A\u4E49"],
      ["\u5168\u6808\u5F00\u53D1\u8005", "1\u20132", "\u524D\u540E\u7AEF\u5F00\u53D1\u3001\u6570\u636E\u5E93\u8BBE\u8BA1", "AI \u751F\u6210\u4EE3\u7801\u3001\u5355\u5143\u6D4B\u8BD5\u3001\u6587\u6863"],
      ["QA/\u6D4B\u8BD5", "0.5", "\u6D4B\u8BD5\u7528\u4F8B\u8BBE\u8BA1\u3001\u56DE\u5F52\u6D4B\u8BD5", "AI \u751F\u6210\u6D4B\u8BD5\u7528\u4F8B\uFF0C\u4EBA\u5DE5\u6267\u884C\u548C\u5224\u65AD"],
    ],
    [14, 6, 22, 30]
  ));

  // 7.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "7.2 AI \u8F85\u52A9\u5F00\u53D1\u7684\u6700\u4F73\u5B9E\u8DF5", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyParaBold("\u63A5\u53E3\u5951\u7EA6\u5148\u884C\uFF1A", "\u5728\u4EE3\u7801\u751F\u6210\u4E4B\u524D\uFF0C\u5148\u5B9A\u4E49\u6E05\u6670\u7684 API \u63A5\u53E3\u5951\u7EA6\uFF08\u8BF7\u6C42/\u54CD\u5E94\u7C7B\u578B\uFF09\u3002AI \u5728\u6709\u660E\u786E TypeScript \u63A5\u53E3\u5B9A\u4E49\u7684\u60C5\u51B5\u4E0B\u751F\u6210\u7684\u4EE3\u7801\u66F4\u51C6\u786E\uFF0C\u8FD9\u662F\u63D0\u5347 AI \u8F85\u52A9\u5F00\u53D1\u6548\u7387\u7684\u5173\u952E\u3002"));
  content.push(bodyParaBold("\u5C0F\u6B65\u9AA4\u3001\u9AD8\u9891\u7387\uFF1A", "\u6BCF\u6B21 AI \u4EA4\u4E92\u5E94\u8BE5\u662F\u4E00\u4E2A\u5C0F\u800C\u660E\u786E\u7684\u4EFB\u52A1\u3002\u4F8B\u5982\u201C\u521B\u5EFA\u6279\u6B21\u7BA1\u7406\u7684 Prisma Schema\u201D\u800C\u975E\u201C\u6784\u5EFA\u6574\u4E2A\u6279\u6B21\u6A21\u5757\u201D\u3002\u5C0F\u4EFB\u52A1\u53EF\u4EE5\u66F4\u5FEB\u5730\u9A8C\u8BC1\u548C\u7EA0\u9519\u3002"));
  content.push(bodyParaBold("\u4E1A\u52A1\u903B\u8F91\u7531\u4EBA\u7F16\u5199\uFF1A", "AI \u64C5\u957F\u751F\u6210\u6837\u677F\u4EE3\u7801\u548C\u57FA\u7840\u8BBE\u65BD\uFF0C\u4F46\u5BF9\u4E8E\u5173\u952E\u7684\u4E1A\u52A1\u903B\u8F91\uFF08\u72B6\u6001\u673A\u8F6C\u6362\u3001\u6821\u9A8C\u89C4\u5219\uFF09\u5E94\u8BE5\u7531\u4EBA\u7C7B\u7F16\u5199\u6216\u4ED4\u7EC6\u5BA1\u67E5\u3002\u4E1A\u52A1\u4E13\u5BB6\u5FC5\u987B\u7406\u89E3\u6BCF\u4E00\u884C\u751F\u6210\u4EE3\u7801\u7684\u542B\u4E49\u3002"));
  content.push(bodyParaBold("\u4EE3\u7801\u5BA1\u67E5\u4E0D\u53EF\u7701\u7565\uFF1A", "AI \u751F\u6210\u7684\u4EE3\u7801\u5FC5\u987B\u7ECF\u8FC7\u4EBA\u5DE5\u5BA1\u67E5\u3002\u91CD\u70B9\u5173\u6CE8\uFF1A\u4E1A\u52A1\u903B\u8F91\u7684\u6B63\u786E\u6027\u3001\u8FB9\u754C\u60C5\u51B5\u7684\u5904\u7406\u3001\u7C7B\u578B\u5B89\u5168\u6027\u3002\u4E0D\u80FD\u56E0\u4E3A\u4EE3\u7801\u80FD\u8DD1\u5C31\u76F4\u63A5\u5408\u5E76\u3002"));
  content.push(bodyParaBold("\u5148\u524D\u7AEF\u540E\u540E\u7AEF\u7684\u6D41\u6C34\u7EBF\uFF1A", "\u5148\u7528 Mock \u6570\u636E\u6784\u5EFA UI\uFF0C\u7136\u540E\u518D\u5B9E\u73B0 API Route\u3002\u8FD9\u6837\u53EF\u4EE5\u5C3D\u65E9\u83B7\u5F97\u53EF\u89C6\u5316\u53CD\u9988\uFF0C\u53CA\u65F6\u53D1\u73B0\u65B9\u5411\u504F\u5DEE\uFF0C\u907F\u514D\u5927\u91CF\u540E\u7AEF\u4EE3\u7801\u63A8\u5012\u91CD\u6765\u3002"));
  content.push(bodyParaBold("\u6D4B\u8BD5\u7B56\u7565\uFF1A", "AI \u53EF\u4EE5\u751F\u6210\u6D4B\u8BD5\u7528\u4F8B\uFF0C\u4F46\u6D4B\u8BD5\u8D28\u91CF\u548C\u8986\u76D6\u7387\u7684\u5224\u65AD\u4ECD\u9700\u8981\u4EBA\u7C7B\u667A\u6167\u3002\u5173\u952E\u4E1A\u52A1\u8DEF\u5F84\u7684\u6D4B\u8BD5\u5E94\u8BE5\u7531\u4EBA\u7C7B\u8BBE\u8BA1\uFF0CAI \u8F85\u52A9\u751F\u6210\u5177\u4F53\u5B9E\u73B0\u3002"));

  // 7.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "7.3 AI \u8F85\u52A9\u5F00\u53D1\u7684\u98CE\u9669\u4E0E\u5E94\u5BF9", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u98CE\u9669", "\u5F71\u54CD", "\u5E94\u5BF9\u63AA\u65BD"],
    [
      ["\u4E1A\u52A1\u903B\u8F91\u9519\u8BEF", "\u9AD8", "\u5173\u952E\u4E1A\u52A1\u903B\u8F91\u7531\u4EBA\u7F16\u5199\uFF0CAI \u8D1F\u8D23\u6837\u677F\u4EE3\u7801"],
      ["\u7C7B\u578B\u5B89\u5168\u5047\u8C61", "\u4E2D", "\u4E25\u683C TypeScript \u914D\u7F6E\uFF0C\u7981\u6B62 any"],
      ["\u4E0A\u4E0B\u6587\u4E22\u5931", "\u4E2D", "\u6BCF\u6B21\u4EA4\u4E92\u63D0\u4F9B\u5B8C\u6574\u4E0A\u4E0B\u6587"],
      ["\u8FC7\u5EA6\u4F9D\u8D56", "\u9AD8", "\u4E1A\u52A1\u4E13\u5BB6\u5FC5\u987B\u7406\u89E3\u751F\u6210\u4EE3\u7801\u7684\u6BCF\u4E00\u884C"],
    ],
    [16, 8, 38]
  ));

  // ── 8. \u98CE\u9669\u7BA1\u7406 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "8. \u98CE\u9669\u7BA1\u7406", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 8.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "8.1 \u9879\u76EE\u98CE\u9669\u77E9\u9635", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u98CE\u9669", "\u5F71\u54CD\u7A0B\u5EA6", "\u53D1\u751F\u6982\u7387", "\u5E94\u5BF9\u63AA\u65BD"],
    [
      ["\u9700\u6C42\u53D8\u66F4", "\u9AD8", "\u4E2D", "\u610F\u56FE\u5C42\u67B6\u6784\u5929\u7136\u652F\u6301\u6269\u5C55\uFF0C\u65B0\u529F\u80FD\u4F5C\u4E3A\u65B0\u610F\u56FE\u6DFB\u52A0"],
      ["AI \u80FD\u529B\u4E0D\u8FBE\u9884\u671F", "\u4E2D", "\u4E2D", "\u53CC\u6A21\u5F0F\u8BBE\u8BA1\u786E\u4FDD\u8868\u5355\u6A21\u5F0F\u59CB\u7EC8\u53EF\u7528"],
      ["\u6280\u672F\u96BE\u70B9", "\u4E2D", "\u4F4E", "\u72B6\u6001\u673A\u3001\u6821\u9A8C\u670D\u52A1\u7B49\u57FA\u7840\u8BBE\u65BD\u5DF2\u6709\u6210\u719F\u6A21\u5F0F"],
      ["\u56E2\u961F\u4EBA\u5458\u53D8\u52A8", "\u9AD8", "\u4F4E", "\u4E1A\u52A1\u4E13\u5BB6 + \u67B6\u6784\u6587\u6863\u786E\u4FDD\u77E5\u8BC6\u4F20\u9012"],
      ["LLM API \u4E0D\u53EF\u7528", "\u4F4E", "\u4E2D", "\u81EA\u52A8\u964D\u7EA7\u5230\u8868\u5355\u6A21\u5F0F\uFF0C\u7528\u6237\u65E0\u611F\u77E5"],
    ],
    [14, 10, 10, 28]
  ));

  // 8.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "8.2 \u98CE\u9669\u76D1\u63A7\u673A\u5236", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u9879\u76EE\u5C06\u5EFA\u7ACB\u53CC\u5468\u4F8B\u4F1A\u5BA1\u67E5\u673A\u5236\uFF0C\u7531\u4E1A\u52A1\u4E13\u5BB6\u548C\u5F00\u53D1\u56E2\u961F\u5171\u540C\u53C2\u4E0E\u3002\u98CE\u9669\u767B\u8BB0\u8868\u7EF4\u62A4\u5728\u9879\u76EE\u6587\u6863\u4E2D\uFF0C\u6BCF\u4E2A\u9636\u6BB5\u95E8\u7F1E\u8FDB\u884C\u67B6\u6784\u8BC4\u5BA1\uFF0C\u786E\u4FDD\u53CA\u65F6\u53D1\u73B0\u548C\u5E94\u5BF9\u6F5C\u5728\u98CE\u9669\u3002"));

  // ── 9. \u8D28\u91CF\u4FDD\u8BC1 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "9. \u8D28\u91CF\u4FDD\u8BC1", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 9.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "9.1 \u4EE3\u7801\u8D28\u91CF", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u9879\u76EE\u91C7\u7528 TypeScript \u4E25\u683C\u6A21\u5F0F\uFF0C\u7981\u6B62\u4F7F\u7528 any \u7C7B\u578B\u3002\u7EDF\u4E00\u4F7F\u7528 ESLint + Prettier \u8FDB\u884C\u4EE3\u7801\u683C\u5F0F\u5316\u3002AI \u751F\u6210\u7684\u4EE3\u7801\u5FC5\u987B\u7ECF\u8FC7\u4EBA\u5DE5\u5BA1\u67E5\u540E\u624D\u80FD\u5408\u5E76\u3002\u6240\u6709 API \u63A5\u53E3\u5FC5\u987B\u4EE5 TypeScript \u63A5\u53E3\u5B9A\u4E49\u7684\u5F62\u5F0F\u5728\u5B9E\u73B0\u4E4B\u524D\u5B8C\u6210\u3002"));

  // 9.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "9.2 \u6D4B\u8BD5\u7B56\u7565", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u72B6\u6001\u673A\u3001\u6821\u9A8C\u670D\u52A1\u3001\u610F\u56FE\u5C42\u7684\u5355\u5143\u6D4B\u8BD5\u7531\u4EBA\u7C7B\u7F16\u5199\uFF0C\u786E\u4FDD\u6838\u5FC3\u4E1A\u52A1\u903B\u8F91\u7684\u6B63\u786E\u6027\u3002\u5173\u952E\u4E1A\u52A1\u8DEF\u5F84\u7684\u96C6\u6210\u6D4B\u8BD5\u53EF\u7531 AI \u751F\u6210\u3001\u4EBA\u5DE5\u5BA1\u67E5\u3002\u5B8C\u6574\u7684\u6279\u6B21\u751F\u547D\u5468\u671F\u8FDB\u884C\u7AEF\u5230\u7AEF\u6D4B\u8BD5\u3002API \u54CD\u5E94\u65F6\u95F4\u8981\u6C42 95% \u7684\u8BF7\u6C42\u5728 500ms \u4EE5\u5185\u3002"));

  // 9.3
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "9.3 \u6587\u6863\u7BA1\u7406", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyPara("\u67B6\u6784\u6587\u6863\uFF08\u672C\u6587\u6863\uFF09\u8BB0\u5F55\u7CFB\u7EDF\u8BBE\u8BA1\u51B3\u7B56\u3002API \u6587\u6863\u4ECE TypeScript \u63A5\u53E3\u5B9A\u4E49\u81EA\u52A8\u751F\u6210\u3002\u6BCF\u4E2A\u9636\u6BB5\u4EA4\u4ED8\u524D\u521B\u5EFA\u7528\u6237\u64CD\u4F5C\u624B\u518C\u3002\u6BCF\u6B21\u610F\u56FE\u6216 Schema \u7684\u4FEE\u6539\u90FD\u8981\u8BB0\u5F55\u53D8\u66F4\u65E5\u5FD7\u3002"));

  // ── 10. \u9884\u671F\u6548\u679C\u4E0E\u8BC4\u4F30 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "10. \u9884\u671F\u6548\u679C\u4E0E\u8BC4\u4F30", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 10.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "10.1 \u6210\u529F\u6807\u51C6", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u6307\u6807", "MVP \u76EE\u6807", "\u6700\u7EC8\u76EE\u6807"],
    [
      ["\u6279\u6B21\u5168\u6D41\u7A0B\u6570\u5B57\u5316\u7387", "100%", "100%"],
      ["\u751F\u4EA7\u8BB0\u5F55\u5F55\u5165\u65F6\u95F4", "\u6BD4\u7EB8\u8D28\u51CF\u5C11 30%", "\u6BD4\u7EB8\u8D28\u51CF\u5C11 70%"],
      ["\u6570\u636E\u53EF\u8FFD\u6EAF\u7387", "100%", "100%"],
      ["\u7528\u6237\u6EE1\u610F\u5EA6", "\u226580%", "\u226590%"],
      ["AI \u5BF9\u8BDD\u6A21\u5F0F\u53EF\u7528\u6027", "N/A", "\u226590% \u5E38\u89C4\u573A\u666F\u53EF\u7528"],
      ["\u7CFB\u7EDF\u53EF\u7528\u6027", "\u226599%", "\u226599.9%"],
    ],
    [22, 22, 22]
  ));

  // 10.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "10.2 \u6838\u5FC3\u4EF7\u503C", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(bodyParaBold("\u77ED\u671F\uFF08MVP\uFF09\uFF1A", "\u66FF\u4EE3\u7EB8\u8D28\u8BB0\u5F55\uFF0C\u786E\u4FDD\u6570\u636E\u53EF\u8FFD\u6EAF\u6027\uFF0C\u6807\u51C6\u5316\u751F\u4EA7\u64CD\u4F5C\u6D41\u7A0B\u3002\u5B9E\u73B0\u4ECE\u539F\u6750\u6599\u63A5\u6536\u5230 CoA \u751F\u6210\u7684\u5168\u6D41\u7A0B\u6570\u5B57\u5316\u3002"));
  content.push(bodyParaBold("\u4E2D\u671F\uFF08AI \u96C6\u6210\uFF09\uFF1A", "\u901A\u8FC7 AI \u5BF9\u8BDD\u6A21\u5F0F\u51CF\u5C11 60% \u4EE5\u4E0A\u7684\u91CD\u590D\u6027\u6570\u636E\u5F55\u5165\uFF0C\u652F\u6301\u8BED\u97F3\u5F55\u5165\u5B9E\u73B0\u514D\u63D0\u64CD\u4F5C\uFF0C\u663E\u8457\u63D0\u5347\u5B9E\u9A8C\u4EBA\u5458\u7684\u5DE5\u4F5C\u6548\u7387\u3002"));
  content.push(bodyParaBold("\u957F\u671F\uFF1A", "\u57FA\u4E8E\u79EF\u7D2F\u7684\u6570\u636E\u8FDB\u884C\u6570\u636E\u9A71\u52A8\u7684\u8D28\u91CF\u6539\u8FDB\uFF0CAI \u8F85\u52A9\u7684\u5F02\u5E38\u68C0\u6D4B\uFF0C\u4EE5\u53CA\u9884\u6D4B\u6027\u751F\u4EA7\u8C03\u5EA6\u3002"));

  // ── 11. \u9644\u5F55 ──
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: "11. \u9644\u5F55", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  // 11.1
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "11.1 \u8BCD\u6C47\u8868", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u672F\u8BED", "\u82F1\u6587", "\u89E3\u91CA"],
    [
      ["iPSC", "Induced Pluripotent Stem Cell", "\u8BF1\u5BFC\u6027\u591A\u80FD\u5E72\u7EC6\u80DE"],
      ["eBPR", "Electronic Batch Production Record", "\u7535\u5B50\u6279\u751F\u4EA7\u8BB0\u5F55"],
      ["CoA", "Certificate of Analysis", "\u5206\u6790\u8BC1\u660E\u4E66"],
      ["LIMS", "Laboratory Information Management System", "\u5B9E\u9A8C\u5BA4\u4FE1\u606F\u7BA1\u7406\u7CFB\u7EDF"],
      ["Intent Layer", "Intent Layer", "\u64CD\u4F5C\u610F\u56FE\u5C42\uFF0C\u7EDF\u4E00\u62BD\u8C61\u7528\u6237\u64CD\u4F5C\u610F\u56FE"],
      ["State Machine", "State Machine", "\u72B6\u6001\u673A\uFF0C\u7BA1\u7406\u6279\u6B21\u72B6\u6001\u6D41\u8F6C"],
      ["RBAC", "Role-Based Access Control", "\u57FA\u4E8E\u89D2\u8272\u7684\u8BBF\u95EE\u63A7\u5236"],
    ],
    [12, 28, 32]
  ));

  // 11.2
  content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: "11.2 \u5173\u952E\u91CC\u7A0B\u7891\u6C47\u603B", size: 28, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })] }));

  content.push(spacer(60));
  content.push(makeTable(
    ["\u91CC\u7A0B\u7891", "\u65F6\u95F4\u8282\u70B9", "\u5B8C\u6210\u6807\u51C6"],
    [
      ["M1: \u57FA\u7840\u67B6\u6784\u5C31\u7EEA", "\u7B2C 2 \u5468\u672B", "\u8BA4\u8BC1\u3001\u72B6\u6001\u673A\u3001\u6821\u9A8C\u670D\u52A1\u539F\u578B\u53EF\u7528"],
      ["M2: \u6279\u6B21\u7BA1\u7406\u5B8C\u6210", "\u7B2C 4 \u5468\u672B", "\u80FD\u591F\u521B\u5EFA\u6279\u6B21\u5E76\u5B8C\u6210 eBPR \u5F55\u5165"],
      ["M3: \u8D28\u68C0 + CoA \u5B8C\u6210", "\u7B2C 6 \u5468\u672B", "\u8D28\u68C0\u5168\u6D41\u7A0B + \u81EA\u52A8\u751F\u6210 CoA"],
      ["M4: MVP \u4EA4\u4ED8", "\u7B2C 8 \u5468\u672B", "\u5168\u6D41\u7A0B\u8D2F\u901A\uFF0C\u5185\u90E8\u6F14\u793A\u901A\u8FC7"],
      ["M5: AI \u5BF9\u8BDD\u53EF\u7528", "\u7B2C 12 \u5468\u672B", "\u5BF9\u8BDD\u6A21\u5F0F\u53EF\u5B8C\u6210\u57FA\u672C\u751F\u4EA7\u8BB0\u5F55\u5F55\u5165"],
      ["M6: \u5168\u529F\u80FD\u4EA4\u4ED8", "\u7B2C 16 \u5468\u672B", "\u6240\u6709\u8BA1\u5212\u529F\u80FD\u5F00\u53D1\u5B8C\u6210"],
      ["M7: \u6B63\u5F0F\u4E0A\u7EBF", "\u7B2C 18 \u5468\u672B", "\u901A\u8FC7\u9A8C\u6536\uFF0C\u751F\u4EA7\u73AF\u5883\u90E8\u7F72"],
    ],
    [18, 14, 40]
  ));

  return content;
}

// ═══════════════════════════════════════════════════════════════
// TOC SECTION
// ═══════════════════════════════════════════════════════════════
function buildTocSection() {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 240, line: 312 },
      children: [new TextRun({ text: "\u76EE\u5F55", size: 32, bold: true, color: "000000", font: { eastAsia: "SimHei", ascii: "Times New Roman" } })],
    }),
    new TableOfContents("\u76EE\u5F55", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
  ];
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  const outputPath = "/home/z/my-project/upload/iPSC\u751F\u4EA7\u7BA1\u7406\u7CFB\u7EDF_\u5F00\u53D1\u8BA1\u5212_\u878D\u5408\u7248.docx";

  const coverConfig = {
    title: "iPSC\u751F\u4EA7\u7BA1\u7406\u7CFB\u7EDF",
    subtitle: "\u5F00\u53D1\u8BA1\u5212\uFF08\u878D\u5408\u7248\uFF09",
    metaLines: [
      "\u6587\u6863\u7248\u672C\uFF1Av1.0",
      "\u7F16\u5236\u65E5\u671F\uFF1A2026\u5E744\u6708",
      "\u72B6\u6001\uFF1A\u5F85\u786E\u8BA4",
    ],
    footerLeft: "\u673A\u5BC6\u6587\u4EF6",
    footerRight: "\u4EC5\u9650\u5185\u90E8\u4F7F\u7528",
  };

  const coverChildren = buildCoverR4(coverConfig);
  const tocChildren = buildTocSection();
  const bodyChildren = buildBody();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: "Calibri", eastAsia: "SimSun" },
            size: 24,
            color: "000000",
          },
          paragraph: {
            spacing: { line: 312 },
          },
        },
        heading1: {
          run: {
            font: { ascii: "Times New Roman", eastAsia: "SimHei" },
            size: 32,
            bold: true,
            color: "000000",
          },
          paragraph: { spacing: { before: 360, after: 160, line: 312 } },
        },
        heading2: {
          run: {
            font: { ascii: "Times New Roman", eastAsia: "SimHei" },
            size: 28,
            bold: true,
            color: "000000",
          },
          paragraph: { spacing: { before: 240, after: 120, line: 312 } },
        },
        heading3: {
          run: {
            font: { ascii: "Times New Roman", eastAsia: "SimHei" },
            size: 24,
            bold: true,
            color: "000000",
          },
          paragraph: { spacing: { before: 200, after: 100, line: 312 } },
        },
      },
    },
    sections: [
      // Section 1: Cover — no page number, margin 0
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: coverChildren,
      },
      // Section 2: TOC — Roman numeral page numbering
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888", font: { ascii: "Calibri" } }),
                ],
              }),
            ],
          }),
        },
        children: tocChildren,
      },
      // Section 3: Body — Arabic page numbering starting at 1
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "iPSC\u751F\u4EA7\u7BA1\u7406\u7CFB\u7EDF \u5F00\u53D1\u8BA1\u5212", size: 18, color: "888888", font: { ascii: "Calibri", eastAsia: "SimSun" } }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888", font: { ascii: "Calibri" } }),
                ],
              }),
            ],
          }),
        },
        children: bodyChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log("Document generated successfully: " + outputPath);
}

main().catch(err => { console.error(err); process.exit(1); });
