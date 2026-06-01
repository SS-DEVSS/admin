/**
 * Convierte una imagen a formato WebP
 * @param file - Archivo de imagen a convertir
 * @param quality - Calidad de compresión (0-1), por defecto 0.85
 * @param maxDimension - Lado máximo en px (mantiene proporción)
 * @returns Promise<File> - Archivo WebP convertido
 */
export const convertImageToWebP = async (
  file: File,
  quality: number = 0.85,
  maxDimension: number = 1920
): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    // Si ya es WebP, retornarlo sin convertir
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }

        let targetWidth = img.width;
        let targetHeight = img.height;
        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al convertir la imagen a WebP'));
              return;
            }

            // Crear nuevo File con extensión .webp
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const webpFile = new File([blob], `${originalName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
};

