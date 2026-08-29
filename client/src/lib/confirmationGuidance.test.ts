import { describe, expect, it } from "vitest";
import {
  confirmationEmailDeliveryChecklist,
  confirmationEmailResentMessage,
  confirmationEmailSentMessage,
  hasExpiredConfirmationLink,
} from "@/lib/confirmationGuidance";

describe("confirmation-email guidance", () => {
  it("gives users concrete inbox, spam, and Gmail Promotions checks", () => {
    expect(confirmationEmailDeliveryChecklist.join(" ")).toMatch(/Inbox/i);
    expect(confirmationEmailDeliveryChecklist.join(" ")).toMatch(/Spam or Junk/i);
    expect(confirmationEmailDeliveryChecklist.join(" ")).toMatch(/Promotions/i);
  });

  it("keeps the recipient and resend response clear without exposing provider credentials", () => {
    expect(confirmationEmailSentMessage("student@example.edu")).toContain("student@example.edu");
    expect(confirmationEmailResentMessage).toMatch(/confirmation email/i);
    expect(confirmationEmailResentMessage).not.toMatch(/smtp|key|password/i);
  });

  it("recognizes an expired or invalid Supabase confirmation token so the user can request a fresh link", () => {
    expect(hasExpiredConfirmationLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")).toBe(true);
    expect(hasExpiredConfirmationLink("#access_token=example&token_type=bearer")).toBe(false);
  });
});
