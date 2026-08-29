import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false, logout: vi.fn(), user: null }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: unknown; href: string }) => createElement("a", { ...props, href }, children),
  useLocation: () => ["/auth", vi.fn()],
}));

import Auth from "@/pages/Auth";

Object.assign(globalThis, { React });

function maximumAnchorDepth(markup: string) {
  let depth = 0;
  let maximumDepth = 0;

  for (const tag of markup.matchAll(/<\/?a\b[^>]*>/gi)) {
    if (tag[0].startsWith("</")) {
      depth -= 1;
    } else {
      depth += 1;
      maximumDepth = Math.max(maximumDepth, depth);
    }
  }

  return maximumDepth;
}

describe("CampusWear authentication page markup", () => {
  it("renders navigation anchors without nesting the linked brand mark", () => {
    const markup = renderToStaticMarkup(createElement(Auth));

    expect(maximumAnchorDepth(markup)).toBe(1);
    expect(markup).toContain('href="/"');
  });
});
