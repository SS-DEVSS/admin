import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResolvedBlogRelatedLinks } from "@/utils/blogRelatedLinks";

type BlogPreviewProps = {
  title: string;
  description: string;
  content: string;
  coverImageUrl?: string;
  relatedLinks: ResolvedBlogRelatedLinks;
};

export default function BlogPreview({
  title,
  description,
  content,
  coverImageUrl,
  relatedLinks,
}: BlogPreviewProps) {
  const hasRelatedLinks =
    relatedLinks.products.length > 0 ||
    relatedLinks.references.length > 0 ||
    relatedLinks.applications.length > 0;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Vista previa de la noticia</CardTitle>
        <CardDescription>Así se mostrará el contenido principal al publicarlo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt="Vista previa portada"
            className="w-full max-h-72 rounded-lg object-cover border"
          />
        ) : null}

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{title || "Título de la noticia"}</h2>
          <div
            className="text-muted-foreground leading-relaxed [&_p]:mb-2"
            dangerouslySetInnerHTML={{
              __html: description || "<p>Descripción de la noticia...</p>",
            }}
          />
        </div>

        <article
          className="prose prose-sm max-w-none [&_img]:max-h-72 [&_img]:rounded-md [&_img]:object-cover"
          dangerouslySetInnerHTML={{ __html: content || "<p>Contenido de la noticia...</p>" }}
        />

        {hasRelatedLinks ? (
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Contenido vinculado</h3>

            {relatedLinks.products.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Productos</p>
                <ul className="list-disc pl-5 text-sm">
                  {relatedLinks.products.map((product) => (
                    <li key={product.id}>
                      <a href={product.adminHref} className="text-primary hover:underline">
                        {product.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {relatedLinks.references.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Referencias</p>
                <ul className="list-disc pl-5 text-sm">
                  {relatedLinks.references.map((reference) => (
                    <li key={reference}>{reference}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {relatedLinks.applications.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Aplicaciones</p>
                <ul className="list-disc pl-5 text-sm">
                  {relatedLinks.applications.map((application) => (
                    <li key={application}>{application}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
