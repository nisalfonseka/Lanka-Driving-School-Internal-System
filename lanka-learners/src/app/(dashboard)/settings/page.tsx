import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SettingsForm } from "@/components/settings/settings-form";
import { VehicleClassDialog } from "@/components/settings/vehicle-class-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOwnerPage } from "@/lib/auth/session";
import { getAllVehicleClasses } from "@/lib/queries/clients";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "System Settings" };

export default async function SettingsPage() {
  await requireOwnerPage();

  const [settings, vehicleClasses] = await Promise.all([
    getSettings(),
    getAllVehicleClasses(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="System Settings"
        description="Business details and the vehicle classes available across the system."
      />

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Used on the sign-in page, the sidebar and printed receipts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm defaults={settings} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <div>
            <h2 className="text-sm font-semibold">Vehicle Classes</h2>
            <p className="text-xs text-muted-foreground">
              Only active classes can be selected on new records.
            </p>
          </div>
          <VehicleClassDialog />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {vehicleClasses.map((vehicleClass) => (
                <TableRow key={vehicleClass.id}>
                  <TableCell className="font-medium">
                    {vehicleClass.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicleClass.name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={vehicleClass.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <VehicleClassDialog
                      vehicleClass={{
                        id: vehicleClass.id,
                        code: vehicleClass.code,
                        name: vehicleClass.name,
                        status: vehicleClass.status,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
