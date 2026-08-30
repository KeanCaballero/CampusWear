import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Regression coverage for the production defect where a product whose stored image 404s rendered
// as a blank white box.
//
// Observed live on campuswear.vercel.app: a real product's <img> reported
//   naturalWidth: 0, naturalHeight: 0, complete: true
// i.e. the request finished and failed. ProductVisual branched on `imageUrl` truthiness alone, so
// the URL was truthy, the <img> rendered, and the browser painted an empty box with no fallback.
const source = readFileSync(new URL("../components/campuswear/ProductVisual.tsx", import.meta.url), "utf8");

describe("a valid image still renders normally", () => {
  it("renders an <img> with the supplied URL and accessible name", () => {
    expect(source).toContain("<img src={imageUrl}");
    expect(source).toContain("alt={name}");
  });

  it("keeps lazy loading and the caller's sizing classes", () => {
    expect(source).toContain('loading="lazy"');
    expect(source).toContain("object-cover ${className}");
  });
});

describe("a failed image falls back to the placeholder", () => {
  it("listens for the load failure at all", () => {
    expect(source).toContain("onError=");
  });

  it("records the failure and stops rendering the broken <img>", () => {
    expect(source).toContain("setFailedUrl(imageUrl)");
    expect(source).toContain("const isBroken = Boolean(imageUrl) && failedUrl === imageUrl");
    expect(source).toContain("if (imageUrl && !isBroken)");
  });

  it("recovers automatically when handed a different image", () => {
    // The FAILED URL is remembered rather than a boolean, so a recycled component (list
    // virtualisation, navigating between products) is not stuck showing the placeholder.
    expect(source).toContain("useState<string | null>(null)");
    expect(source).not.toMatch(/useState<boolean>|useState\(false\)/);
  });
});

describe("the fallback reuses the existing CampusWear placeholder", () => {
  it("invents no replacement image and fetches nothing else", () => {
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/placeholder\.(png|jpg|svg)/i);
  });

  it("keeps the established placeholder visual", () => {
    expect(source).toContain("palettes[index % palettes.length]");
    expect(source).toContain("<Shirt");
    expect(source).toContain("CAMPUSWEAR");
  });

  it("keeps the placeholder labelled for assistive technology", () => {
    expect(source).toContain("aria-label={`${name} visual placeholder`}");
  });

  it("leaves no path that renders nothing", () => {
    // Exactly two returns: the image, and the placeholder. Neither yields an empty box.
    expect(source.match(/return\s*\(/g)?.length ?? 0).toBe(1);
    expect(source.match(/return\s*</g)?.length ?? 0).toBe(1);
    expect(source).not.toMatch(/return null/);
  });
});

describe("every product surface inherits the fallback", () => {
  const pageDir = new URL("../pages/", import.meta.url);
  const vendorDir = new URL("../pages/vendor/", import.meta.url);

  function sourcesUsing(component: string) {
    const found: string[] = [];
    for (const [dir, prefix] of [[pageDir, ""], [vendorDir, "vendor/"]] as const) {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".tsx")) continue;
        if (readFileSync(new URL(file, dir), "utf8").includes(component)) found.push(`${prefix}${file}`);
      }
    }
    return found;
  }

  it("covers Student Home, Shop, Product Details and Cart through the shared component", () => {
    const users = sourcesUsing("<ProductVisual");
    for (const page of ["StudentHome.tsx", "Shop.tsx", "ProductDetail.tsx", "Cart.tsx"]) {
      expect(users).toContain(page);
    }
  });

  it("no page renders a raw product <img> that would bypass the fallback", () => {
    for (const page of ["StudentHome.tsx", "Shop.tsx", "ProductDetail.tsx", "Cart.tsx"]) {
      const body = readFileSync(new URL(page, pageDir), "utf8");
      expect(body).not.toMatch(/<img[^>]*imageUrl/);
    }
  });
});
