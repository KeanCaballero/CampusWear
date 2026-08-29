export type CampusWearRole = "student" | "vendor_staff" | "school_admin" | "platform_admin" | "pending_assignment" | "admin" | "user" | undefined;

export function destinationForRole(role: CampusWearRole | string): string {
  if (role === "vendor_staff") return "/vendor";
  if (role === "platform_admin" || role === "admin") return "/platform";
  if (role === "school_admin") return "/admin";
  if (role === "pending_assignment") return "/profile";
  return "/student";
}

export function safeNextPath(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function isVendorApplicationPath(path: string | null | undefined): boolean {
  return path === "/vendor/apply";
}

export function withNextPath(path: string, next: string | null | undefined): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function canUseStudentWorkspace(role: CampusWearRole | string): boolean {
  return ["student", "user", "pending_assignment"].includes(role ?? "");
}

export function canUseWorkspace(role: CampusWearRole | string, workspace: "vendor" | "school" | "platform"): boolean {
  if (workspace === "vendor") return role === "vendor_staff";
  if (workspace === "school") return role === "school_admin";
  return role === "platform_admin" || role === "admin";
}
