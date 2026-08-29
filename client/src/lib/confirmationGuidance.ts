export const confirmationEmailDeliveryChecklist = [
  "Check the Inbox for the address you used to register.",
  "Check Spam or Junk, especially when using a new CampusWear account.",
  "If you use Gmail, also check the Promotions tab.",
] as const;

export const confirmationEmailResentMessage = "A new confirmation email has been requested.";

export function confirmationEmailSentMessage(recipient: string): string {
  return `We sent a secure confirmation link to ${recipient}.`;
}

export function hasExpiredConfirmationLink(hash: string): boolean {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return params.get("error_code") === "otp_expired" || params.get("error") === "access_denied" && /expired|invalid/i.test(params.get("error_description") ?? "");
}
