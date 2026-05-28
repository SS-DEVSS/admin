import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { newsContext } from "@/context/news-context";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import MyDropzone from "@/components/Dropzone";
import MarkdownEditor from "@/components/blogs/MarkdownEditor";
import BlogPreview from "@/components/blogs/BlogPreview";
import BlogRelatedLinksEditor from "@/components/blogs/BlogRelatedLinksEditor";
import {
  BlogRelatedLinks,
  emptyRelatedLinks,
  parseContentWithRelatedLinks,
  resolveRelatedLinks,
  serializeContentWithRelatedLinks,
} from "@/utils/blogRelatedLinks";
import { hasRichTextContent } from "@/utils/richTextContent";
import { resolvePublicImageUrl } from "@/utils/imageUrl";

const EditBlog = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { blogPost, getBlogPostById, updateBlogPost } = newsContext();
  const { uploadFile } = useS3FileManager();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [relatedLinks, setRelatedLinks] = useState<BlogRelatedLinks>(emptyRelatedLinks());

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
      setCoverImage(null);
    }
  }, [blogPost]);

  const existingCoverUrl = useMemo(
    () => resolvePublicImageUrl(blogPost?.coverImagePath),
    [blogPost?.coverImagePath]
  );

  const coverImagePreview = useMemo(() => {
    if (coverImage instanceof File && coverImage.size > 0) {
      return URL.createObjectURL(coverImage);
    }
    return undefined;
  }, [coverImage]);

  useEffect(() => {
    return () => {
      if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    };
  }, [coverImagePreview]);

  const hasDescriptionContent = hasRichTextContent(description);
  const hasMainContent = hasRichTextContent(content);
  const canSave = title.trim() !== "" && hasDescriptionContent && hasMainContent;

  const missingFields = [
    !title.trim() && "título",
    !hasDescriptionContent && "descripción",
    !hasMainContent && "contenido del blog",
  ].filter(Boolean) as string[];

  const handleSave = async () => {
    if (!id || !canSave) return;
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        content: serializeContentWithRelatedLinks(content, relatedLinks),
      };

      let saved = false;
      if (coverImage instanceof File && coverImage.size > 0) {
        await new Promise<void>((resolve, reject) => {
          uploadFile(coverImage, async (key) => {
            try {
              saved = await updateBlogPost(id, { ...payload, coverImagePath: key });
              resolve();
            } catch (error) {
              reject(error);
            }
          }).catch(reject);
        });
      } else {
        saved = await updateBlogPost(id, payload);
      }

      if (saved) navigate("/dashboard/blogs");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
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
            required
            value={description}
            onChange={setDescription}
            placeholder="Escribe una descripción corta del blog."
            minHeight="120px"
          />

          <div className="space-y-2">
            <Label>Imagen de portada</Label>
            {existingCoverUrl && !coverImage ? (
              <p className="text-sm text-muted-foreground">
                Este blog ya tiene imagen de portada. Puedes mantenerla o subir otra.
              </p>
            ) : !existingCoverUrl ? (
              <p className="text-sm text-muted-foreground">
                Este blog no tiene portada. Sube una imagen (JPG, PNG o WebP).
              </p>
            ) : null}
            <MyDropzone
              className="p-8"
              file={coverImage}
              fileSetter={setCoverImage}
              type="image"
              currentImageUrl={existingCoverUrl && !coverImage ? existingCoverUrl : undefined}
              currentImageLabel="Portada actual del blog"
            />
          </div>

          <MarkdownEditor
            label="Contenido del blog"
            required
            value={content}
            onChange={setContent}
            minHeight="280px"
          />

          <div className="space-y-2">
            <Label>Vínculos del blog</Label>
            <BlogRelatedLinksEditor
              relatedLinks={relatedLinks}
              onChange={setRelatedLinks}
            />
          </div>

          <BlogPreview
            title={title}
            description={description}
            content={content}
            coverImageUrl={coverImagePreview ?? existingCoverUrl}
            relatedLinks={resolveRelatedLinks(relatedLinks)}
          />

          <div className="flex flex-col gap-2 pt-4">
            {!canSave && missingFields.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Para guardar, completa: {missingFields.join(", ")}.
              </p>
            ) : null}
            <div className="flex gap-3">
            <Link to="/dashboard/blogs">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="button" onClick={handleSave} disabled={!canSave || submitting}>
              {submitting ? "Guardando..." : "Guardar cambios"}
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
};

export default EditBlog;
