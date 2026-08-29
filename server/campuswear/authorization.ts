import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import { CampuswearRole, isCampuswearAdmin } from "./domain";

export type AuthenticatedCampuswearUser = User & { role: CampuswearRole };

export function assertCampuswearRole(
  user: User | null,
  allowed: readonly CampuswearRole[],
): asserts user is AuthenticatedCampuswearUser {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }

  if (!allowed.includes(user.role as CampuswearRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this CampusWear workspace.",
    });
  }
}

export function assertPlatformAdmin(user: User | null): asserts user is AuthenticatedCampuswearUser {
  if (!user || !isCampuswearAdmin(user.role as CampuswearRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform administration access is required.",
    });
  }
}

