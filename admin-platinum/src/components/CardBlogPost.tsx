import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useDeleteModal } from "@/context/delete-context";
import { BlogPost } from "@/models/news";
import { newsContext } from "@/context/news-context";

type CardTemplateProps = {
  blogPost?: BlogPost;
  getItems?: () => void;
  deleteItem?: (id: BlogPost["id"]) => void;
  /** Ruta a la que ir al editar (ej. /dashboard/blogs/editar). Si no se pasa, usa /dashboard/noticias/editar */
  editPath?: string;
};

const stripHtmlTags = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const CardBlogPost = ({ blogPost, deleteItem, editPath = "/dashboard/noticias/editar" }: CardTemplateProps) => {
  const { openModal } = useDeleteModal();
  const { getBlogPostById } = newsContext();

  const handleEditBlogPost = async (id: BlogPost["id"]) => {
    await getBlogPostById(id);
  };

  const handleDeleteBlogPost = () => {
    if (deleteItem && blogPost?.id) {
      void deleteItem(blogPost.id);
    }
  };

  return (
    <>
      <Card className="w-full overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md">
        <img
          src={blogPost!.coverImagePath}
          alt={`${blogPost?.title} image`}
          className="h-[260px] w-full object-cover bg-[#D9D9D9] mx-auto"
        />
        <CardContent className="border-t p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="mb-2 line-clamp-2 text-base">{blogPost?.title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-md p-1 hover:bg-muted">
                  <MoreHorizontal className="hover:cursor-pointer" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <Link to={`${editPath}/${blogPost?.id}`}>
                    <DropdownMenuItem
                      onClick={() => handleEditBlogPost(blogPost?.id!)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem
                    onClick={() =>
                      openModal({
                        title: "Noticia",
                        description:
                          "¿Estás seguro de que deseas eliminar esta noticia? Esta acción no se puede deshacer.",
                        handleDelete: handleDeleteBlogPost,
                      })
                    }
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Eliminar</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="line-clamp-3 leading-6">
            {stripHtmlTags(blogPost?.description || "")}
          </CardDescription>
        </CardContent>
      </Card>
    </>
  );
};

export default CardBlogPost;
