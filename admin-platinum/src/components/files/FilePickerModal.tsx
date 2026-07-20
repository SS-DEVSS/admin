import { useEffect, useState } from 'react';
import { useFilesContext } from '@/context/files-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, X, ChevronLeft, ChevronRight, Grid3x3, List } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type ViewType = 'cards' | 'table';

interface FilePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFile: (fileUrl: string) => void;
  filterType?: 'image' | 'document';
}

const FilePickerModal = ({
  open,
  onOpenChange,
  onSelectFile,
  filterType = 'image'
}: FilePickerModalProps) => {
  const {
    files,
    loading,
    totalPages,
    getFiles,
  } = useFilesContext();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewType, setViewType] = useState<ViewType>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 20;

  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchQuery('');
      setDebouncedSearch('');
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery !== debouncedSearch) {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    if (open) {
      const search = debouncedSearch && debouncedSearch.trim() ? debouncedSearch.trim() : undefined;
      getFiles(filterType, page, limit, search, sortBy, sortOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterType, page, debouncedSearch, sortBy, sortOrder]);

  const handleSelect = (fileUrl: string) => {
    onSelectFile(fileUrl);
    onOpenChange(false);
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-');
    setSortBy(field as 'name' | 'createdAt');
    setSortOrder(order as 'asc' | 'desc');
    setPage(1);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Imagen</DialogTitle>
          <DialogDescription>
            Navega y selecciona una imagen de los archivos subidos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 p-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Fecha (Más reciente)</SelectItem>
                  <SelectItem value="createdAt-asc">Fecha (Más antiguo)</SelectItem>
                  <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewType === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewType('cards')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewType('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && files.length === 0 ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Cargando archivos...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  {debouncedSearch
                    ? 'No se encontraron archivos que coincidan con la búsqueda'
                    : 'No hay imágenes disponibles'}
                </p>
              </div>
            ) : viewType === 'cards' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((file) => (
                  <Card
                    key={file.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelect(file.url)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square w-full bg-gray-100 rounded-t overflow-hidden">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
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
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Vista previa</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tamaño</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="border-t cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSelect(file.url)}
                      >
                        <td className="px-4 py-3">
                          <div className="w-16 h-16 rounded overflow-hidden">
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{file.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(file.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (page > 1) {
                      setPage(page - 1);
                    }
                  }}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (page < totalPages) {
                      setPage(page + 1);
                    }
                  }}
                  disabled={page >= totalPages || loading}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePickerModal;
