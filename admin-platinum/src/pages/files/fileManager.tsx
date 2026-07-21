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
      <div className="w-full max-w-full">
        <div className="flex flex-col gap-4 pb-6 w-full">
          <div className="flex flex-row flex-wrap items-center justify-between gap-4 w-full">
            <div>
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                Administrador de Archivos
              </h1>
              {total !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  {total} archivo(s) en total
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                className="h-10 px-4 gap-2 flex-1 sm:flex-none"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload className="h-4 w-4 shrink-0" />
                Subir Archivos
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 px-4 gap-2 flex-1 sm:flex-none bg-[#F4F4F5] hover:bg-[#E4E4E7] hover:text-foreground"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0" />
                )}
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center w-full">
            <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
              <div className="relative flex-1 lg:max-w-[336px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre de archivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-background pl-8 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <Drawer direction="bottom">
                <DrawerTrigger asChild>
                  <Button variant="outline" className="gap-2 shrink-0 lg:hidden">
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
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Vista</label>
                        <div className="flex border rounded-md w-fit">
                          <Button
                            variant={viewType === 'cards' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-r-none"
                            onClick={() => setViewType('cards')}
                          >
                            <Grid3x3 className="h-4 w-4 mr-2" />
                            Tarjetas
                          </Button>
                          <Button
                            variant={viewType === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-l-none"
                            onClick={() => setViewType('table')}
                          >
                            <List className="h-4 w-4 mr-2" />
                            Tabla
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DrawerFooter>
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        disabled={
                          activeFilterCount === 0 &&
                          sortBy === 'createdAt' &&
                          sortOrder === 'desc'
                        }
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
            </div>
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              {sortSelect}
              {typeSelect}
              <div className="flex shrink-0 border rounded-md">
                <Button
                  variant={viewType === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none h-10"
                  onClick={() => setViewType('cards')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none h-10"
                  onClick={() => setViewType('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
