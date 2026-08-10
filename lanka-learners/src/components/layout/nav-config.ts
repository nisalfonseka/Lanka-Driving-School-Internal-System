import type { LucideIcon } from "lucide-react";
import {
  BanknoteIcon,
  BookOpenIcon,
  CarIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  FileClockIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  UserPlusIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";

import type { Role } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, only this role sees the link. */
  ownerOnly?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
  ownerOnly?: boolean;
};

const OPERATIONS: NavSection = {
  items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { label: "Register New Client", href: "/clients/new", icon: UserPlusIcon },
    { label: "Client Area", href: "/clients", icon: UsersIcon },
    { label: "Exam", href: "/exams", icon: ClipboardListIcon },
    { label: "Trial", href: "/trials", icon: CarIcon },
    { label: "Lectures", href: "/lectures", icon: BookOpenIcon },
    {
      label: "Practical Training",
      href: "/practical-training",
      icon: CarIcon,
    },
    { label: "Payments", href: "/payments", icon: BanknoteIcon },
    { label: "Expenses", href: "/expenses", icon: ReceiptIcon },
  ],
};

const MANAGEMENT: NavSection = {
  title: "Management",
  ownerOnly: true,
  items: [
    { label: "Analytics", href: "/analytics", icon: ChartColumnIcon },
    { label: "Employee Details", href: "/employees", icon: UsersRoundIcon },
    { label: "Activity Logs", href: "/activity-logs", icon: FileClockIcon },
    { label: "System Settings", href: "/settings", icon: SettingsIcon },
  ],
};

/**
 * Navigation is filtered by role for usability. This is presentation only —
 * the server rejects an employee who navigates to an owner route directly.
 */
export function navSectionsFor(role: Role): NavSection[] {
  const sections = [OPERATIONS, MANAGEMENT];
  return sections
    .filter((section) => !section.ownerOnly || role === "OWNER")
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.ownerOnly || role === "OWNER"
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/** Longest-prefix match so /clients/new does not also light up /clients. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/clients") {
    return pathname === "/clients" || /^\/clients\/(?!new).+/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
