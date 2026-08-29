import { z } from "zod";
import { ORDER_STATUSES } from "./domain";

export const catalogFilterSchema = z.object({
  schoolSlug: z.string().trim().min(2).max(80).optional(),
  categorySlug: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().max(100).optional(),
});

export const productIdSchema = z.object({ id: z.number().int().positive() });

export const addCartItemSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10),
});

export const updateCartQuantitySchema = addCartItemSchema;

export const placeOrderSchema = z.object({
  pickupSlotId: z.number().int().positive().optional(),
  pickupLocation: z.string().trim().min(2).max(160),
  pickupAt: z.date().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.number().int().positive(),
  status: z.enum(ORDER_STATUSES),
});

export const inventoryAdjustmentSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(0).max(10000),
  lowStockThreshold: z.number().int().min(0).max(1000),
});

export const productInputSchema = z.object({
  vendorId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
  imageUrl: z.string().url().max(500).optional(),
  priceInCentavos: z.number().int().positive().max(500000),
  isActive: z.boolean().default(true),
});

export const vendorProductCreateSchema = productInputSchema.extend({
  variants: z.array(z.object({
    size: z.string().trim().min(1).max(32),
    sku: z.string().trim().min(3).max(80),
    quantity: z.number().int().min(0).max(10000),
    lowStockThreshold: z.number().int().min(0).max(1000).default(5),
  })).min(1).max(8),
});

export const vendorProductUpdateSchema = productInputSchema.extend({
  productId: z.number().int().positive(),
});

export const productImageUploadSchema = z.object({
  vendorId: z.number().int().positive().optional(),
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(16).max(5_600_000),
});

export const announcementInputSchema = z.object({
  schoolId: z.number().int().positive(),
  vendorId: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(2000),
  expiresAt: z.date().optional(),
});

export const vendorAnnouncementSchema = z.object({
  vendorId: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(2000),
  expiresAt: z.date().optional(),
});

export const vendorAuthorizationSchema = z.object({
  vendorId: z.number().int().positive(),
  isAuthorized: z.boolean(),
});

export const schoolAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(2000),
  expiresAt: z.date().optional(),
});
