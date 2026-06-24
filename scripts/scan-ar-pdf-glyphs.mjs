/**
 * Generate Arabic PDF with production-like settings and scan for invisible
 * bidi/control chars that show as empty boxes (tofu) in PDF viewers.
 * Run: node scripts/scan-ar-pdf-glyphs.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdfMake from "pdfmake/build/pdfmake.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BIDI_CONTROL_RE =
  /[\u200E\u200F\u061C\u2066-\u2069\u202A-\u202E\uFEFF\u200B-\u200D\u2060\u180E]/g;

function sanitizeArabicPdfText(text) {
  return text
    .replace(BIDI_CONTROL_RE, "")
    .replace(/[\u2013\u2014\u2212\u2010\u2011]/g, "-")
    .replace(/[\u00B7\u2022\u2023\u25CF\u25E6\u2027]/g, "|")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;

function isArabicWord(token) {
  return ARABIC_RE.test(token) && !LATIN_WORD_RE.test(token);
}

function applyWordOrderFix(tokens) {
  const out = [...tokens];
  let i = 0;
  while (i < out.length) {
    if (!isArabicWord(out[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < out.length && isArabicWord(out[j])) j += 1;
    const group = out.slice(i, j);
    if (group.length > 1) {
      const fixed = [...group].reverse();
      for (let k = 0; k < fixed.length; k += 1) out[i + k] = fixed[k];
    }
    i = j;
  }
  return out;
}

function prepareArabicLine(text) {
  const clean = sanitizeArabicPdfText(text);
  if (!clean) return "";
  if (!ARABIC_RE.test(clean)) return clean;
  return applyWordOrderFix(clean.split(/\s+/).filter(Boolean)).join(" ");
}

async function loadBinaryFont(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return btoa(binary);
}

const NOTO_ARABIC_REGULAR =
  "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf";
const NOTO_ARABIC_BOLD =
  "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf";

const MIXED_SAMPLES = [
  "خبرة في Windows 10/11 و Microsoft 365 و Active Directory",
  "إدارة شبكات Cisco وتقليل وقت إعداد الأجهزة بنسبة 95%+",
  "تثبيت وتكوين Microsoft Windows Server",
  "أكتوبر 2025 - ديسمبر 2025",
  "Windows Server | VPN | DNS",
];

function scanBufferForBidi(buf) {
  const hits = [];
  const patterns = [
    ["LRM U+200E", [0xe2, 0x80, 0x8e]],
    ["RLM U+200F", [0xe2, 0x80, 0x8f]],
    ["ALM U+061C", [0xd8, 0x9c]],
    ["LRI U+2066", [0xe2, 0x81, 0xa6]],
    ["PDI U+2069", [0xe2, 0x81, 0xa9]],
    ["ZWSP U+200B", [0xe2, 0x80, 0x8b]],
    ["ZWNJ U+200C", [0xe2, 0x80, 0x8c]],
    ["ZWJ U+200D", [0xe2, 0x80, 0x8d]],
    ["BOM U+FEFF", [0xef, 0xbb, 0xbf]],
  ];

  for (const [label, bytes] of patterns) {
    let count = 0;
    outer: for (let i = 0; i <= buf.length - bytes.length; i += 1) {
      for (let j = 0; j < bytes.length; j += 1) {
        if (buf[i + j] !== bytes[j]) continue outer;
      }
      count += 1;
    }
    if (count > 0) hits.push({ label, count });
  }
  return hits;
}

async function main() {
  const [regular, bold] = await Promise.all([
    loadBinaryFont(NOTO_ARABIC_REGULAR),
    loadBinaryFont(NOTO_ARABIC_BOLD),
  ]);

  pdfMake.addVirtualFileSystem({
    "nashmi-noto-arabic-regular.ttf": regular,
    "nashmi-noto-arabic-bold.ttf": bold,
  });
  pdfMake.addFonts({
    NotoSansArabic: {
      normal: "nashmi-noto-arabic-regular.ttf",
      bold: "nashmi-noto-arabic-bold.ttf",
      italics: "nashmi-noto-arabic-regular.ttf",
      bolditalics: "nashmi-noto-arabic-bold.ttf",
    },
  });

  const content = MIXED_SAMPLES.map((line) => ({
    text: prepareArabicLine(line),
    alignment: "right",
    margin: [0, 0, 0, 6],
  }));

  const doc = {
    pageSize: "A4",
    defaultStyle: { font: "NotoSansArabic", fontSize: 10, alignment: "right" },
    content,
  };

  const buffer = await pdfMake.createPdf(doc).getBuffer();
  const outPath = path.join(__dirname, "..", "tmp-ar-glyph-scan.pdf");
  fs.writeFileSync(outPath, buffer);

  const hits = scanBufferForBidi(buffer);
  console.log("Prepared lines:");
  for (const line of MIXED_SAMPLES) {
    console.log(" ", prepareArabicLine(line));
  }
  console.log("\nBidi/control bytes in PDF stream:");
  if (hits.length === 0) {
    console.log("  none found");
  } else {
    for (const h of hits) console.log(`  ${h.label}: ${h.count}`);
  }
  console.log("\nSaved:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
