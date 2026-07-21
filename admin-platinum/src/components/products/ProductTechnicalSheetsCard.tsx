import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import axiosClient from "@/services/axiosInstance";

type ProductTechnicalSheetsCardProps = {
  productId?: string;
};

const ProductTechnicalSheetsCard = ({ productId }: ProductTechnicalSheetsCardProps) => {
  const [technicalSheets, setTechnicalSheets] = useState<
    Array<{ id?: string; title: string; path?: string; url?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const client = useMemo(() => axiosClient(), []);

  useEffect(() => {
    let cancelled = false;
    if (!productId) {
      setTechnicalSheets([]);
      return;
    }
    setLoading(true);
    client
      .get("/ts?page=1&pageSize=300")
      .then((response) => {
        if (cancelled) return;
        const allSheets = response.data?.technicalSheets || [];
        const linked = allSheets.filter((sheet: any) =>
          (sheet.products || []).some((product: any) => product.id === productId)
        );
        setTechnicalSheets(linked);
      })
      .catch(() => {
        if (!cancelled) setTechnicalSheets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, productId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Boletines técnicos</CardTitle>
        <CardDescription>Boletines vinculados a este producto.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando boletines...</p>
        ) : technicalSheets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este producto no tiene boletines vinculados.</p>
        ) : (
          <div className="space-y-2">
            {technicalSheets.map((sheet, index) => (
              <div key={sheet.id || `sheet-${index}`} className="rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{sheet.title}</span>
                </div>
                {(sheet.url || sheet.path) && (
                  <a
                    href={sheet.url || sheet.path}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-xs text-primary hover:underline"
                  >
                    Ver documento
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductTechnicalSheetsCard;
