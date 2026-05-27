import MyDropzone from "@/components/Dropzone";
import Layout from "@/components/Layouts/Layout";
import NoData from "@/components/NoData";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteModal } from "@/context/delete-context";
import { useBanners } from "@/hooks/useBanners";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { toast } from "@/hooks/use-toast";
import { Banner } from "@/models/banner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";

async function uploadToKey(
  uploadFile: ReturnType<typeof useS3FileManager>["uploadFile"],
  file: File
): Promise<string> {
  return new Promise((resolve, reject) => {
    void uploadFile(file, (key) => resolve(key), {}).catch(reject);
  });
}

const Banners = () => {
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopKey, setDesktopKey] = useState<string | null>(null);
  const [mobileKey, setMobileKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editDesktopFile, setEditDesktopFile] = useState<File | null>(null);
  const [editMobileFile, setEditMobileFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const { openModal } = useDeleteModal();
  const { loading, banners, addBanner, updateBanner, reorderBanners, deleteBanner } = useBanners();
  const s3Desktop = useS3FileManager();
  const s3Mobile = useS3FileManager();
  const s3EditDesktop = useS3FileManager();
  const s3EditMobile = useS3FileManager();

  const resetForm = () => {
    setTitle("");
    setAltText("");
    setDesktopKey(null);
    setMobileKey(null);
    setDesktopFile(null);
    setMobileFile(null);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setEditTitle(banner.title ?? "");
    setEditAlt(banner.altText ?? "");
    setEditDesktopFile(null);
    setEditMobileFile(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingBanner(null);
    setEditTitle("");
    setEditAlt("");
    setEditDesktopFile(null);
    setEditMobileFile(null);
  };

  const handleCreateBanner = async () => {
    const hasDesktop = Boolean(desktopKey || desktopFile);
    const hasMobile = Boolean(mobileKey || mobileFile);
    if (!hasDesktop) {
      toast({
        title: "Falta la imagen Web",
        description: "Necesitas al menos la imagen Web (escritorio). La de Móvil es opcional.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const dPromise = (async (): Promise<string> => {
        if (desktopKey) return desktopKey;
        if (!desktopFile) throw new Error("desktop");
        return uploadToKey(s3Desktop.uploadFile, desktopFile);
      })();
      const mPromise = hasMobile
        ? (async (): Promise<string> => {
            if (mobileKey) return mobileKey;
            if (!mobileFile) throw new Error("mobile");
            return uploadToKey(s3Mobile.uploadFile, mobileFile);
          })()
        : null;

      let dKey: string;
      let mKey: string;
      try {
        dKey = await dPromise;
        mKey = mPromise ? await mPromise : dKey;
      } catch {
        toast({
          title: "Error al subir",
          description: "No se pudieron subir las imágenes. Revisa la conexión e inténtalo de nuevo.",
          variant: "destructive",
        });
        return;
      }

      setDesktopKey(dKey);
      setMobileKey(hasMobile ? mKey : null);
      setDesktopFile(null);
      setMobileFile(null);

      const ok = await addBanner({
        desktopPath: dKey,
        ...(mKey !== dKey ? { mobilePath: mKey } : {}),
        title: title.trim() || undefined,
        altText: altText.trim() || undefined,
      });
      if (ok) resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBanner) return;
    setEditSaving(true);
    try {
      let desktopPath: string | undefined;
      let mobilePath: string | undefined;

      if (editDesktopFile) {
        desktopPath = await uploadToKey(s3EditDesktop.uploadFile, editDesktopFile);
        setEditDesktopFile(null);
      }

      if (editMobileFile) {
        mobilePath = await uploadToKey(s3EditMobile.uploadFile, editMobileFile);
        setEditMobileFile(null);
      }

      const ok = await updateBanner(editingBanner.id, {
        title: editTitle.trim() ? editTitle.trim() : null,
        altText: editAlt.trim() ? editAlt.trim() : null,
        ...(desktopPath !== undefined ? { desktopPath } : {}),
        ...(mobilePath !== undefined ? { mobilePath } : {}),
      });

      if (ok) {
        closeEdit();
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al guardar",
        description: "No se pudieron aplicar todos los cambios.",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const moveBanner = (index: number, delta: number) => {
    const j = index + delta;
    if (j < 0 || j >= banners.length) return;
    const next = [...banners];
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    void reorderBanners(next.map((b) => b.id));
  };

  const hasDesktopSlot = Boolean(desktopKey || desktopFile);
  const uploadsBusy = s3Desktop.uploading || s3Mobile.uploading;
  const canSave = hasDesktopSlot && !loading && !saving && !uploadsBusy;

  const displayName = (b: Banner) =>
    (b.title && b.title.trim()) || b.desktopUrl.split("/").pop() || "Banner";

  const requiredMark = <span className="text-destructive font-semibold">*</span>;

  return (
    <Layout>
      <section className="max-w-[1000px] mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Banners</h1>
        <Card>
          <CardHeader>
            <CardTitle>Agregar nuevo banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="banner-title">Nombre del banner</Label>
                <Input
                  id="banner-title"
                  placeholder="Ej. Campaña primavera 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-alt">Etiqueta / texto alternativo</Label>
                <Input
                  id="banner-alt"
                  placeholder="Describe la imagen (accesibilidad)"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2" aria-required="true">
                <div className="flex items-center justify-between gap-2">
                  <Label className="inline-flex items-center gap-1">
                    Web {requiredMark}
                  </Label>
                  {desktopKey ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      En la nube
                    </span>
                  ) : s3Desktop.uploading ? (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" aria-hidden />
                      <span>Subiendo…</span>
                    </span>
                  ) : desktopFile?.name ? (
                    <span
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      title="Se subirá al pulsar «Crear banner»"
                    >
                      <Upload className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <MyDropzone
                  className="p-8"
                  type="image"
                  file={desktopFile}
                  fileSetter={setDesktopFile}
                  imageOverlayRemove
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="inline-flex items-center gap-1">Móvil (opcional)</Label>
                  {mobileKey ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      En la nube
                    </span>
                  ) : s3Mobile.uploading ? (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" aria-hidden />
                      <span>Subiendo…</span>
                    </span>
                  ) : mobileFile?.name ? (
                    <span
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      title="Se subirá al pulsar «Crear banner»"
                    >
                      <Upload className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <MyDropzone
                  className="p-8"
                  type="image"
                  file={mobileFile}
                  fileSetter={setMobileFile}
                  imageOverlayRemove
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" type="button" onClick={resetForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="button" disabled={!canSave} onClick={() => void handleCreateBanner()}>
                  {saving ? "Guardando…" : "Crear banner"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Banners existentes</CardTitle>
            <CardDescription>
              Edita con el lápiz, reordena con las flechas o elimina con la papelera.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              </div>
            ) : banners.length && banners.length !== 0 ? (
              banners.map((banner: Banner, index: number) => (
                <Card
                  key={banner.id}
                  className="bg-[#EEEEEE] border border-border/60 flex flex-row items-stretch gap-0"
                >
                  <div className="flex flex-1 min-w-0 gap-3 p-3">
                    <div className="flex flex-row gap-2 shrink-0">
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <img
                          src={banner.desktopUrl}
                          alt=""
                          className="w-20 h-20 object-cover"
                        />
                      </div>
                      {banner.mobileUrl && banner.mobileUrl !== banner.desktopUrl ? (
                        <div className="border rounded-lg overflow-hidden bg-white">
                          <img
                            src={banner.mobileUrl}
                            alt=""
                            className="w-20 h-20 object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col justify-center min-w-0 py-1">
                      <p className="font-medium truncate">{displayName(banner)}</p>
                      {banner.altText ? (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{banner.altText}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1 italic">Sin texto alternativo</p>
                      )}
                    </div>
                  </div>
                  <CardFooter className="flex flex-row flex-nowrap items-center justify-center gap-1 p-2 sm:p-3 border-t sm:border-t-0 sm:border-l border-border/60 bg-[#EEEEEE] shrink-0 self-stretch">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={index === 0 || loading}
                      aria-label="Subir en el carrusel"
                      onClick={() => moveBanner(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={index >= banners.length - 1 || loading}
                      aria-label="Bajar en el carrusel"
                      onClick={() => moveBanner(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label="Editar banner"
                      onClick={() => openEdit(banner)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      aria-label="Eliminar banner"
                      onClick={() =>
                        openModal({
                          title: "banner",
                          description:
                            "Se eliminará el banner del sitio y sus imágenes en almacenamiento. Esta acción no se puede deshacer.",
                          handleDelete: () => {
                            void deleteBanner(banner.id);
                          },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <NoData>
                <AlertTriangle className="text-[#4E5154]" />
                <p className="text-[#4E5154]">No se ha creado ningún banner</p>
                <p className="text-[#94A3B8] font-semibold text-sm">Agrega uno usando el formulario superior</p>
              </NoData>
            )}
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={(open) => { if (!open) closeEdit(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar banner</DialogTitle>
              <DialogDescription>
                Cambia nombre, texto alternativo o elige nuevas imágenes; se subirán al pulsar «Guardar cambios».
              </DialogDescription>
            </DialogHeader>
            {editingBanner ? (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Nombre</Label>
                  <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-alt">Etiqueta / texto alternativo</Label>
                  <Input id="edit-alt" value={editAlt} onChange={(e) => setEditAlt(e.target.value)} maxLength={255} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nueva imagen Web (opcional)</Label>
                    <MyDropzone
                      className="p-6"
                      type="image"
                      file={editDesktopFile}
                      fileSetter={setEditDesktopFile}
                      imageOverlayRemove
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva imagen Móvil (opcional)</Label>
                    <MyDropzone
                      className="p-6"
                      type="image"
                      file={editMobileFile}
                      fileSetter={setEditMobileFile}
                      imageOverlayRemove
                    />
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeEdit} disabled={editSaving}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSaveEdit()} disabled={editSaving}>
                {editSaving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </Layout>
  );
};

export default Banners;
