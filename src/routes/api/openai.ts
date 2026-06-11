import { createFileRoute } from "@tanstack/react-router";

import { handleOpenAIRequest } from "../../../lib/openai-api.server";

export const Route = createFileRoute("/api/openai")({
  server: {
    handlers: {
      POST: ({ request }) => handleOpenAIRequest(request),
    },
  },
});
