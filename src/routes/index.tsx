import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { TR } from "@/nashmi/lib/translations";

const App = lazy(() => import("@/nashmi/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TR.ar.siteTitle },
      { name: "description", content: TR.ar.siteDescription },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#0A0A0B" }} />;
  }
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0A0B" }} />}>
      <App />
    </Suspense>
  );
}
