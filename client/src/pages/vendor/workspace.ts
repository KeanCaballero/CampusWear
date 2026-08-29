import { BellRing, Boxes, ClipboardList, LayoutDashboard, PackagePlus, BarChart3 } from "lucide-react";

export const vendorNavigation = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/vendor" },
  { icon: ClipboardList, label: "Orders", path: "/vendor/orders" },
  { icon: Boxes, label: "Inventory", path: "/vendor/inventory" },
  { icon: PackagePlus, label: "Products", path: "/vendor/products" },
  { icon: BellRing, label: "Announcements", path: "/vendor/announcements" },
  { icon: BarChart3, label: "Reports", path: "/vendor/reports" },
];
