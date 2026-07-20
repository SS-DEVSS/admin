import { useMemo, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, MoreVertical, Pencil, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryAtributes, CategoryAttributeApi, CategoryAttributesTypes } from "@/models/category";
import NoData from "./NoData";
import { translateAttributeName } from "@/utils/attributeTranslations";

const typeDisplayNames: Record<string, string> = {
  [CategoryAttributesTypes.STRING]: "Texto",
  [CategoryAttributesTypes.NUMERIC]: "Número",
  [CategoryAttributesTypes.DATE]: "Fecha",
  [CategoryAttributesTypes.BOOLEAN]: "Verdadero/Falso",
  STRING: "Texto",
  NUMBER: "Número",
  NUMERIC: "Número",
  DATE: "Fecha",
  BOOLEAN: "Verdadero/Falso",
};

const getTypeDisplayName = (type: string): string => {
  const normalizedType = type?.toLowerCase() || "";
  return (
    typeDisplayNames[type] ||
    typeDisplayNames[normalizedType] ||
    typeDisplayNames[type.toUpperCase()] ||
    type
  );
};

const sortableIdForAttribute = (attribute: CategoryAtributes): string => {
  if (attribute.id) return attribute.id;
  const api = attribute as CategoryAttributeApi;
  const csv = attribute.csv_name ?? api.csvName ?? "";
  const label = attribute.display_name ?? attribute.name ?? "";
  return `${attribute.scope}:${csv}:${label}`;
};

const sortByOrder = (items: CategoryAtributes[]) =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const rowKey = (attribute: CategoryAtributes, index: number) =>
  attribute.id ?? `${attribute.scope}-${attribute.order}-${index}-${attribute.name}`;

interface CardAttributeTableProps {
  title: string;
  attributes: CategoryAtributes[];
  handleEditClick: (attribute: CategoryAtributes) => void;
  handleDeleteClick: (name: string) => void;
  onReorder?: (orderedAttributes: CategoryAtributes[]) => void;
}

type SortableRowProps = {
  title: string;
  attribute: CategoryAtributes;
  displayIndex: number;
  dragEnabled: boolean;
  handleEditClick: (attribute: CategoryAtributes) => void;
  handleDeleteClick: (name: string) => void;
};

const SortableAttributeRow = ({
  title,
  attribute,
  displayIndex,
  dragEnabled,
  handleEditClick,
  handleDeleteClick,
}: SortableRowProps) => {
  const id = sortableIdForAttribute(attribute);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !dragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} data-dragging={isDragging || undefined}>
      {dragEnabled ? (
        <TableCell className="w-10 px-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        </TableCell>
      ) : null}
      <TableCell className="text-center text-muted-foreground">{displayIndex + 1}</TableCell>
      <TableCell className="font-semibold">
        {translateAttributeName(attribute.display_name || attribute.name, false)}
      </TableCell>
      <TableCell>{getTypeDisplayName(attribute.type)}</TableCell>
      <TableCell>
        <Badge>{attribute.required ? "Si" : "No"}</Badge>
      </TableCell>
      {title === "Atributos de Aplicaciones" ? (
        <TableCell>
          <Badge>{attribute.filterRequired !== false ? "Si" : "No"}</Badge>
        </TableCell>
      ) : null}
      {title === "Atributos de Producto" ? (
        <>
          <TableCell>
            <Badge variant={attribute.visibleInCatalog !== false ? "default" : "secondary"}>
              {attribute.visibleInCatalog !== false ? "Sí" : "No"}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={attribute.visibleInProductDetail !== false ? "default" : "secondary"}>
              {attribute.visibleInProductDetail !== false ? "Sí" : "No"}
            </Badge>
          </TableCell>
        </>
      ) : null}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleEditClick(attribute)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Editar Atributo</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteClick(attribute.name)}>
                <Trash className="mr-2 h-4 w-4" />
                <span>Eliminar Atributo</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

