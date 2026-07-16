#!/usr/bin/env bash
# Manual smoke test for POST /api/generate-cv.
#
# Usage:
#   INTERNAL_API_KEY=... BASE_URL=http://localhost:3000 ./scripts/test-generate-cv.sh
#
# BASE_URL defaults to http://localhost:3000 (e.g. `vercel dev`).
# INTERNAL_API_KEY must match the value the function reads from the
# environment — never hardcode it here or commit a real value.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ -z "${INTERNAL_API_KEY:-}" ]; then
  echo "Set INTERNAL_API_KEY before running this script (see .env.local)." >&2
  exit 1
fi

echo "== Arabic CV =="
curl -sS -D - -o /tmp/nashmi-test-ar.pdf \
  -X POST "$BASE_URL/api/generate-cv" \
  -H "Content-Type: application/json" \
  -H "x-internal-key: $INTERNAL_API_KEY" \
  -d '{
    "language": "ar",
    "fullName": "أحمد سالم الغامدي",
    "jobTitle": "مهندس شبكات",
    "phone": "+966501234567",
    "email": "ahmed@example.com",
    "location": "الرياض، السعودية",
    "linkedin": "linkedin.com/in/ahmedsalem",
    "summary": "مهندس شبكات بخبرة 5 سنوات في تصميم وإدارة شبكات المؤسسات الكبرى، بما في ذلك أنظمة Windows Server وCisco.",
    "experience": [
      {
        "jobTitle": "مهندس شبكات أول",
        "company": "شركة الاتصالات السعودية",
        "location": "الرياض",
        "startDate": "يناير 2021",
        "endDate": "الحاضر",
        "bullets": [
          "إدارة أكثر من 200 جهاز Cisco عبر 15 فرعاً",
          "تحسين أداء الشبكة بنسبة 30% باستخدام Windows Server 2019"
        ]
      }
    ],
    "education": [
      { "institution": "جامعة الملك سعود", "degree": "بكالوريوس هندسة شبكات", "year": "2020", "gpa": "3.8" }
    ],
    "certifications": [{ "name": "CCNA", "issuer": "Cisco", "year": "2021" }],
    "skills": ["Cisco", "Windows Server", "TCP/IP", "Firewall"],
    "languages": ["العربية (اللغة الأم)", "الإنجليزية (متقدم)"]
  }'
echo "Saved to /tmp/nashmi-test-ar.pdf"
echo

echo "== English CV =="
curl -sS -D - -o /tmp/nashmi-test-en.pdf \
  -X POST "$BASE_URL/api/generate-cv" \
  -H "Content-Type: application/json" \
  -H "x-internal-key: $INTERNAL_API_KEY" \
  -d '{
    "language": "en",
    "fullName": "John Smith",
    "jobTitle": "Network Engineer",
    "phone": "+1 555 123 4567",
    "email": "john@example.com",
    "location": "Austin, TX",
    "linkedin": "linkedin.com/in/johnsmith",
    "summary": "Network engineer with 5 years of experience designing and managing enterprise networks.",
    "experience": [
      {
        "jobTitle": "Senior Network Engineer",
        "company": "Acme Telecom",
        "location": "Austin, TX",
        "startDate": "Jan 2021",
        "endDate": "Present",
        "bullets": [
          "Managed 200+ Cisco devices across 15 branches",
          "Improved network performance by 30% using Windows Server 2019"
        ]
      }
    ],
    "education": [
      { "institution": "University of Texas", "degree": "BSc Network Engineering", "year": "2020", "gpa": "3.8" }
    ],
    "certifications": [{ "name": "CCNA", "issuer": "Cisco", "year": "2021" }],
    "skills": ["Cisco", "Windows Server", "TCP/IP", "Firewall"],
    "languages": ["English (native)", "Arabic (intermediate)"]
  }'
echo "Saved to /tmp/nashmi-test-en.pdf"
