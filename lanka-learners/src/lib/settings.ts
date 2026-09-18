import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { CACHE_TAGS } from "@/lib/cache-tags";
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

/**
 * Settings are read by the layout on every page, but change almost never, so
 * they are cached across requests. Saving settings expires the tag.
 */
const readStoredSettings = unstable_cache(
  async () => {
    const rows = await prisma.systemSetting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
  ["system-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 }
);

/** Also de-duplicated per request so several components can call it. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const stored = await readStoredSettings();
    return { ...DEFAULTS, ...stored } as AppSettings;
  } catch {
    // Settings are cosmetic — never take a page down because of them.
    return DEFAULTS;
  }
});
