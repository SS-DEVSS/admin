import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Image as ImageIcon, FileText, Trash2, Download, MoreVertical } from 'lucide-react';
import { useFilesContext, File } from '@/context/files-context';
import { useDeleteModal } from '@/context/delete-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ImagePreviewModal from './ImagePreviewModal';

type ViewType = 'cards' | 'table';

interface FileListProps {
  files: File[];
  onFileDeleted?: () => void;
  viewType?: ViewType;
  hasSearchQuery?: boolean;
}

const FileList = ({ files, onFileDeleted, viewType = 'cards', hasSearchQuery = false }: FileListProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { bulkDeleteFiles, deleteFile, loading } = useFilesContext();
  const { openModal } = useDeleteModal();

  const handleSelectFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    try {
      await bulkDeleteFiles(Array.from(selectedFiles));
      setSelectedFiles(new Set());
      if (onFileDeleted) {
        onFileDeleted();
      }
    } catch (error) {
      console.error('Error deleting files:', error);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedFiles.size === 0) return;
    const count = selectedFiles.size;
    openModal({
      title: `${count} archivo(s)`,
      description: `Se eliminarán ${count} archivo(s). Esta acción no se puede deshacer.`,
      handleDelete: () => {
        void handleBulkDelete();
      },
    });
  };

  const handleBulkDownload = () => {
    const selectedFileObjects = files.filter((f) => selectedFiles.has(f.id));
    selectedFileObjects.forEach((file) => {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const confirmDeleteFile = async (file: File) => {
    try {
      await deleteFile(file.id, file.type);
      if (onFileDeleted) {
        onFileDeleted();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleDeleteClick = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;
    openModal({
      title: 'archivo',
      description: 'Esta acción no se puede deshacer. El archivo se eliminará permanentemente.',
      handleDelete: () => {
        void confirmDeleteFile(file);
      },
    });
  };

  const handleImageClick = (file: File) => {
    if (file.type === 'image') {
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (files.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {hasSearchQuery
            ? 'No se encontraron archivos que coincidan con la búsqueda'
            : 'No hay archivos para mostrar'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedFiles.size === files.length && files.length > 0}
              onCheckedChange={handleSelectAll}
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">
              {selectedFiles.size > 0
                ? `${selectedFiles.size} archivo(s) seleccionado(s)`
                : 'Seleccionar todos'}
            </span>
            {selectedFiles.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles(new Set())}
                disabled={loading}
                className="text-muted-foreground"
              >
                Limpiar selección
              </Button>
            )}
          </div>
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar ({selectedFiles.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedFiles.size})
              </Button>
            </div>
          )}
        </div>

        {viewType === 'cards' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="relative group cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Checkbox overlay */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleSelectFile(file.id);
                        } else {
                          handleSelectFile(file.id);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={loading}
                      className="bg-white/90 backdrop-blur-sm"
                    />
                  </div>

                  {/* Actions menu overlay */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {file.type === 'image' && (
                          <DropdownMenuItem onClick={() => handleImageClick(file)}>
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Ver imagen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(file.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* File preview */}
                  {file.type === 'image' ? (
                    <div
                      className="relative aspect-square w-full bg-gray-100 overflow-hidden"
                      onClick={() => handleImageClick(file)}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-square w-full bg-gray-100 flex items-center justify-center">
                      <FileText className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} •{' '}
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onCheckedChange={handleSelectAll}
                      disabled={loading}
                    />
                  </TableHead>
                  <TableHead>Vista previa</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedFiles.has(file.id)}
                        onCheckedChange={() => handleSelectFile(file.id)}
                        disabled={loading}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      {file.type === 'image' ? (
                        <div
                          className="w-16 h-16 rounded overflow-hidden cursor-pointer"
                          onClick={() => handleImageClick(file)}
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{file.name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{file.type === 'image' ? 'Imagen' : 'Documento'}</span>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(file.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.type === 'image' && (
                            <DropdownMenuItem onClick={() => handleImageClick(file)}>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Ver imagen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(file.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ImagePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
      />
    </>
  );
};

export default FileList;
