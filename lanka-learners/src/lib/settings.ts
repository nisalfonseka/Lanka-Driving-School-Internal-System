import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";

export type AppSettings = {
  systemName: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  receiptFooter: string;
};

const DEFAULTS: AppSettings = {
  systemName: "Lanka Learners",
  businessName: "Lanka Learners Driving School",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  receiptFooter: "Thank you. This is a computer generated receipt.",
};

/** Cached per request so a page can read settings from several components. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { ...DEFAULTS, ...stored } as AppSettings;
  } catch {
    // Settings are cosmetic — never take a page down because of them.
    return DEFAULTS;
  }
});
