/**
 * Quick check: Arabic text prep + PDF text extraction for sample CV fields.
 * Run: node scripts/verify-ar-pdf-text.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdfMake from "pdfmake/build/pdfmake.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOTO_SANS_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@5.2.5/latin-400-normal.ttf";
const NOTO_SANS_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@5.2.5/latin-700-normal.ttf";
const NOTO_SANS_ARABIC_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-arabic@5.2.5/arabic-400-normal.ttf";
const NOTO_SANS_ARABIC_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-arabic@5.2.5/arabic-700-normal.ttf";

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;

function sanitizePdfText(text) {
  return text
    .replace(/[\u2013\u2014\u2212\u2010\u2011]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function reverseArabicRun(words) {
  if (words.length <= 1) return words.join(" ");
  return [...words].reverse().join(" ");
}

function arText(text) {
  const clean = sanitizePdfText(text);
  if (!clean) return "";
  if (!ARABIC_RE.test(clean)) return clean;
  if (LATIN_WORD_RE.test(clean)) return clean;
  return reverseArabicRun(clean.split(/\s+/));
}

function sideText(text) {
  const clean = sanitizePdfText(text);
  if (!clean) return "";
  if (ARABIC_RE.test(clean)) return arText(clean);
  return clean;
}

function mixedLine(text, bold = false) {
  const clean = sanitizePdfText(text);
  if (!clean) return "";
  if (!ARABIC_RE.test(clean) || !LATIN_WORD_RE.test(clean)) {
    return bold ? { text: arText(clean), bold: true } : arText(clean);
  }
  const words = clean.split(/\s+/);
  const inlines = [];
  let arabicRun = [];
  const flushArabic = () => {
    if (!arabicRun.length) return;
    inlines.push({
      text: reverseArabicRun(arabicRun),
      font: "NotoSansArabic",
      ...(bold ? { bold: true } : {}),
    });
    arabicRun = [];
  };
  for (const word of words) {
    if (LATIN_WORD_RE.test(word) && !ARABIC_RE.test(word)) {
      flushArabic();
      inlines.push({ text: word, font: "NotoSans", ...(bold ? { bold: true } : {}) });
    } else {
      arabicRun.push(word);
    }
  }
  flushArabic();
  if (inlines.length === 1) return inlines[0];
  return { text: inlines.map((node, i) => (i > 0 ? [{ text: " " }, node] : node)).flat() };
}

async function loadBinaryFont(url) {
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function setupPdfMake() {
  const [enRegular, enBold, arRegular, arBold] = await Promise.all([
    loadBinaryFont(NOTO_SANS_REGULAR),
    loadBinaryFont(NOTO_SANS_BOLD),
    loadBinaryFont(NOTO_SANS_ARABIC_REGULAR),
    loadBinaryFont(NOTO_SANS_ARABIC_BOLD),
  ]);
  pdfMake.addVirtualFileSystem({
    "NotoSans-Regular.ttf": enRegular,
    "NotoSans-Bold.ttf": enBold,
    "NotoSansArabic-Regular.ttf": arRegular,
    "NotoSansArabic-Bold.ttf": arBold,
  });
  pdfMake.addFonts({
    NotoSansArabic: {
      normal: "NotoSansArabic-Regular.ttf",
      bold: "NotoSansArabic-Bold.ttf",
      italics: "NotoSansArabic-Regular.ttf",
      bolditalics: "NotoSansArabic-Bold.ttf",
    },
    NotoSans: {
      normal: "NotoSans-Regular.ttf",
      bold: "NotoSans-Bold.ttf",
      italics: "NotoSans-Regular.ttf",
      bolditalics: "NotoSans-Bold.ttf",
    },
  });
}

const samples = {
  name: "عبدالرحمن صالح الخليفه",
  title: "فني شبكات",
  section: "الشهادات والدورات",
  date: "أكتوبر 2025 - ديسمبر 2025",
  bullet: "تثبيت وتكوين Microsoft Windows Server",
  edu: "كلية تقنية | المملكة العربية السعودية",
};

function normalizeExtracted(text) {
  return text.replace(/\s+/g, " ").trim();
}

function includesPhrase(haystack, needle) {
  return normalizeExtracted(haystack).includes(normalizeExtracted(needle));
}

async function extractPdfText(buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return out;
}

async function main() {
  console.log("=== Text prep (pdfmake input) ===");
  console.log("name:", arText(samples.name));
  console.log("section:", arText(samples.section));
  console.log("date:", sideText(samples.date));
  console.log("bullet:", JSON.stringify(mixedLine(samples.bullet)));

  await setupPdfMake();

  const doc = {
    defaultStyle: { font: "NotoSansArabic", fontSize: 11 },
    content: [
      { text: arText(samples.name), alignment: "center", bold: true, margin: [0, 0, 0, 8] },
      { text: arText(samples.title), alignment: "center", margin: [0, 0, 0, 8] },
      { text: arText(samples.section), alignment: "right", margin: [0, 0, 0, 8] },
      { text: sideText(samples.date), font: "NotoSans", alignment: "left", margin: [0, 0, 0, 8] },
      { text: mixedLine(samples.bullet), alignment: "right", margin: [0, 0, 0, 8] },
      { text: arText(samples.edu), alignment: "right" },
    ],
  };

  const buffer = await pdfMake.createPdf(doc).getBuffer();
  const outPath = path.join(__dirname, "..", "tmp-ar-verify.pdf");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);

  const extracted = await extractPdfText(buffer);
  console.log("\n=== Extracted PDF text ===");
  console.log(extracted);

  const checks = [
    ["name", includesPhrase(extracted, samples.name)],
    ["title", includesPhrase(extracted, samples.title)],
    ["section", includesPhrase(extracted, samples.section)],
    ["date months", includesPhrase(extracted, "2025") && includesPhrase(extracted, "أكتوبر")],
    ["bullet Arabic", includesPhrase(extracted, "تثبيت")],
    ["bullet English", includesPhrase(extracted, "Microsoft")],
    ["education", includesPhrase(extracted, "كلية")],
  ];

  console.log("\n=== Verification ===");
  let ok = true;
  for (const [label, pass] of checks) {
    console.log(`${pass ? "OK" : "FAIL"}: ${label}`);
    if (!pass) ok = false;
  }

  if (!ok) process.exit(1);
  console.log("\nAll checks passed. PDF saved to", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
