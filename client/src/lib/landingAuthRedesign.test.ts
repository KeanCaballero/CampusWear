import { readFileSync } from "node:fs";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false, logout: vi.fn(), user: null }),
}));

vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: null }));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: unknown; href: string }) => createElement("a", { ...props, href }, children),
  useLocation: () => ["/", vi.fn()],
}));

const { default: Home } = await import("@/pages/Home");
const { default: Auth } = await import("@/pages/Auth");
const { WorkspaceGate } = await import("@/components/campuswear/WorkspaceGate");

Object.assign(globalThis, { React });

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const landing = renderToStaticMarkup(createElement(Home));
const auth = renderToStaticMarkup(createElement(Auth));
const gate = renderToStaticMarkup(createElement(WorkspaceGate, { allowedRoles: ["vendor_staff"], children: "SECRET WORKSPACE" }));

/** Strip tags so copy assertions read the words a visitor sees, not the markup around them. */
const text = (markup: string) => markup.replace(/<[^>]*>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]*)"/g)].map(match => match[1]);
const headingOrder = (markup: string) => [...markup.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1]));

function maximumAnchorDepth(markup: string) {
  let depth = 0;
  let maximumDepth = 0;
  for (const tag of markup.matchAll(/<\/?a\b[^>]*>/gi)) {
    if (tag[0].startsWith("</")) depth -= 1;
    else { depth += 1; maximumDepth = Math.max(maximumDepth, depth); }
  }
  return maximumDepth;
}

