import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { assertCampuswearRole } from "./campuswear/authorization";
import {
  addCartItemSchema,
  catalogFilterSchema,
  inventoryAdjustmentSchema,
  placeOrderSchema,
  productIdSchema,
  updateCartQuantitySchema,
  updateOrderStatusSchema,
  vendorAnnouncementSchema,
  vendorAuthorizationSchema,
  vendorProductCreateSchema,
  vendorProductUpdateSchema,
  productImageUploadSchema,
  schoolAnnouncementSchema,
} from "./campuswear/schemas";
import * as campuswear from "./campuswear/repository";

// Self-service queries remain scoped to ctx.user.id. Allowing operators here lets
// authorized staff use CampusWear personally without exposing another student's data.
const studentRoles = ["user", "student", "vendor_staff", "school_admin", "platform_admin", "admin"] as const;
const vendorRoles = ["vendor_staff", "platform_admin", "admin"] as const;
const schoolAdminRoles = ["school_admin", "platform_admin", "admin"] as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  catalog: router({
    list: publicProcedure.input(catalogFilterSchema.optional()).query(({ input }) => campuswear.listCatalog(input ?? {})),
    get: publicProcedure.input(productIdSchema).query(({ input }) => campuswear.getProductDetail(input.id)),
    categories: publicProcedure.input(z.object({ schoolSlug: z.string().optional() }).optional()).query(({ input }) => campuswear.listCategories(input?.schoolSlug)),
  }),

  announcements: router({
    list: publicProcedure.input(z.object({ schoolSlug: z.string().optional() }).optional()).query(({ input }) => campuswear.listAnnouncements(input?.schoolSlug)),
  }),

  student: router({
    cart: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.getStudentCart(ctx.user.id);
    }),
    addToCart: protectedProcedure.input(addCartItemSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.addItemToCart(ctx.user.id, input.variantId, input.quantity);
    }),
    updateCartItem: protectedProcedure.input(updateCartQuantitySchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.updateItemQuantity(ctx.user.id, input.variantId, input.quantity);
    }),
    checkout: protectedProcedure.input(placeOrderSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.placeCartOrder(ctx.user.id, input.pickupLocation, input.pickupAt, input.pickupSlotId);
    }),
    orders: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.listStudentOrders(ctx.user.id);
    }),
    notifications: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.listNotifications(ctx.user.id);
    }),
    markNotificationRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, studentRoles);
      return campuswear.markNotificationRead(ctx.user.id, input.notificationId);
    }),
  }),

  vendor: router({
    dashboard: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.getVendorDashboard(ctx.user.id);
    }),
    orders: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.listVendorOrders(ctx.user.id);
    }),
    updateOrderStatus: protectedProcedure.input(updateOrderStatusSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.updateVendorOrderStatus(ctx.user.id, input.orderId, input.status);
    }),
    adjustInventory: protectedProcedure.input(inventoryAdjustmentSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.updateInventoryForVendor(ctx.user.id, input.variantId, input.quantity, input.lowStockThreshold);
    }),
    inventory: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.listVendorInventory(ctx.user.id);
    }),
    createProduct: protectedProcedure.input(vendorProductCreateSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.createVendorProduct(ctx.user.id, input);
    }),
    products: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.listVendorProducts(ctx.user.id);
    }),
    updateProduct: protectedProcedure.input(vendorProductUpdateSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.updateVendorProduct(ctx.user.id, input);
    }),
    uploadProductImage: protectedProcedure.input(productImageUploadSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.uploadVendorProductImage(ctx.user.id, input);
    }),
    publishAnnouncement: protectedProcedure.input(vendorAnnouncementSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, vendorRoles);
      return campuswear.createVendorAnnouncement(ctx.user.id, input);
    }),
  }),

  schoolAdmin: router({
    overview: protectedProcedure.query(({ ctx }) => {
      assertCampuswearRole(ctx.user, schoolAdminRoles);
      return campuswear.getSchoolOverview(ctx.user.id);
    }),
    setVendorAuthorization: protectedProcedure.input(vendorAuthorizationSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, schoolAdminRoles);
      return campuswear.setVendorAuthorization(ctx.user.id, input.vendorId, input.isAuthorized);
    }),
    publishAnnouncement: protectedProcedure.input(schoolAnnouncementSchema).mutation(({ ctx, input }) => {
      assertCampuswearRole(ctx.user, schoolAdminRoles);
      return campuswear.createSchoolAnnouncement(ctx.user.id, input);
    }),
  }),
});

export type AppRouter = typeof appRouter;
