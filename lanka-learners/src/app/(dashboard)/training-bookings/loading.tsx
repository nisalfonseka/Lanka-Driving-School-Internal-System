import { TablePageSkeleton } from "@/components/shared/page-skeletons";

export default function Loading() {
  return <TablePageSkeleton columns={3} rows={10} filters={0} stats />;
}
