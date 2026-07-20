import { useEffect, useState } from 'react';
import { useFilesContext } from '@/context/files-context';
import Layout from '@/components/Layouts/Layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ChevronLeft, ChevronRight, Loader2, Upload, Search, Grid3x3, List, X, ArrowUpDown, SlidersHorizontal, RefreshCw } from 'lucide-react';
import FileList from '@/components/files/FileList';
import FileUploadModal from '@/components/files/FileUploadModal';

type FilterType = 'all' | 'image' | 'document';
type ViewType = 'cards' | 'table';

const FileManager = () => {
  const {
    files,
    loading,
    total,
    totalPages,
    currentPage,
    filterType,
    getFiles,
    setFilterType: setContextFilterType,
  } = useFilesContext();

  const [page, setPage] = useState(1);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewType, setViewType] = useState<ViewType>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      const previousSearch = debouncedSearch;
      setDebouncedSearch(searchQuery);
      // Reset page to 1 when search actually changes
      if (searchQuery !== previousSearch) {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    const type = filterType === 'all' ? undefined : filterType;
    const search = debouncedSearch && debouncedSearch.trim() ? debouncedSearch.trim() : undefined;
    // Only fetch if we have a search query or if debouncedSearch is empty (to show all files)
    if (search !== undefined || debouncedSearch === '') {
      getFiles(type, page, limit, search, sortBy, sortOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, page, debouncedSearch, sortBy, sortOrder]);

  const handleFilterChange = (value: string) => {
    setContextFilterType(value as FilterType);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = () => {
    const type = filterType === 'all' ? undefined : filterType;
    getFiles(type, page, limit, debouncedSearch || undefined, sortBy, sortOrder);
  };

  const handleClearSearch = () => {
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

  const activeFilterCount = filterType !== 'all' ? 1 : 0;

  const clearFilters = () => {
    setContextFilterType('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const sortSelect = (
    <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
      <SelectTrigger className="w-full sm:w-[220px]">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="createdAt-desc">Fecha (Más reciente)</SelectItem>
        <SelectItem value="createdAt-asc">Fecha (Más antiguo)</SelectItem>
        <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
        <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
      </SelectContent>
    </Select>
  );

  const typeSelect = (
    <Select value={filterType} onValueChange={handleFilterChange}>
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="image">Imágenes</SelectItem>
        <SelectItem value="document">Documentos</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Administrador de Archivos
        </h1>
        {total !== undefined && (
          <p className="text-sm text-muted-foreground mt-1">
            {total} archivo(s) en total
          </p>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2 w-full sm:flex-1 sm:min-w-[260px] sm:max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de archivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                  onClick={handleClearSearch}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <Button className="shrink-0" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Subir Archivos</span>
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Drawer direction="bottom">
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:hidden gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto flex w-full max-w-md flex-col min-h-0">
                  <DrawerHeader>
                    <DrawerTitle>Filtrar y ordenar archivos</DrawerTitle>
                    <DrawerDescription>
                      Ajusta el orden y filtra por tipo de archivo.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex flex-col gap-4 overflow-y-auto px-4 py-1">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Ordenar por</label>
                      {sortSelect}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Tipo</label>
                      {typeSelect}
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      disabled={activeFilterCount === 0 && sortBy === 'createdAt' && sortOrder === 'desc'}
                    >
                      Limpiar filtros
                    </Button>
                    <DrawerClose asChild>
                      <Button>Ver resultados</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              {sortSelect}
              {typeSelect}
            </div>
            <div className="flex shrink-0 border rounded-md">
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
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 sm:mr-2" />
              )}
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Actualizar</span>
            </Button>
          </div>
        </div>

        {loading && files.length === 0 ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Cargando archivos...</p>
          </div>
        ) : (
          <>
            <FileList
              files={files}
              onFileDeleted={handleRefresh}
              viewType={viewType}
              hasSearchQuery={!!debouncedSearch}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <FileUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={handleRefresh}
      />
    </Layout>
  );
};

export default FileManager;
