import { StatusBadge } from "@/components/shared/status-badge";
import { humanise } from "@/lib/format";

/** One chip per vehicle class of a training day, coloured by that class's status. */
export function ClassStatusBadges({
  links,
}: {
  links: { id: string; status: string; vehicleClass: { code: string } }[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {links.map((link) => (
        <StatusBadge
          key={link.id}
          value={link.status}
          label={`${link.vehicleClass.code} · ${humanise(link.status)}`}
        />
      ))}
    </div>
  );
}
