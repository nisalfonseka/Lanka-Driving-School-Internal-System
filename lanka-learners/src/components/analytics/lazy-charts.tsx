"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is the heaviest library in the app. Loading each chart through
 * `next/dynamic` splits it into its own chunk that is only downloaded when the
 * analytics page actually renders a chart, with a skeleton shown meanwhile.
 */
function chartSkeleton(height: number) {
  function ChartSkeleton() {
    return (
      <Skeleton
        className="w-full rounded-lg"
        style={{ height }}
        aria-label="Loading chart"
      />
    );
  }
  return ChartSkeleton;
}

export const RegistrationsChart = dynamic(
  () => import("./charts").then((mod) => mod.RegistrationsChart),
  { ssr: false, loading: chartSkeleton(260) }
);

export const FinanceChart = dynamic(
  () => import("./charts").then((mod) => mod.FinanceChart),
  { ssr: false, loading: chartSkeleton(280) }
);

export const ExpenseCategoryChart = dynamic(
  () => import("./charts").then((mod) => mod.ExpenseCategoryChart),
  { ssr: false, loading: chartSkeleton(260) }
);

export const ResultChart = dynamic(
  () => import("./charts").then((mod) => mod.ResultChart),
  { ssr: false, loading: chartSkeleton(240) }
);

export const VehicleClassChart = dynamic(
  () => import("./charts").then((mod) => mod.VehicleClassChart),
  { ssr: false, loading: chartSkeleton(260) }
);
