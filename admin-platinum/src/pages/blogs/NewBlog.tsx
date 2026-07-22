import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const NewBlog = () => {
  const navigate = useNavigate();
  const { addBlogPost } = newsContext();
  const { uploadFile } = useS3FileManager();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relatedLinks, setRelatedLinks] =
    useState<BlogRelatedLinks>(emptyRelatedLinks());

  const hasDescriptionContent = hasRichTextContent(description);
  const hasMainContent = hasRichTextContent(content);
  const hasCoverImage = coverImage instanceof File && coverImage.size > 0;

  const canSubmit =
    title.trim() !== "" &&
    hasDescriptionContent &&
    hasMainContent &&
    hasCoverImage;

  const missingFields = [
    !title.trim() && "título",
    !hasDescriptionContent && "descripción",
    !hasMainContent && "contenido de la noticia",
    !hasCoverImage && "imagen de portada",
  ].filter(Boolean) as string[];

  const handleSubmit = async () => {
    if (!canSubmit || !coverImage) return;
    setSubmitting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        uploadFile(coverImage, (key) => {
          addBlogPost({
            title,
            description,
            content: serializeContentWithRelatedLinks(content, relatedLinks),
            coverImagePath: key,
          });
          resolve();
        }).catch(reject);
      });
      navigate("/dashboard/blogs");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const coverImagePreview = useMemo(() => {
    if (!coverImage || typeof coverImage === "string") return undefined;
    return URL.createObjectURL(coverImage);
  }, [coverImage]);
  useEffect(() => {
    return () => {
      if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    };
  }, [coverImagePreview]);
  const cleanMainContent = parseContentWithRelatedLinks(content).cleanContent;

  return (
    <Layout>
      <div className="w-full max-w-full">
        <header className="flex flex-row flex-wrap items-center gap-4 pb-6">
          <Link
            to="/dashboard/blogs"
            className="rounded-lg p-2 border hover:bg-muted inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Nueva noticia</h1>
        </header>
        <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                <span className="text-red-500">*</span> Título
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la noticia"
                maxLength={255}
              />
            </div>

            <MarkdownEditor
              label="Descripción"
              required
              value={description}
              onChange={setDescription}
              placeholder="Escribe una descripción corta de la noticia."
              minHeight="120px"
            />

            <div className="space-y-2">
              <Label>
                <span className="text-red-500">*</span> Imagen de portada
              </Label>
              <MyDropzone
                className="p-8"
                file={coverImage}
                fileSetter={setCoverImage}
                type="image"
              />
            </div>

            <MarkdownEditor
              label="Contenido de la noticia"
              required
              value={content}
              onChange={setContent}
              placeholder="Escribe el contenido de la noticia. Usa la barra de herramientas para títulos, listas, enlaces, etc."
              minHeight="280px"
            />

            <div className="space-y-2">
              <Label>Vínculos de la noticia</Label>
              <BlogRelatedLinksEditor
                relatedLinks={relatedLinks}
                onChange={setRelatedLinks}
              />
            </div>

            <BlogPreview
              title={title}
              description={description}
              content={cleanMainContent}
              coverImageUrl={coverImagePreview}
              relatedLinks={resolveRelatedLinks(relatedLinks)}
            />

            <div className="flex flex-col gap-2 pt-4">
              {!canSubmit && !submitting && missingFields.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Para publicar, completa: {missingFields.join(", ")}.
                </p>
              ) : null}
              <div className="flex gap-3">
                <Link to="/dashboard/blogs">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Guardando..." : "Publicar noticia"}
                </Button>
              </div>
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default NewBlog;
