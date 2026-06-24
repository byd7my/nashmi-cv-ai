/**
 * Full-layout Arabic PDF scan — mirrors splitRow/columns used in production.
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
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;

function isArabicWord(token) {
  return ARABIC_RE.test(token) && !LATIN_WORD_RE.test(token);
}

function prepareArabicLine(text) {
  const clean = sanitizeArabicPdfText(text);
  if (!clean) return "";
  if (!ARABIC_RE.test(clean)) return clean;
  const tokens = clean.split(/\s+/).filter(Boolean);
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
  return out.join(" ");
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

function scanBufferForBidi(buf) {
  const patterns = [
    ["LRM", [0xe2, 0x80, 0x8e]],
    ["RLM", [0xe2, 0x80, 0x8f]],
    ["ALM", [0xd8, 0x9c]],
    ["LRI", [0xe2, 0x81, 0xa6]],
    ["PDI", [0xe2, 0x81, 0xa9]],
    ["ZWSP", [0xe2, 0x80, 0x8b]],
  ];
  const hits = [];
  for (const [label, bytes] of patterns) {
    let count = 0;
    outer: for (let i = 0; i <= buf.length - bytes.length; i += 1) {
      for (let j = 0; j < bytes.length; j += 1) {
        if (buf[i + j] !== bytes[j]) continue outer;
      }
      count += 1;
    }
    if (count) hits.push(`${label}:${count}`);
  }
  return hits;
}

async function main() {
  const urls = [
    "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf",
    "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf",
  ];
  const [regular, bold] = await Promise.all(urls.map(loadBinaryFont));
  pdfMake.addVirtualFileSystem({
    "reg.ttf": regular,
    "bold.ttf": bold,
  });
  pdfMake.addFonts({
    NotoSansArabic: {
      normal: "reg.ttf",
      bold: "bold.ttf",
      italics: "reg.ttf",
      bolditalics: "bold.ttf",
    },
  });

  const bullet =
    "تقديم الدعم الفني للمستخدمين عبر Windows 10/11 و Microsoft 365 وحل مشكلات الشبكة والاتصال";
  const summary =
    "فني دعم IT بخبرة 7 أشهر في Windows Server و Microsoft Active Directory و Cisco مع نسبة رضا 95%+";

  const doc = {
    pageSize: "A4",
    pageMargins: [51.4, 30, 51.4, 20],
    defaultStyle: {
      font: "NotoSansArabic",
      fontSize: 7.5,
      lineHeight: 1.02,
      alignment: "right",
    },
    content: [
      { text: prepareArabicLine("عبدالرحمن صالح الخليفه"), style: "name" },
      {
        columns: [
          {
            text: prepareArabicLine("أكتوبر 2025 - ديسمبر 2025"),
            width: 112,
            alignment: "left",
            fontSize: 7.5,
          },
          {
            text: prepareArabicLine("فني مكتب المساعدة - شركة XYZ | الرياض"),
            width: "*",
            alignment: "right",
            bold: true,
            fontSize: 7.5,
          },
        ],
        columnGap: 6,
      },
      { text: `- ${prepareArabicLine(bullet)}`, margin: [0, 2, 0, 0] },
      { text: prepareArabicLine(summary), margin: [0, 8, 0, 0] },
      {
        text: prepareArabicLine("Active Directory") + " | " + prepareArabicLine("Cisco Packet Tracer") + " | VPN",
        margin: [0, 8, 0, 0],
      },
    ],
    styles: {
      name: { fontSize: 16, bold: true, alignment: "center" },
    },
  };

  const buffer = await pdfMake.createPdf(doc).getBuffer();
  const out = path.join(__dirname, "..", "tmp-ar-full-layout.pdf");
  fs.writeFileSync(out, buffer);
  console.log("Bidi hits:", scanBufferForBidi(buffer).join(", ") || "none");
  console.log("Saved:", out);
}

main();
