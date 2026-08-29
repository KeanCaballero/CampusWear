export type ProductPhotoAdjustment = { zoom: number; panX: number; panY: number };

export function cropSourceRect(imageWidth: number, imageHeight: number, adjustment: ProductPhotoAdjustment, targetAspect = 4 / 3) {
  const safeZoom = Math.min(2, Math.max(1, adjustment.zoom));
  const sourceAspect = imageWidth / imageHeight;
  const baseWidth = sourceAspect > targetAspect ? imageHeight * targetAspect : imageWidth;
  const baseHeight = sourceAspect > targetAspect ? imageHeight : imageWidth / targetAspect;
  const width = baseWidth / safeZoom;
  const height = baseHeight / safeZoom;
  const maxX = (imageWidth - width) / 2;
  const maxY = (imageHeight - height) / 2;
  const panX = Math.min(1, Math.max(-1, adjustment.panX));
  const panY = Math.min(1, Math.max(-1, adjustment.panY));

  return { x: (imageWidth - width) / 2 + maxX * panX, y: (imageHeight - height) / 2 + maxY * panY, width, height };
}

export async function createAdjustedProductPhoto(file: File, adjustment: ProductPhotoAdjustment): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The selected image could not be opened."));
      element.src = url;
    });
    const outputWidth = 1200;
    const outputHeight = 900;
    const source = cropSourceRect(image.width, image.height, adjustment, outputWidth / outputHeight);
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo adjustment is not available in this browser.");
    context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, outputWidth, outputHeight);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("The adjusted photo could not be prepared.")), "image/jpeg", 0.9));
    const baseName = file.name.replace(/\.[^.]+$/, "") || "product-photo";
    return new File([blob], `${baseName}-adjusted.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
