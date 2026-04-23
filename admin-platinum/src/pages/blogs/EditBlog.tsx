import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { newsContext } from "@/context/news-context";
import MarkdownEditor from "@/components/blogs/MarkdownEditor";
import BlogPreview from "@/components/blogs/BlogPreview";
import BlogRelatedLinksEditor from "@/components/blogs/BlogRelatedLinksEditor";
import { useProducts } from "@/hooks/useProducts";
import {
  BlogRelatedLinks,
  emptyRelatedLinks,
  parseContentWithRelatedLinks,
  resolveRelatedLinks,
  serializeContentWithRelatedLinks,
} from "@/utils/blogRelatedLinks";

const stripHtmlTags = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const EditBlog = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { blogPost, getBlogPostById, updateBlogPost } = newsContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [relatedLinks, setRelatedLinks] = useState<BlogRelatedLinks>(emptyRelatedLinks());
  const { products, loading: productsLoading } = useProducts();

  useEffect(() => {
    let mounted = true;
    if (!id) {
      navigate("/dashboard/blogs", { replace: true });
      return;
    }
    getBlogPostById(id).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
    // getBlogPostById viene del context y cambia de referencia en cada render;
    // si lo incluimos en deps dispara fetch infinito del mismo blog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    if (blogPost) {
      setTitle(blogPost.title ?? "");
      setDescription(blogPost.description ?? "");
      const parsed = parseContentWithRelatedLinks(blogPost.content ?? "");
      setContent(parsed.cleanContent);
      setRelatedLinks(parsed.relatedLinks);
    }
  }, [blogPost]);

  const hasDescriptionContent = stripHtmlTags(description) !== "";
  const hasMainContent = stripHtmlTags(content) !== "";
  const canSave = title.trim() !== "" && hasDescriptionContent && hasMainContent;

  const handleSave = async () => {
    if (!id || !canSave) return;
    const saved = await updateBlogPost(id, {
      title,
      description,
      content: serializeContentWithRelatedLinks(content, relatedLinks),
    });
    if (saved) navigate("/dashboard/blogs");
  };

  if (loading || !blogPost) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full flex justify-center px-4">
        <Card className="max-w-4xl w-full">
        <CardHeader className="flex flex-row flex-wrap items-center gap-4">
          <Link
            to="/dashboard/blogs"
            className="rounded-lg p-2 border hover:bg-muted inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <CardTitle>Editar blog</CardTitle>
            <CardDescription>
              Edita el contenido con el editor enriquecido de TipTap.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del blog"
              maxLength={255}
            />
          </div>

          <MarkdownEditor
            label="Descripción"
            value={description}
            onChange={setDescription}
            placeholder="Escribe una descripción corta del blog."
            minHeight="120px"
          />

          <div className="space-y-2">
            <Label>Imagen de portada</Label>
            {blogPost?.coverImagePath && (
              <img
                src={blogPost.coverImagePath}
                alt="Portada"
                className="rounded-lg border max-h-40 object-cover"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Cambiar imagen de portada estará disponible próximamente.
            </p>
          </div>

          <MarkdownEditor
            label="Contenido del blog"
            value={content}
            onChange={setContent}
            minHeight="280px"
          />

          <div className="space-y-2">
            <Label>Vínculos del blog</Label>
            <BlogRelatedLinksEditor
              products={products}
              productsLoading={productsLoading}
              relatedLinks={relatedLinks}
              onChange={setRelatedLinks}
            />
          </div>

          <BlogPreview
            title={title}
            description={description}
            content={content}
            coverImageUrl={blogPost.coverImagePath}
            relatedLinks={resolveRelatedLinks(relatedLinks, products)}
          />

          <div className="flex gap-3 pt-4">
            <Link to="/dashboard/blogs">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="button" onClick={handleSave} disabled={!canSave}>
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
};

export default EditBlog;
