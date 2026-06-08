import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const App = lazy(() => import("@/nashmi/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nashmi — AI Resume Builder" },
      { name: "description", content: "Build an ATS-friendly resume with AI in Arabic or English." },
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
