import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const campuswearRoles = ["user", "student", "vendor_staff", "school_admin", "platform_admin", "admin"] as const;
const orderStatuses = ["pending", "confirmed", "preparing", "ready_for_pickup", "completed", "cancelled", "rejected"] as const;
const pickupStatuses = ["scheduled", "ready", "picked_up"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", campuswearRoles).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: int("schoolId").references(() => schools.id, { onDelete: "set null" }),
  studentNumber: varchar("studentNumber", { length: 64 }),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("profiles_user_unique").on(table.userId), index("profiles_school_idx").on(table.schoolId)]);

export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull(),
  supportEmail: varchar("supportEmail", { length: 320 }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Manila"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("schools_code_unique").on(table.code), uniqueIndex("schools_slug_unique").on(table.slug)]);

export const schoolMemberships = mysqlTable("schoolMemberships", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["student", "vendor_staff", "school_admin"] as const).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("school_memberships_scope_unique").on(table.schoolId, table.userId), index("school_memberships_user_idx").on(table.userId)]);

export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull(),
  pickupLocation: varchar("pickupLocation", { length: 160 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  isAuthorized: boolean("isAuthorized").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("vendors_school_slug_unique").on(table.schoolId, table.slug), index("vendors_school_idx").on(table.schoolId)]);

export const vendorStaff = mysqlTable("vendorStaff", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("vendor_staff_unique").on(table.vendorId, table.userId), index("vendor_staff_user_idx").on(table.userId)]);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("categories_school_slug_unique").on(table.schoolId, table.slug), index("categories_school_idx").on(table.schoolId)]);

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  vendorId: int("vendorId").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }),
  priceInCentavos: int("priceInCentavos").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("products_school_active_idx").on(table.schoolId, table.isActive), index("products_vendor_idx").on(table.vendorId), index("products_category_idx").on(table.categoryId)]);

export const productVariants = mysqlTable("productVariants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  size: varchar("size", { length: 32 }).notNull(),
  sku: varchar("sku", { length: 80 }).notNull(),
  priceInCentavos: int("priceInCentavos"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("product_variant_sku_unique").on(table.sku), uniqueIndex("product_variant_size_unique").on(table.productId, table.size), index("product_variants_product_idx").on(table.productId)]);

export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  variantId: int("variantId").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: int("quantity").notNull().default(0),
  lowStockThreshold: int("lowStockThreshold").notNull().default(5),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("inventory_variant_unique").on(table.variantId), index("inventory_quantity_idx").on(table.quantity)]);

export const inventoryMovements = mysqlTable("inventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId").notNull().references(() => inventory.id, { onDelete: "cascade" }),
  quantityDelta: int("quantityDelta").notNull(),
  reason: varchar("reason", { length: 80 }).notNull(),
  referenceType: varchar("referenceType", { length: 80 }),
  referenceId: int("referenceId"),
  createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("inventory_movements_inventory_idx").on(table.inventoryId), index("inventory_movements_reference_idx").on(table.referenceType, table.referenceId)]);

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("carts_student_school_unique").on(table.studentId, table.schoolId), index("carts_student_idx").on(table.studentId)]);

export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: int("variantId").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: int("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("cart_items_cart_variant_unique").on(table.cartId, table.variantId), index("cart_items_cart_idx").on(table.cartId)]);

export const pickupSlots = mysqlTable("pickupSlots", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  capacity: int("capacity").notNull().default(20),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("pickup_slots_vendor_time_idx").on(table.vendorId, table.startsAt)]);

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull(),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "restrict" }),
  vendorId: int("vendorId").notNull().references(() => vendors.id, { onDelete: "restrict" }),
  studentId: int("studentId").notNull().references(() => users.id, { onDelete: "restrict" }),
  pickupSlotId: int("pickupSlotId").references(() => pickupSlots.id, { onDelete: "set null" }),
  pickupLocation: varchar("pickupLocation", { length: 160 }).notNull(),
  pickupAt: timestamp("pickupAt"),
  status: mysqlEnum("status", orderStatuses).notNull().default("pending"),
  pickupStatus: mysqlEnum("pickupStatus", pickupStatuses).notNull().default("scheduled"),
  totalInCentavos: int("totalInCentavos").notNull(),
  placedAt: timestamp("placedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [uniqueIndex("orders_number_unique").on(table.orderNumber), index("orders_student_idx").on(table.studentId, table.placedAt), index("orders_vendor_status_idx").on(table.vendorId, table.status), index("orders_school_status_idx").on(table.schoolId, table.status)]);

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  productName: varchar("productName", { length: 160 }).notNull(),
  variantSize: varchar("variantSize", { length: 32 }).notNull(),
  unitPriceInCentavos: int("unitPriceInCentavos").notNull(),
  quantity: int("quantity").notNull(),
  lineTotalInCentavos: int("lineTotalInCentavos").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("order_items_order_idx").on(table.orderId), index("order_items_variant_idx").on(table.variantId)]);

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  vendorId: int("vendorId").references(() => vendors.id, { onDelete: "cascade" }),
  authorId: int("authorId").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("announcements_school_active_idx").on(table.schoolId, table.isActive, table.createdAt), index("announcements_vendor_idx").on(table.vendorId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientUserId: int("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: int("schoolId").references(() => schools.id, { onDelete: "cascade" }),
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notifications_recipient_read_idx").on(table.recipientUserId, table.readAt, table.createdAt), index("notifications_order_idx").on(table.orderId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
