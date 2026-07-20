/** Tree UI for subcategories of a category: add/edit/delete nodes, link to products. */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderTree, FolderOpen, Plus, ChevronRight, ChevronDown, Trash2, Package, Pencil, MoreVertical } from "lucide-react";
import { useSubcategories, CreateSubcategoryPayload } from "@/hooks/useSubcategories";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useDeleteModal } from "@/context/delete-context";
import MyDropzone from "@/components/Dropzone";
import FilePickerModal from "@/components/files/FilePickerModal";
import type { SubcategoryTreeNode } from "../../models/subcategory";

type SubcategoryTreeProps = {
  categoryId: string;
  categoryName: string;
  onRefresh?: () => void;
};

function TreeNode({
  node,
  depth,
  categoryId,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: SubcategoryTreeNode;
  depth: number;
  categoryId: string;
  onAddChild: (parentId: string) => void;
  onEdit: (node: SubcategoryTreeNode) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div className="group flex w-fit max-w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={open ? "Colapsar" : "Expandir"}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : null}

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FolderOpen className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{node.name}</p>
          {(node.productCount ?? 0) > 0 && (
            <Link
              to={`/dashboard/productos?categoryId=${categoryId}&subcategoryId=${node.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              title={`Ver ${node.productCount} producto(s)`}
            >
              <Package className="h-3 w-3" />
              {node.productCount} producto(s)
            </Link>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Acciones de subcategoría"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onAddChild(node.id)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar subcategoría
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(node)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(node.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && hasChildren && (
        <div className="ml-[19px] border-l border-border/70 pl-2">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              categoryId={categoryId}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubcategoryTree({
  categoryId,
  categoryName,
  onRefresh,
}: SubcategoryTreeProps) {
  const { getTree, create, update, remove, loading } = useSubcategories();
  const { uploadFile, uploading } = useS3FileManager();
  const { openModal } = useDeleteModal();
  const [tree, setTree] = useState<SubcategoryTreeNode[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<"root" | string>("root");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createImage, setCreateImage] = useState<File | null>(null);
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createFilePickerOpen, setCreateFilePickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNode, setEditNode] = useState<SubcategoryTreeNode | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editFilePickerOpen, setEditFilePickerOpen] = useState(false);

  const loadTree = useCallback(async () => {
    const data = await getTree(categoryId);
    setTree(Array.isArray(data) ? data : []);
    onRefresh?.();
  }, [categoryId, getTree]);

  useEffect(() => {
    if (!categoryId) return;
    loadTree();
  }, [categoryId, loadTree]);

  const handleAddRoot = () => {
    setCreateParent("root");
    setCreateName("");
    setCreateDescription("");
    setCreateImage(null);
    setCreateImageUrl("");
    setCreateOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setCreateParent(parentId);
    setCreateName("");
    setCreateDescription("");
    setCreateImage(null);
    setCreateImageUrl("");
    setCreateOpen(true);
  };

  useEffect(() => {
    if (createImage && createImage.name && createImage instanceof File) {
      uploadFile(createImage, (_key: string, location: string) => {
        setCreateImageUrl(location);
      });
    }
  }, [createImage]);

  useEffect(() => {
    if (editImage && editImage.name && editImage instanceof File) {
      uploadFile(editImage, (_key: string, location: string) => {
        setEditImageUrl(location);
      });
    }
  }, [editImage]);

  const handleCreateSubmit = async () => {
    if (!createName.trim()) return;
    const imgUrl = createImageUrl.trim() || null;
    const payload: CreateSubcategoryPayload =
      createParent === "root"
        ? { name: createName.trim(), description: createDescription || null, imgUrl, categoryId: categoryId }
        : { name: createName.trim(), description: createDescription || null, imgUrl, parentId: createParent };
    const created = await create(payload);
    if (created) {
      setCreateOpen(false);
      setCreateImage(null);
      setCreateImageUrl("");
      await loadTree();
    }
  };

  const handleEdit = (node: SubcategoryTreeNode) => {
    setEditNode(node);
    setEditName(node.name);
    setEditDescription(node.description ?? "");
    setEditImage(null);
    setEditImageUrl(node.imgUrl ?? "");
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editNode || !editName.trim()) return;
    const updated = await update(editNode.id, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      imgUrl: editImageUrl.trim() || null,
    });
    if (updated) {
      setEditOpen(false);
      setEditNode(null);
      setEditImage(null);
      setEditImageUrl("");
      await loadTree();
    }
  };

  const handleEditDeleteImage = () => {
    setEditImage(null);
    setEditImageUrl("");
  };

  const handleDelete = (id: string) => {
    openModal({
      title: "subcategoría",
      description:
        "Si tiene subcategorías hijas también se eliminarán. Los productos asignados quedarán sin subcategoría (ninguna). Esta acción no se puede deshacer.",
      handleDelete: async () => {
        const ok = await remove(id);
        if (ok) await loadTree();
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            <CardTitle>Subcategorías</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 w-full sm:w-auto border-muted-foreground/30" onClick={handleAddRoot}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar subcategoría raíz
          </Button>
        </div>
        <CardDescription>
          Árbol de subcategorías de «{categoryName}». Puedes agregar subcategorías en cualquier nivel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay subcategorías. Agrega una como raíz.</p>
        ) : (
          <div className="space-y-0">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                categoryId={categoryId}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createParent === "root" ? "Nueva subcategoría raíz" : "Nueva subcategoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subcat-name">Nombre</Label>
              <Input
                id="subcat-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nombre de la subcategoría"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subcat-desc">Descripción (opcional)</Label>
              <Textarea
                id="subcat-desc"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Descripción"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Imagen (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateFilePickerOpen(true)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Buscar en archivos
                </Button>
              </div>
              <MyDropzone
                file={createImage}
                fileSetter={setCreateImage}
                type="image"
                className="p-6 min-h-[160px] border-2 border-dashed border-gray-200 rounded-lg bg-white"
                currentImageUrl={createImageUrl && !createImage ? createImageUrl : undefined}
                emptyTextStyle="reference"
              />
              {uploading && (
                <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateSubmit} disabled={!createName.trim() || loading || uploading}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FilePickerModal
        open={createFilePickerOpen}
        onOpenChange={setCreateFilePickerOpen}
        onSelectFile={(fileUrl) => setCreateImageUrl(fileUrl)}
        filterType="image"
      />

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditNode(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar subcategoría</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-subcat-name">Nombre</Label>
              <Input
                id="edit-subcat-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre de la subcategoría"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-subcat-desc">Descripción (opcional)</Label>
              <Textarea
                id="edit-subcat-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Descripción"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Imagen (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFilePickerOpen(true)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Buscar en archivos
                </Button>
              </div>
              <MyDropzone
                file={editImage}
                fileSetter={setEditImage}
                type="image"
                className="p-6 min-h-[160px] border-2 border-dashed border-gray-200 rounded-lg bg-white"
                currentImageUrl={editImageUrl && !editImage ? editImageUrl : undefined}
                emptyTextStyle="reference"
              />
              {editImageUrl && !editImage && (
                <div className="mt-2 flex justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleEditDeleteImage}
                    disabled={uploading}
                  >
                    Eliminar imagen
                  </Button>
                </div>
              )}
              {uploading && (
                <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditNode(null); }}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleEditSubmit} disabled={!editName.trim() || loading || uploading}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FilePickerModal
        open={editFilePickerOpen}
        onOpenChange={setEditFilePickerOpen}
        onSelectFile={(fileUrl) => setEditImageUrl(fileUrl)}
        filterType="image"
      />
    </Card>
  );
}
