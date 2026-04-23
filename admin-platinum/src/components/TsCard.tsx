import { useState, useEffect, useRef } from "react";
import { TechnicalSheet } from "@/models/technicalSheet";
import { useDeleteModal } from "@/context/delete-context";
import { FileDown, FileText, MoreVertical, Pencil, Trash, Eye } from "lucide-react";
import axiosClient from "@/services/axiosInstance";
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
import { useS3FileManager } from "@/hooks/useS3FileManager";

type TsCardProps = {
  ts: TechnicalSheet;
  deleteTechnicalSheet: (id: TechnicalSheet["id"]) => void;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setTsForm: React.Dispatch<React.SetStateAction<TSFormType>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingTsId: React.Dispatch<React.SetStateAction<string | undefined>>;
};

const TsCard = ({
  ts,
  deleteTechnicalSheet,
  setIsEditMode,
  setTsForm,
  setIsOpen,
  setEditingTsId,
}: TsCardProps) => {
  const { openModal } = useDeleteModal();
  const { deleteFile } = useS3FileManager();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isImage = ts.url && /\.(jpe?g|png|gif|webp)$/i.test(ts.url);

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
      path: ts.url ?? "",
      url: ts.url ?? "",
      description: ts.description ?? "",
      productIds: (ts.products || []).map((p) => p.id),
      references: ts.references ?? [],
    });
    setIsOpen(true);
  };

  const handleDeleteTS = async () => {
    deleteFile(ts.url!, async () => {
      await deleteTechnicalSheet(ts.id);
    });
  };

  return (
    <div className="border shadow-sm bg-card w-full flex gap-4 rounded-2xl p-4 transition hover:shadow-md">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <section className="min-w-0 flex-1 text-foreground">
        <div className="flex justify-between gap-2">
          <h2 className="font-semibold text-lg truncate">{ts.title}</h2>
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
                      title: "Eliminar boletín",
                      description: "¿Estás seguro de que deseas eliminar este boletín?",
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
              <DialogContent className="max-w-2xl">
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
                  <div className="flex gap-2 pt-1">
                    {ts.url ? (
                      <>
                        <a
                          href={ts.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          Abrir documento
                        </a>
                        <a
                          href={ts.url}
                          target="_blank"
                          download
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FileDown className="h-4 w-4" />
                          Descargar documento
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ts.description || "Sin descripción."}</p>
        {ts.url && (
          <>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver vista previa
            </button>
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Vista previa — {ts.title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-[70vh] rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center">
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
                        className="w-full h-full min-h-[70vh] border-0"
                      />
                    )
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        {ts.products && ts.products.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Productos: {ts.products.map((p) => p.name).join(", ")}
          </p>
        )}
        {ts.references && ts.references.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Referencias: {ts.references.join(", ")}
          </p>
        )}
      </section>
    </div>
  );
};

export default TsCard;