// =============================================================================================
describe("landing page", () => {
  it("renders", () => {
    expect(landing.length).toBeGreaterThan(2000);
  });

  it("identifies the university and the product in the first screen", () => {
    expect(text(landing)).toContain("University of Cebu");
    expect(text(landing)).toContain("CampusWear");
    expect(text(landing)).toContain("Your Uniform.");
    expect(text(landing)).toContain("Your Identity.");
  });

  it("states the real core message", () => {
    expect(text(landing)).toContain("check availability, order for");
    expect(text(landing)).toContain("track your order in one place");
  });

  it("points every call to action at a route that exists", () => {
    const real = ["/", "/shop", "/auth", "/orders", "/announcements", "/vendor/apply", "#how-it-works"];
    for (const href of hrefs(landing)) {
      expect(real, `unexpected destination ${href}`).toContain(href);
    }
    for (const required of ["/shop", "/auth", "/vendor/apply", "/announcements"]) {
      expect(hrefs(landing)).toContain(required);
    }
  });

  it("has the how-it-works anchor its own nav link targets", () => {
    expect(hrefs(landing)).toContain("#how-it-works");
    expect(landing).toContain('id="how-it-works"');
  });

  it("invents no metrics — no counts, percentages, ratings or money", () => {
    const body = text(landing);
    expect(body).not.toMatch(/\b\d[\d,]*\+?\s*(students|orders|vendors|schools|universities|users|downloads)\b/i);
    expect(body).not.toMatch(/\b\d+(\.\d+)?\s*%/);
    expect(body).not.toMatch(/\b\d+(\.\d+)?\s*(\/\s*5|stars?)\b/i);
    expect(body).not.toMatch(/₱\s?\d/);
  });

  it("invents no social proof", () => {
    const body = text(landing).toLowerCase();
    for (const claim of ["testimonial", "trusted by", "loved by", "our partners", "as featured in", "award-winning", "rated"]) {
      expect(body, claim).not.toContain(claim);
    }
  });

  it("invents no university claims beyond the one campus CampusWear serves", () => {
    const body = text(landing);
    // Only University of Cebu is named. No other campus, and no claim of a network of them.
    expect(body).not.toMatch(/universit(y|ies) of (?!Cebu)/i);
    expect(body).not.toMatch(/\b(nationwide|all over the philippines|every campus|\d+ campuses)\b/i);
  });

  it("never claims pickup verification works offline", () => {
    const body = text(landing).toLowerCase();
    expect(body).not.toContain("pickup works offline");
    expect(body).not.toMatch(/verif\w* (works )?offline/);
    // It may promise the saved image opens offline, because that part is true.
    expect(body).toContain("still open with no connection");
  });

  it("keeps one h1 and no skipped heading levels", () => {
    const levels = headingOrder(landing);
    expect(levels.filter(level => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (let index = 1; index < levels.length; index++) {
      expect(levels[index] - levels[index - 1], `jump at ${index}`).toBeLessThanOrEqual(1);
    }
  });

  it("nests no anchors", () => {
    expect(maximumAnchorDepth(landing)).toBe(1);
  });

  it("labels the mobile menu control and reports its state", () => {
    expect(landing).toContain('aria-expanded="false"');
    expect(landing).toMatch(/aria-label="Open menu"/);
    expect(landing).toContain('aria-controls="public-nav-menu"');
  });

  it("hides decorative marks and icons from screen readers", () => {
    // Every svg on the page is either labelled or explicitly hidden; none is left ambiguous.
    for (const svg of landing.match(/<svg[^>]*>/g) ?? []) {
      expect(svg, svg).toMatch(/aria-hidden="true"|aria-label=/);
    }
  });
});

// =============================================================================================
describe("authentication screens", () => {
  it("renders sign in by default", () => {
    expect(text(auth)).toContain("Sign in to your account.");
    expect(text(auth)).toContain("Sign in to your University of Cebu CampusWear account.");
  });

  it("offers create account, forgot password and a fresh confirmation email", () => {
    const body = text(auth);
    expect(body).toContain("Create an account");
    expect(body).toContain("Forgot password?");
    expect(body).toContain("Need a new confirmation email?");
  });

  it("keeps the vendor application distinct from ordinary account entry", () => {
    expect(text(auth)).toContain("Vendor registration is a separate application and approval process.");
    expect(hrefs(auth)).toContain("/vendor/apply");
  });

  it("gives every field a real label bound to its control", () => {
    // Wrapping labels for the plain fields, htmlFor for the ones with a trailing reveal button.
    expect(auth).toMatch(/<label[^>]*>Email address<input/);
    expect(auth).toContain('for="campuswear-password"');
    expect(auth).toContain('id="campuswear-password"');
  });

  it("labels the password reveal control and reports its state", () => {
    expect(auth).toContain('aria-label="Show password"');
    expect(auth).toContain('aria-pressed="false"');
  });

  it("keeps every control at 44px or more", () => {
    // The auth touch-target fix is load-bearing; a redesign must not quietly shrink it back.
    const controls = auth.match(/<(?:button|input)[^>]*class="([^"]*)"/g) ?? [];
    expect(controls.length).toBeGreaterThan(3);
    for (const control of controls) {
      expect(control, control.slice(0, 120)).toMatch(/min-h-1[12]|h-1[12]|size-1[12]|w-11/);
    }
  });

  it("nests no anchors and can always get back to the landing page", () => {
    expect(maximumAnchorDepth(auth)).toBe(1);
    expect(hrefs(auth)).toContain("/");
  });

  it("keeps a single h1", () => {
    expect(headingOrder(auth).filter(level => level === 1)).toHaveLength(1);
  });

  it("shares one shell across sign in, recovery, reset and confirmation", () => {
    for (const page of ["../pages/Auth.tsx", "../pages/PasswordReset.tsx", "../pages/ConfirmedAccount.tsx"]) {
      expect(code(page), page).toContain("<AuthLayout>");
    }
  });
});

// =============================================================================================
describe("authentication logic is untouched by the redesign", () => {
  const auth = code("../pages/Auth.tsx");
  const reset = code("../pages/PasswordReset.tsx");

  it("still calls exactly the Supabase methods it always did", () => {
    expect([...auth.matchAll(/supabase\.auth\.(\w+)/g)].map(match => match[1]).sort()).toEqual([
      "resend", "resend", "resetPasswordForEmail", "signInWithPassword", "signUp",
    ]);
    expect(reset).toContain("supabase.auth.updateUser");
  });

  it("invents no registration field the signup flow does not support", () => {
    // The reference design showed a Student ID and a forced @uc.edu.ph suffix. Neither exists in
    // the real flow, so neither is collected here.
    for (const invented of ["studentId", "Student ID", "uc.edu.ph", "rememberMe", "Remember me"]) {
      expect(auth, invented).not.toContain(invented);
    }
    expect([...auth.matchAll(/form\.register\("(\w+)"\)/g)].map(match => match[1]).sort()).toEqual([
      "email", "firstName", "lastName", "password", "passwordConfirmation",
    ]);
  });

  it("keeps the redirect targets the email templates point at", () => {
    expect(auth).toContain("/auth/confirmed");
    expect(auth).toContain("/auth/reset");
    expect(auth).toContain("emailRedirectTo");
  });

  it("does not reintroduce next-themes", () => {
    for (const file of ["../pages/Home.tsx", "../pages/Auth.tsx", "../components/campuswear/AuthLayout.tsx", "../components/campuswear/PublicNav.tsx"]) {
      expect(code(file), file).not.toContain("next-themes");
    }
  });
});

// =============================================================================================
describe("signed-out workspace gate", () => {
  it("asks for sign in with the account's real benefit", () => {
    expect(text(gate)).toContain("Sign in to continue");
    expect(text(gate)).toContain("orders, notifications, cart, and saved items connected");
  });

  it("renders none of the protected content", () => {
    expect(gate).not.toContain("SECRET WORKSPACE");
  });

  it("leaks nothing technical about the route or the role check", () => {
    const body = text(gate).toLowerCase();
    for (const leak of ["vendor_staff", "allowedroles", "school_admin", "platform_admin", "rls", "401", "403", "unauthorized", "forbidden", "jwt", "supabase"]) {
      expect(body, leak).not.toContain(leak);
    }
  });

  it("keeps the sign-in button at a real touch size", () => {
    expect(gate).toMatch(/<button[^>]*min-h-12/);
  });

  it("still gates on the same rule", () => {
    const source = code("../components/campuswear/WorkspaceGate.tsx");
    expect(source).toContain("canUseWorkspace(user.role, workspace)");
    expect(source).toContain("destinationForRole(user.role)");
    expect(source).toContain("`/auth?next=${encodeURIComponent(");
  });
});

// =============================================================================================
describe("protected routes still require an account", () => {
  it("keeps the student routes that demand a session", () => {
    const shell = code("../components/campuswear/StudentShell.tsx");
    expect(shell).toContain('["/cart", "/orders", "/notifications", "/profile", "/favorites"].includes(location)');
    expect(shell).toContain("window.location.assign(`/auth?next=${encodeURIComponent(location)}`)");
  });

  it("leaves the public routes public, which is why the nav may link them", () => {
    const shell = code("../components/campuswear/StudentShell.tsx");
    const requiresAccount = /\[([^\]]*)\]\.includes\(location\)/.exec(shell)?.[1] ?? "";
    expect(requiresAccount).not.toContain("/shop");
    expect(requiresAccount).not.toContain("/announcements");
  });

  it("keeps every application route registered", () => {
    const app = code("../App.tsx");
    for (const route of ["/", "/auth", "/auth/confirmed", "/auth/reset", "/shop", "/cart", "/orders", "/notifications", "/vendor", "/vendor/pickup", "/platform", "/admin", "/student"]) {
      expect(app, route).toContain(`path="${route}"`);
    }
  });
});

// =============================================================================================
describe("the redesign ships no secrets and no debug output", () => {
  const files = [
    "../pages/Home.tsx", "../pages/Auth.tsx", "../pages/PasswordReset.tsx", "../pages/ConfirmedAccount.tsx",
    "../components/campuswear/AuthLayout.tsx", "../components/campuswear/PublicNav.tsx",
    "../components/campuswear/PublicFooter.tsx", "../components/campuswear/WorkspaceGate.tsx",
  ];

  it("contains no credential, key or debug statement", () => {
    for (const file of files) {
      const source = read(file);
      for (const pattern of [/service_role/, /sb_secret_/, /SUPABASE_SERVICE/, /eyJ[A-Za-z0-9_-]{20,}/, /console\.log/, /debugger/]) {
        expect(source, `${file} :: ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
