import { BellRing, Boxes, ClipboardList, LayoutDashboard, ListChecks, PackagePlus, BarChart3, ScanLine } from "lucide-react";

export const vendorNavigation = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/vendor" },
  { icon: ClipboardList, label: "Orders", path: "/vendor/orders" },
  { icon: ScanLine, label: "Pickup", path: "/vendor/pickup" },
  { icon: Boxes, label: "Inventory", path: "/vendor/inventory" },
  { icon: PackagePlus, label: "Products", path: "/vendor/products" },
  { icon: BellRing, label: "Announcements", path: "/vendor/announcements" },
  { icon: BarChart3, label: "Reports", path: "/vendor/reports" },
];

export const vendorPrimaryAction = { icon: ListChecks, label: "Fulfillment queue", path: "/vendor/orders" };
