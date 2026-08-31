import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Toast host.
 *
 * This used to read `useTheme` from next-themes. That package is installed but NO next-themes
 * provider is mounted anywhere in the app — this file was its only importer — so the hook fell back
 * to its default of "system" and sonner followed the operating system. On a light CampusWear page
 * viewed on a machine set to dark mode, that rendered a dark toast whose description text came out
 * near-black on near-black and was effectively invisible.
 *
 * It now reads CampusWear's own ThemeContext, which is the thing that actually decides how the rest
 * of the page is painted, so the toast can no longer disagree with the page around it.
 *
 * The description colour is also pinned explicitly. Sonner's built-in description grey is chosen
 * against its own palette, not ours, and it was the specific text that disappeared. Driving it from
 * --popover-foreground keeps the title and the description in the same colour system as the surface
 * they sit on.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Title stays at full strength; the description is only slightly softened so it reads as
          // secondary without dropping out of contrast the way sonner's own grey did.
          title: "font-extrabold text-[13px] text-popover-foreground",
          description: "text-[13px] leading-5 text-popover-foreground/80",
          actionButton: "font-bold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
