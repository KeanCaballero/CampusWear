import qrcode from "qrcode-generator";

/**
 * Pickup QR generation, entirely in the browser.
 *
 * WHAT THE CODE CONTAINS: the order number, and nothing else. `CW-B6F24BB318` identifies an order;
 * it does not authorise anyone. A vendor who scans it still has to be authenticated and still has to
 * staff the vendor that owns the order before the database will return a single field — the QR is a
 * lookup key, not a credential. That is why encoding a student's name, email, id, or any token would
 * be both unnecessary and harmful: it would put personal data on a screen held up at a counter.
 *
 * WHY IT IS GENERATED LOCALLY: the student needs the image to survive a dead connection at the
 * counter. Nothing is uploaded, nothing is fetched, and the PNG is produced from a canvas on the
 * device, so a downloaded code keeps working with the phone in aeroplane mode.
 *
 * That offline property belongs to the IMAGE only. Verifying the order still needs the vendor to
 * reach the database, and no copy in this module claims otherwise.
 */

/** Error correction level M: survives a scuffed or partly-obscured phone screen without bloating. */
const ERROR_CORRECTION = "M" as const;

/** Rendered edge, in CSS pixels, before the download is upscaled. */
const RENDER_SIZE = 220;
/** Downloaded PNGs are drawn larger so the saved image stays crisp when zoomed at a counter. */
const DOWNLOAD_SCALE = 4;
/** Quiet zone in modules, per the QR spec — scanners need the margin to find the symbol. */
const QUIET_ZONE = 4;

/** Only ever the order number. Exported so a test can assert the payload directly. */
export function pickupQrPayload(orderNumber: string): string {
  return orderNumber.trim();
}

export function pickupQrAltText(orderNumber: string): string {
  return `Pickup QR code for order ${orderNumber}`;
}

/** No student identifier of any kind reaches the filename. */
export function pickupQrFilename(orderNumber: string): string {
  return `CampusWear-${orderNumber.trim()}.png`;
}

/**
 * Draw the code onto a canvas.
 *
 * Rendered by hand from the module matrix rather than using the library's data-URL helper, because
 * that emits a GIF and the download needs a PNG at a controllable size.
 */
export function drawPickupQr(canvas: HTMLCanvasElement, orderNumber: string, pixelSize = RENDER_SIZE): void {
  const payload = pickupQrPayload(orderNumber);
  if (!payload) return;

  // Type 0 lets the library choose the smallest symbol version that fits the payload.
  const qr = qrcode(0, ERROR_CORRECTION);
  qr.addData(payload);
  qr.make();

  const modules = qr.getModuleCount();
  const total = modules + QUIET_ZONE * 2;
  const scale = Math.max(1, Math.floor(pixelSize / total));
  const edge = total * scale;

  canvas.width = edge;
  canvas.height = edge;
  const context = canvas.getContext("2d");
  if (!context) return;

  // White quiet zone first; scanners rely on the contrast, so this is never transparent.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, edge, edge);
  context.fillStyle = "#000000";
  for (let row = 0; row < modules; row++) {
    for (let column = 0; column < modules; column++) {
      if (!qr.isDark(row, column)) continue;
      context.fillRect((column + QUIET_ZONE) * scale, (row + QUIET_ZONE) * scale, scale, scale);
    }
  }
}

/** A PNG data URL of the code, drawn larger so a saved copy stays sharp. */
export function pickupQrDataUrl(orderNumber: string, documentRef: Document = document): string {
  const canvas = documentRef.createElement("canvas");
  drawPickupQr(canvas, orderNumber, RENDER_SIZE * DOWNLOAD_SCALE);
  return canvas.toDataURL("image/png");
}
