import { TablePageSkeleton } from "@/components/shared/page-skeletons";

export default function Loading() {
  return <TablePageSkeleton columns={6} filters={5} />;
}