const CardAttributeTable = ({
  title: _title,
  attributes,
  handleEditClick,
  handleDeleteClick,
  onReorder,
}: CardAttributeTableProps) => {
  const sortedAttributes = useMemo(() => sortByOrder(attributes), [attributes]);

  const sortableIds = useMemo(
    () => sortedAttributes.map((a) => sortableIdForAttribute(a)),
    [sortedAttributes]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dragEnabled = Boolean(onReorder) && sortedAttributes.length > 1;

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sortedAttributes, oldIndex, newIndex));
  };

  const headerRow = (
    <TableRow>
      {onReorder && sortedAttributes.length > 1 ? <TableHead className="w-10 px-2" /> : null}
      <TableHead className="w-[50px] text-center">#</TableHead>
      <TableHead>Nombre</TableHead>
      <TableHead>Tipo de Dato</TableHead>
      <TableHead>Requerido</TableHead>
      {_title === "Atributos de Aplicaciones" ? (
        <TableHead>Requerido en filtro web</TableHead>
      ) : null}
      {_title === "Atributos de Producto" ? (
        <>
          <TableHead>Visible en Catálogo</TableHead>
          <TableHead>Visible en Detalle</TableHead>
        </>
      ) : null}
      <TableHead className="w-[20px]" />
    </TableRow>
  );

  const staticRows = sortedAttributes.map((attribute: CategoryAtributes, index: number) => (
    <TableRow key={rowKey(attribute, index)}>
      {onReorder && sortedAttributes.length > 1 ? <TableCell className="w-10 px-2" /> : null}
      <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="font-semibold">
        {translateAttributeName(attribute.display_name || attribute.name, false)}
      </TableCell>
      <TableCell>{getTypeDisplayName(attribute.type)}</TableCell>
      <TableCell>
        <Badge>{attribute.required ? "Si" : "No"}</Badge>
      </TableCell>
      {_title === "Atributos de Aplicaciones" ? (
        <TableCell>
          <Badge>{attribute.filterRequired !== false ? "Si" : "No"}</Badge>
        </TableCell>
      ) : null}
      {_title === "Atributos de Producto" ? (
        <>
          <TableCell>
            <Badge variant={attribute.visibleInCatalog !== false ? "default" : "secondary"}>
              {attribute.visibleInCatalog !== false ? "Sí" : "No"}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={attribute.visibleInProductDetail !== false ? "default" : "secondary"}>
              {attribute.visibleInProductDetail !== false ? "Sí" : "No"}
            </Badge>
          </TableCell>
        </>
      ) : null}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleEditClick(attribute)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Editar Atributo</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteClick(attribute.name)}>
                <Trash className="mr-2 h-4 w-4" />
                <span>Eliminar Atributo</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  ));

  const sortableRows = sortedAttributes.map((attribute: CategoryAtributes, index: number) => (
    <SortableAttributeRow
      key={rowKey(attribute, index)}
      title={_title}
      attribute={attribute}
      displayIndex={index}
      dragEnabled={dragEnabled}
      handleEditClick={handleEditClick}
      handleDeleteClick={handleDeleteClick}
    />
  ));

  const tableContent = (bodyRows: ReactNode) => (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>{headerRow}</TableHeader>
        <TableBody>{bodyRows}</TableBody>
      </Table>
    </div>
  );

  return (
    <>
      {sortedAttributes.length ? (
        dragEnabled ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {tableContent(sortableRows)}
            </SortableContext>
          </DndContext>
        ) : (
          tableContent(staticRows)
        )
      ) : (
        <NoData>
          <AlertTriangle className="text-[#4E5154]" />
          <p className="text-[#4E5154]">No existen atributos asociados</p>
          <p className="text-[#94A3B8] font-semibold text-sm">Agrega uno en la parte posterior</p>
        </NoData>
      )}
    </>
  );
};

export default CardAttributeTable;
