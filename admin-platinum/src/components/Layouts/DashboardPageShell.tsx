import type { ReactNode } from "react";

type DashboardPageShellProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
};

const DashboardPageShell = ({
  title,
  description,
  actions,
  filters,
  children,
  className,
}: DashboardPageShellProps) => (
  <div className={`w-full max-w-full ${className ?? ""}`}>
    <div className="flex flex-col gap-4 pb-6 w-full">
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{title}</h1>
          {description ? (
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>
        ) : null}
      </div>
      {filters ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center w-full">{filters}</div>
      ) : null}
    </div>
    {children}
  </div>
);

export default DashboardPageShell;
