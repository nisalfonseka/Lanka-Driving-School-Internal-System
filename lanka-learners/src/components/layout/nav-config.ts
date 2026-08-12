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
  description: string;
  /** When set, only this role sees the link. */
  ownerOnly?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
  ownerOnly?: boolean;
};

const OPERATIONS: NavSection = {
  title: "Operations",
  items: [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboardIcon,
      description: "Return to your workspace overview.",
    },
    {
      label: "Register New Client",
      href: "/clients/new",
      icon: UserPlusIcon,
      description: "Create a learner profile and start their registration.",
    },
    {
      label: "Client Area",
      href: "/clients",
      icon: UsersIcon,
      description: "Find learners, documents, fees and progress records.",
    },
    {
      label: "Written Exams",
      href: "/exams",
      icon: ClipboardListIcon,
      description: "Schedule written exams and record learner results.",
    },
    {
      label: "Trial Exams",
      href: "/trials",
      icon: CarIcon,
      description: "Manage trial dates, attempts and final outcomes.",
    },
    {
      label: "Lectures",
      href: "/lectures",
      icon: BookOpenIcon,
      description: "Plan theory sessions and track attendance.",
    },
    {
      label: "Practical Training",
      href: "/practical-training",
      icon: CarIcon,
      description: "Record driving lessons, vehicles and instructors.",
    },
    {
      label: "Payments",
      href: "/payments",
      icon: BanknoteIcon,
      description: "Collect learner payments and review receipts.",
    },
    {
      label: "Expenses",
      href: "/expenses",
      icon: ReceiptIcon,
      description: "Record and review day-to-day business expenses.",
    },
  ],
};

const MANAGEMENT: NavSection = {
  title: "Management",
  ownerOnly: true,
  items: [
    {
      label: "Analytics",
      href: "/analytics",
      icon: ChartColumnIcon,
      description: "Explore performance, revenue and learner trends.",
    },
    {
      label: "Employees",
      href: "/employees",
      icon: UsersRoundIcon,
      description: "Manage staff accounts, roles and access.",
    },
    {
      label: "Activity Logs",
      href: "/activity-logs",
      icon: FileClockIcon,
      description: "Review important actions recorded across the system.",
    },
    {
      label: "System Settings",
      href: "/settings",
      icon: SettingsIcon,
      description: "Update school details, classes and system preferences.",
    },
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
