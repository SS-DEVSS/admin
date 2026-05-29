import { useState, useEffect, useRef, useMemo } from "react";
import { TechnicalSheet } from "@/models/technicalSheet";
import { useDeleteModal } from "@/context/delete-context";
import { FileDown, FileText, MoreVertical, Pencil, Trash, Eye } from "lucide-react";
import axiosClient from "@/services/axiosInstance";
import { getStoredApplicationDisplayItems } from "@/utils/applicationLabel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TSFormType } from "@/pages/techincalSheets";

type TsCardProps = {
  ts: TechnicalSheet;
  deleteTechnicalSheet: (id: TechnicalSheet["id"]) => void;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setTsForm: React.Dispatch<React.SetStateAction<TSFormType>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingTsId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
};

const TsCard = ({
  ts,
  deleteTechnicalSheet,
  setIsEditMode,
  setTsForm,
  setIsOpen,
  setEditingTsId,
  setFile,
}: TsCardProps) => {
  const { openModal } = useDeleteModal();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const isImage = ts.url && /\.(jpe?g|png|gif|webp)$/i.test(ts.url);

  const displayApplications = useMemo(
    () => getStoredApplicationDisplayItems(ts.applications ?? []),
    [ts.applications]
  );

  const previewUrlRef = useRef<string | null>(null);

  // Obtener documento desde el backend (auth) para evitar Access Denied de S3
  useEffect(() => {
    if (!previewOpen || !ts.id) {
      return;
    }
    const ac = new AbortController();
    const client = axiosClient();
    setPreviewLoading(true);
    setPreviewError(null);
    client
      .get(`/ts/${ts.id}/document`, { responseType: "blob", signal: ac.signal })
      .then((res) => {
        const url = URL.createObjectURL(res.data as Blob);
        previewUrlRef.current = url;
        setPreviewDocUrl(url);
      })
      .catch((err) => {
        if (err.name !== "CanceledError") setPreviewError("No se pudo cargar el documento.");
      })
      .finally(() => {
        setPreviewLoading(false);
      });
    return () => {
      ac.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewDocUrl(null);
    };
  }, [previewOpen, ts.id]);

  const handleEditPrep = () => {
    setEditingTsId(ts.id);
    setIsEditMode(true);
    setTsForm({
      title: ts.title ?? "",
      path: ts.path ?? "",
      url: ts.url ?? "",
      description: ts.description ?? "",
      productIds: (ts.products || []).map((p) => p.id),
      references: ts.references ?? [],
      applications: ts.applications ?? [],
    });
    setFile(null);
    setIsOpen(true);
  };

  const handleDeleteTS = () => {
    void deleteTechnicalSheet(ts.id);
  };

  const handleOpenDocument = () => {
    setPreviewOpen(true);
  };

  const handleDownloadDocument = async () => {
    if (!ts.id) return;
    try {
      setDownloadLoading(true);
      const client = axiosClient();
      const response = await client.get(`/ts/${ts.id}/document`, { responseType: "blob" });
      const blob = response.data as Blob;
      const objectUrl = URL.createObjectURL(blob);

      const extension = ts.url?.split(".").pop()?.split("?")[0] || "pdf";
      const safeTitle = (ts.title || "boletin").replace(/[^\w-]+/g, "_");
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Error downloading technical sheet:", error);
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="border shadow-sm bg-card w-full rounded-2xl p-6 transition hover:shadow-md">
      <section className="min-w-0 flex-1 text-foreground space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-lg line-clamp-2">{ts.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {ts.description || "Sin descripción."}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="shrink-0 p-1 rounded hover:bg-muted">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Ver detalles</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEditPrep}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Editar boletín</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    openModal({
                      title: "boletín",
                      description:
                        "¿Estás seguro de que deseas eliminar este boletín? Esta acción no se puede deshacer.",
                      handleDelete: handleDeleteTS,
                    })
                  }
                >
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Eliminar boletín</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto sm:w-full">
                <DialogHeader>
                  <DialogTitle>{ts.title}</DialogTitle>
                  <DialogDescription>{ts.description || "Sin descripción."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {ts.products && ts.products.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold mb-1">Productos relacionados</p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {ts.products.map((product) => (
                          <li key={product.id}>{product.name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {ts.references && ts.references.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold mb-1">Referencias</p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {ts.references.map((reference) => (
                          <li key={reference}>{reference}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {displayApplications.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold mb-1">Aplicaciones</p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {displayApplications.map((application) => (
                          <li key={application.key}>{application.displayLabel}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    {ts.url ? (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenDocument}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          Abrir documento
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadDocument}
                          disabled={downloadLoading}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FileDown className="h-4 w-4" />
                          {downloadLoading ? "Descargando..." : "Descargar documento"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        {ts.url && (
          <>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 text-sm"
            >
              <Eye className="h-4 w-4" />
              Ver vista previa
            </button>
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-x-hidden overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Vista previa — {ts.title}</DialogTitle>
                </DialogHeader>
                <div className="min-h-[60vh] rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center">
                  {previewLoading && (
                    <p className="text-muted-foreground">Cargando documento…</p>
                  )}
                  {previewError && (
                    <p className="text-destructive">{previewError}</p>
                  )}
                  {!previewLoading && !previewError && previewDocUrl && (
                    isImage ? (
                      <img
                        src={previewDocUrl}
                        alt={ts.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <iframe
                        title={`Vista previa ${ts.title}`}
                        src={previewDocUrl}
                        className="w-full min-h-[60vh] border-0"
                      />
                    )
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        <div className="border-t pt-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
            Productos
          </p>
          <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
            {ts.products && ts.products.length > 0
              ? ts.products.map((p) => p.name).join(", ")
              : "Sin productos asociados."}
          </p>
        </div>
        <div className="border-t pt-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
            Referencias
          </p>
          <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
            {ts.references && ts.references.length > 0
              ? ts.references.join(", ")
              : "Sin referencias asociadas."}
          </p>
        </div>
        <div className="border-t pt-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
            Aplicaciones
          </p>
          <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
            {displayApplications.length > 0
              ? displayApplications.map((item) => item.displayLabel).join("; ")
              : "Sin aplicaciones asociadas."}
          </p>
        </div>
      </section>
    </div>
  );
};

export default TsCard;
