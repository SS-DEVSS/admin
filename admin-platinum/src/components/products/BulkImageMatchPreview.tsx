import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleSlash,
  Files,
  XCircle,
} from "lucide-react";

export type BulkImageMatchRow = {
  status: string;
  sku: string;
  file: string;
  reason?: string;
  productId?: string;
};

type BulkImageMatchPreviewProps = {
  total: number;
  matched: number;
  skipped: number;
  rows: BulkImageMatchRow[];
  maxRows?: number;
};

type StatProps = {
  icon: typeof Files;
  label: string;
  value: number;
  iconClassName?: string;
};

const Stat = ({ icon: Icon, label, value, iconClassName }: StatProps) => (
  <div className="flex items-center gap-2">
    <Icon className={`h-4 w-4 shrink-0 ${iconClassName ?? "text-muted-foreground"}`} />
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium tabular-nums">{value}</span>
  </div>
);

const BulkImageMatchPreview = ({
  total,
  matched,
  skipped,
  rows,
  maxRows = 30,
}: BulkImageMatchPreviewProps) => {
  const visibleRows = rows.slice(0, maxRows);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Stat icon={Files} label="Total" value={total} />
        <Stat
          icon={CheckCircle2}
          label="Coincidencias"
          value={matched}
          iconClassName="text-emerald-600"
        />
        <Stat
          icon={CircleSlash}
          label="Omitidos"
          value={skipped}
          iconClassName="text-amber-600"
        />
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {visibleRows.map((row) =>
          row.status === "ok" ? (
            <div
              key={`${row.file}-${row.sku}`}
              className="flex items-center gap-1.5 text-xs min-w-0"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span className="truncate" title={row.file}>
                {row.file}
              </span>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="font-medium shrink-0" title={row.sku}>
                {row.sku}
              </span>
            </div>
          ) : (
            <div
              key={`${row.file}-${row.sku || row.reason || "skip"}`}
              className="flex items-start gap-1.5 text-xs min-w-0"
            >
              <XCircle
                className="h-3.5 w-3.5 shrink-0 text-destructive mt-0.5"
                aria-hidden
              />
              <span className="truncate" title={row.file}>
                {row.file}
              </span>
              <span className="text-muted-foreground shrink-0">—</span>
              <span className="text-muted-foreground">{row.reason ?? "omitido"}</span>
            </div>
          )
        )}
        {hiddenCount > 0 && (
          <p className="text-xs text-muted-foreground pt-1">... y {hiddenCount} más</p>
        )}
      </div>
    </div>
  );
};

export default BulkImageMatchPreview;
