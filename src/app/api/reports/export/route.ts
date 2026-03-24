import { NextResponse } from "next/server";
import { getReportsData } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getReportsData();

  if (!data.canView) {
    return NextResponse.json({ error: "Reporting access denied." }, { status: 403 });
  }

  const rows = [
    [
      "Reference",
      "Titre",
      "Type",
      "Statut",
      "Priorite",
      "Demandeur",
      "Assignee",
      "SoumiseLe",
      "DecideeLe",
      "DueAt",
      "Montant",
    ],
    ...data.exportRows,
  ];

  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="noria-report.csv"',
    },
  });
}
