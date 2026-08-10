import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seeds the initial OWNER account and the default vehicle classes.
 *
 * The owner password is read from the environment and hashed before it is
 * stored — no plain-text password is ever written to the database or logged.
 * Re-running the seed is safe: it upserts and never overwrites an existing
 * owner's password.
 */

const DEFAULT_VEHICLE_CLASSES = [
  { code: "A", name: "Motorcycles" },
  { code: "B1", name: "Motor Tricycles" },
  { code: "B", name: "Light Vehicles (Manual)" },
  { code: "B AUTO", name: "Light Vehicles (Automatic)" },
  { code: "G", name: "Land Vehicles / Tractors" },
  { code: "AB", name: "Motorcycles and Light Vehicles" },
];

const DEFAULT_SETTINGS = [
  { key: "systemName", value: "Lanka Learners" },
  { key: "businessName", value: "Lanka Learners Driving School" },
  { key: "businessAddress", value: "" },
  { key: "businessPhone", value: "" },
  { key: "businessEmail", value: "" },
  { key: "receiptFooter", value: "Thank you. This is a computer generated receipt." },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. Set it in .env before seeding (see .env.example).`
    );
  }
  return value;
}

async function main() {
  const connectionString = requireEnv("DATABASE_URL");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // --- Vehicle classes -----------------------------------------------
    for (const vehicleClass of DEFAULT_VEHICLE_CLASSES) {
      await prisma.vehicleClass.upsert({
        where: { code: vehicleClass.code },
        update: { name: vehicleClass.name },
        create: vehicleClass,
      });
    }
    console.log(
      `✔ ${DEFAULT_VEHICLE_CLASSES.length} vehicle classes are in place`
    );

    // --- System settings -----------------------------------------------
    for (const setting of DEFAULT_SETTINGS) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
    console.log(`✔ ${DEFAULT_SETTINGS.length} system settings are in place`);

    // --- Initial owner --------------------------------------------------
    const username = requireEnv("INITIAL_OWNER_USERNAME").trim().toLowerCase();
    const password = requireEnv("INITIAL_OWNER_PASSWORD");
    const fullName = requireEnv("INITIAL_OWNER_NAME").trim();
    const email = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase() || null;

    if (password.length < 8) {
      throw new Error("INITIAL_OWNER_PASSWORD must be at least 8 characters.");
    }

    const existing = await prisma.user.findUnique({ where: { username } });

    if (existing) {
      console.log(
        `• Owner "${username}" already exists — left untouched (password not changed).`
      );
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          fullName,
          username,
          email,
          passwordHash,
          role: "OWNER",
          status: "ACTIVE",
        },
      });
      console.log(`✔ Created initial OWNER account "${username}"`);
      console.log(
        "  Sign in with the credentials from your .env, then change the password."
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("✖ Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
