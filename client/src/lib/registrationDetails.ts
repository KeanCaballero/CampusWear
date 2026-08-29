import { z } from "zod";

export const signupDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "First name is too long."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80, "Last name is too long."),
  password: z.string().min(8, "Password must contain at least 8 characters."),
  passwordConfirmation: z.string().min(1, "Confirm your password."),
}).refine(values => values.password === values.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Passwords do not match.",
});

export function fullNameForProfile(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}
