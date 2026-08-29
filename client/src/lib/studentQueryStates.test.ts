import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// App-wide sweep for BUG-020.
//
// TanStack Query's default networkMode "online" PAUSES a request when there is no connection
// rather than failing it: status stays "pending" while fetchStatus becomes "paused", leaving
// isLoading false, isError false and data undefined. Any screen whose render chain goes
// loading -> error -> data -> empty therefore falls through to EMPTY and tells the user there
// is nothing there when they are merely offline. Captured from the running build:
//   ["supabase-catalog",""]  status: "pending"  fetchStatus: "paused"  -> rendered "0 items found"
//
// This suite is deliberately filesystem-driven rather than a hand-maintained list, so a page
// added later that renders query state is held to the same contract automatically.
const pageDir = new URL("../pages/", import.meta.url);
const vendorDir = new URL("../pages/vendor/", import.meta.url);

function loadPages() {
  const entries: Array<{ name: string; source: string }> = [];
  for (const [dir, prefix] of [[pageDir, ""], [vendorDir, "vendor/"]] as const) {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".tsx")) continue;
      entries.push({ name: `${prefix}${file}`, source: readFileSync(new URL(file, dir), "utf8") });
    }
  }
  return entries;
}

const pages = loadPages();
const dataDrivenPages = pages.filter(page => page.source.includes("useQuery("));
const offlinePanel = readFileSync(new URL("../components/campuswear/OfflinePanel.tsx", import.meta.url), "utf8");
const offlineNotice = readFileSync(new URL("../components/campuswear/OfflineNotice.tsx", import.meta.url), "utf8");

describe("the sweep covers every data-driven screen", () => {
  it("finds the expected screens", () => {
    expect(dataDrivenPages.length).toBeGreaterThanOrEqual(16);
  });

  it.each(dataDrivenPages.map(p => [p.name, p.source] as const))(
    "%s routes paused queries through the shared offline helper",
    (_name, source) => {
      expect(source).toContain("isStalledWithoutData");
      expect(source).toContain('from "@/lib/queryState"');
    },
  );

  it.each(dataDrivenPages.map(p => [p.name, p.source] as const))(
    "%s renders a dedicated offline surface rather than an empty one",
    (_name, source) => {
      expect(source).toMatch(/OfflinePanel|role="status"/);
    },
  );
});

describe("offline is decided before empty on every screen", () => {
  it.each(dataDrivenPages.map(p => [p.name, p.source] as const))(
    "%s checks offline ahead of its empty fallback",
    (_name, source) => {
      const firstOffline = source.indexOf("isStalledWithoutData");
      const lastEmpty = source.lastIndexOf("EmptyPanel title=");

      expect(firstOffline).toBeGreaterThan(-1);
      if (lastEmpty > -1) expect(firstOffline).toBeLessThan(lastEmpty);
    },
  );

  it.each(dataDrivenPages.map(p => [p.name, p.source] as const))(
    "%s offers a way to retry",
    (_name, source) => {
      expect(source).toMatch(/refetch\(\)/);
    },
  );
});

describe("no screen re-implements the paused check inline", () => {
  it.each(pages.map(p => [p.name, p.source] as const))("%s has no ad-hoc isPaused logic", (_name, source) => {
    expect(source).not.toMatch(/isPaused\s*&&/);
  });
});

describe("live status regions never state a count the data cannot support", () => {
  it("Shop does not announce a result count while loading, stalled, or errored", () => {
    const shop = pages.find(page => page.name === "Shop.tsx")!.source;
    const countLine = shop.split(String.fromCharCode(10)).find(line => line.includes("} found"))!;

    expect(countLine).toContain("isLoading ?");
    expect(countLine).toContain("isStalled ?");
    expect(countLine).toContain("isError ?");
    // The bare count template must be the last resort, after every non-success state.
    expect(countLine.indexOf("isError ?")).toBeLessThan(countLine.indexOf("} found"));
  });
});

describe("screens without queries are correctly out of scope", () => {
  it("Profile issues no queries, so it has no query state to mishandle", () => {
    const profile = pages.find(page => page.name === "Profile.tsx");

    expect(profile).toBeDefined();
    expect(profile!.source).not.toContain("useQuery(");
  });
});

describe("shared offline surfaces", () => {
  it("OfflinePanel announces itself and offers a retry at a 44px target", () => {
    expect(offlinePanel).toContain('role="status"');
    expect(offlinePanel).toContain("Try again");
    expect(offlinePanel).toContain("min-h-11");
    expect(offlinePanel).toContain('aria-hidden="true"');
  });

  it("OfflineNotice tracks TanStack's own connectivity signal, not navigator.onLine", () => {
    // Strip comments: the rationale for avoiding navigator.onLine is documented in the file.
    const code = offlineNotice.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).toContain("onlineManager");
    expect(code).not.toContain("navigator.onLine");
  });

  it("does not treat a paused query as proof of being offline", () => {
    const code = offlineNotice.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).not.toContain('fetchStatus === "paused"');
  });

  it("OfflinePanel defers to live connectivity for its wording", () => {
    expect(offlinePanel).toContain("useIsOffline");
    expect(offlinePanel).toContain("Still trying to load this");
  });

  it("OfflineNotice is polite, non-blocking, and offers a reconnect", () => {
    expect(offlineNotice).toContain('aria-live="polite"');
    expect(offlineNotice).toContain("Reconnect");
    expect(offlineNotice).toContain("refetchQueries");
  });

  it("keeps cached data on screen by rendering only a banner when offline", () => {
    expect(offlineNotice).toContain("Showing your last saved view");
  });
});

describe("every data-driven screen can surface the offline banner", () => {
  it.each(dataDrivenPages.map(p => [p.name, p.source] as const))(
    "%s reaches the banner through a shell or renders it directly",
    (_name, source) => {
      const inShell = source.includes("StudentShell") || source.includes("DashboardLayout");
      expect(inShell || source.includes("<OfflineNotice />")).toBe(true);
    },
  );
});

describe("both workspace shells surface the offline banner", () => {
  it("the student shell renders it once for every student screen", () => {
    const shell = readFileSync(new URL("../components/campuswear/StudentShell.tsx", import.meta.url), "utf8");

    expect(shell).toContain("<OfflineNotice />");
  });

  it("the workspace shell renders it once for vendor and admin screens", () => {
    const shell = readFileSync(new URL("../components/DashboardLayout.tsx", import.meta.url), "utf8");

    expect(shell).toContain("<OfflineNotice />");
  });
});
