import { createFileRoute } from "@tanstack/react-router";
import { JobsBotPage } from "@/nashmi/pages/JobsBotPage";
import { useLang } from "@/nashmi/hooks/useLang";
import { TR } from "@/nashmi/lib/translations";

export const Route = createFileRoute("/jobs-bot")({
  head: () => ({
    meta: [
      { title: "بوت التقديم التلقائي — نشمي" },
      {
        name: "description",
        content:
          "بوت تيليجرام من نشمي يقدّم على الوظائف المناسبة تلقائياً من بريدك مع خطاب تقديم مخصص بالذكاء الاصطناعي.",
      },
      { property: "og:title", content: "بوت التقديم التلقائي — نشمي" },
      {
        property: "og:description",
        content: "وأنت نايم… نشمي يقدّم عنك. فعّل البوت على تيليجرام وابدأ التقديم التلقائي.",
      },
    ],
    links: [{ rel: "canonical", href: "/jobs-bot" }],
  }),
  component: JobsBotRoute,
});

function navFromJobsBot(dest: string) {
  if (dest === "landing") window.location.href = "/";
  else if (dest === "jobs-bot") window.location.href = "/jobs-bot";
  else if (dest === "blog") window.location.href = "/blog";
  else if (dest === "builder") window.location.href = "/#/builder";
  else window.location.href = `/#/${dest}`;
}

function JobsBotRoute() {
  const { lang, toggle } = useLang();
  const t = TR[lang];

  return (
    <JobsBotPage
      lang={lang}
      t={t}
      onLangToggle={toggle}
      onNav={navFromJobsBot}
    />
  );
}
