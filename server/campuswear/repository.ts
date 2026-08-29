import { and, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import {
  announcements,
  cartItems,
  carts,
  categories,
  inventory,
  inventoryMovements,
  notifications,
  orderItems,
  orders,
  productVariants,
  products,
  schoolMemberships,
  schools,
  vendorStaff,
  vendors,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import {
  canTransitionOrder,
  getInventoryAvailability,
  getOrderStatusLabel,
  inventoryDeductionSucceeded,
  OrderLineInput,
  OrderStatus,
  validateCartQuantity,
  validateOrderLines,
} from "./domain";

export type CatalogFilter = {
  schoolSlug?: string;
  categorySlug?: string;
  search?: string;
};

export type CartItemRow = {
  cartItemId: number;
  quantity: number;
  variantId: number;
  size: string;
  productId: number;
  productName: string;
  imageUrl: string | null;
  productPriceInCentavos: number;
  variantPriceInCentavos: number | null;
  vendorId: number;
  vendorName: string;
  schoolId: number;
  schoolName: string;
  availableQuantity: number;
  lowStockThreshold: number;
};

function orderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CW-${timestamp}-${random}`;
}

export function toProductSummary(rows: Array<{
  productId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  priceInCentavos: number;
  vendorName: string;
  schoolName: string;
  categoryName: string | null;
  variantId: number | null;
  size: string | null;
  quantity: number | null;
  lowStockThreshold: number | null;
}>) {
  const productsById = new Map<number, {
    id: number;
    name: string;
    description: string;
    imageUrl: string | null;
    priceInCentavos: number;
    vendorName: string;
    schoolName: string;
    categoryName: string | null;
    variants: Array<{ id: number; size: string; availability: ReturnType<typeof getInventoryAvailability> }>;
  }>();

  for (const row of rows) {
    const existing = productsById.get(row.productId) ?? {
      id: row.productId,
      name: row.name,
      description: row.description,
      imageUrl: row.imageUrl,
      priceInCentavos: row.priceInCentavos,
      vendorName: row.vendorName,
      schoolName: row.schoolName,
      categoryName: row.categoryName,
      variants: [],
    };

    if (row.variantId && row.size && row.quantity !== null && row.lowStockThreshold !== null) {
      existing.variants.push({
        id: row.variantId,
        size: row.size,
        availability: getInventoryAvailability({ quantity: row.quantity, lowStockThreshold: row.lowStockThreshold }),
      });
    }
    productsById.set(row.productId, existing);
  }

  return Array.from(productsById.values());
}

export async function listCatalog(filter: CatalogFilter) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(products.isActive, true), eq(vendors.isActive, true), eq(vendors.isAuthorized, true)];
  if (filter.schoolSlug) conditions.push(eq(schools.slug, filter.schoolSlug));
  if (filter.categorySlug) conditions.push(eq(categories.slug, filter.categorySlug));
  if (filter.search) conditions.push(like(products.name, `%${filter.search}%`));

  const rows = await db
    .select({
      productId: products.id,
      name: products.name,
      description: products.description,
      imageUrl: products.imageUrl,
      priceInCentavos: products.priceInCentavos,
      vendorName: vendors.name,
      schoolName: schools.name,
      categoryName: categories.name,
      variantId: productVariants.id,
      size: productVariants.size,
      quantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .innerJoin(schools, eq(products.schoolId, schools.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));

  return toProductSummary(rows);
}

export async function getProductDetail(productId: number) {
  const catalog = await listCatalog({});
  return catalog.find(product => product.id === productId) ?? null;
}

export async function listCategories(schoolSlug?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(schools.isActive, true)];
  if (schoolSlug) conditions.push(eq(schools.slug, schoolSlug));

  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, schoolName: schools.name })
    .from(categories)
    .innerJoin(schools, eq(categories.schoolId, schools.id))
    .where(and(...conditions))
    .orderBy(categories.sortOrder, categories.name);
}

export async function listAnnouncements(schoolSlug?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(announcements.isActive, true), or(isNull(announcements.expiresAt), gt(announcements.expiresAt, new Date()))];
  if (schoolSlug) conditions.push(eq(schools.slug, schoolSlug));

  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      createdAt: announcements.createdAt,
      expiresAt: announcements.expiresAt,
      schoolName: schools.name,
      vendorName: vendors.name,
    })
    .from(announcements)
    .innerJoin(schools, eq(announcements.schoolId, schools.id))
    .leftJoin(vendors, eq(announcements.vendorId, vendors.id))
    .where(and(...conditions))
    .orderBy(desc(announcements.createdAt));
}

async function getCartRows(studentId: number): Promise<CartItemRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      cartItemId: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      size: productVariants.size,
      productId: products.id,
      productName: products.name,
      imageUrl: products.imageUrl,
      productPriceInCentavos: products.priceInCentavos,
      variantPriceInCentavos: productVariants.priceInCentavos,
      vendorId: vendors.id,
      vendorName: vendors.name,
      schoolId: schools.id,
      schoolName: schools.name,
      availableQuantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
    })
    .from(carts)
    .innerJoin(cartItems, eq(cartItems.cartId, carts.id))
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .innerJoin(schools, eq(products.schoolId, schools.id))
    .innerJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(carts.studentId, studentId));
}

export async function getStudentCart(studentId: number) {
  const rows = await getCartRows(studentId);
  return rows.map(item => ({
    ...item,
    unitPriceInCentavos: item.variantPriceInCentavos ?? item.productPriceInCentavos,
    availability: getInventoryAvailability({ quantity: item.availableQuantity, lowStockThreshold: item.lowStockThreshold }),
  }));
}

export async function addItemToCart(studentId: number, variantId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");

  const [variant] = await db
    .select({ schoolId: products.schoolId, variantId: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.isActive, true), eq(products.isActive, true)))
    .limit(1);
  if (!variant) throw new Error("This size is no longer available.");

  await db.transaction(async tx => {
    const [existingCart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.studentId, studentId), eq(carts.schoolId, variant.schoolId)))
      .limit(1);

    let cartId = existingCart?.id;
    if (!cartId) {
      await tx.insert(carts).values({ studentId, schoolId: variant.schoolId });
      const [createdCart] = await tx
        .select({ id: carts.id })
        .from(carts)
        .where(and(eq(carts.studentId, studentId), eq(carts.schoolId, variant.schoolId)))
        .limit(1);
      cartId = createdCart?.id;
    }
    if (!cartId) throw new Error("Unable to prepare your cart.");

    const [existingItem] = await tx
      .select({ id: cartItems.id, quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
      .limit(1);

    const [stock] = await tx
      .select({ quantity: inventory.quantity })
      .from(inventory)
      .where(eq(inventory.variantId, variantId))
      .limit(1);
    if (!stock || stock.quantity <= 0) throw new Error("This size is currently out of stock.");
    const requestedQuantity = (existingItem?.quantity ?? 0) + quantity;
    validateCartQuantity(requestedQuantity, stock.quantity);

    if (existingItem) {
      await tx.update(cartItems).set({ quantity: requestedQuantity }).where(eq(cartItems.id, existingItem.id));
    } else {
      await tx.insert(cartItems).values({ cartId, variantId, quantity });
    }
  });

  return getStudentCart(studentId);
}

export async function updateItemQuantity(studentId: number, variantId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const rows = await getCartRows(studentId);
  const item = rows.find(row => row.variantId === variantId);
  if (!item) throw new Error("Cart item not found.");

  if (quantity === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.cartItemId));
  } else {
    validateCartQuantity(quantity, item.availableQuantity);
    await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, item.cartItemId));
  }
  return getStudentCart(studentId);
}

function resultAffectedRows(result: unknown) {
  if (Array.isArray(result)) {
    const [header] = result as Array<{ affectedRows?: number }>;
    return header?.affectedRows ?? 0;
  }
  if (typeof result === "object" && result !== null && "affectedRows" in result) {
    return Number((result as { affectedRows?: number }).affectedRows ?? 0);
  }
  return 0;
}

export async function placeCartOrder(
  studentId: number,
  pickupLocation: string,
  pickupAt?: Date,
  pickupSlotId?: number,
) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");

  const cart = await getCartRows(studentId);
  const lines = validateOrderLines(cart.map(item => ({ variantId: item.variantId, quantity: item.quantity })) as OrderLineInput[]);
  const requestedByVariant = new Map(lines.map(line => [line.variantId, line.quantity]));
  const byVendor = new Map<number, CartItemRow[]>();
  for (const item of cart) {
    const group = byVendor.get(item.vendorId) ?? [];
    group.push(item);
    byVendor.set(item.vendorId, group);
  }

  const createdOrders = await db.transaction(async tx => {
    const created: Array<{ id: number; orderNumber: string }> = [];
    for (const [vendorId, items] of Array.from(byVendor.entries())) {
      const number = orderNumber();
      const totalInCentavos = items.reduce((total, item) => total + (item.variantPriceInCentavos ?? item.productPriceInCentavos) * (requestedByVariant.get(item.variantId) ?? 0), 0);
      const schoolId = items[0]?.schoolId;
      if (!schoolId) throw new Error("Your cart has an invalid school.");

      for (const item of items) {
        const requestedQuantity = requestedByVariant.get(item.variantId) ?? 0;
        const result = await tx
          .update(inventory)
          .set({ quantity: sql`${inventory.quantity} - ${requestedQuantity}` })
          .where(and(eq(inventory.variantId, item.variantId), sql`${inventory.quantity} >= ${requestedQuantity}`));
        if (!inventoryDeductionSucceeded(resultAffectedRows(result))) {
          throw new Error(`${item.productName} in ${item.size} changed stock while you were checking out. Please review your cart.`);
        }
      }

      await tx.insert(orders).values({
        orderNumber: number,
        schoolId,
        vendorId,
        studentId,
        pickupSlotId,
        pickupLocation,
        pickupAt,
        totalInCentavos,
      });
      const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, number)).limit(1);
      if (!order) throw new Error("Unable to create your order.");

      await tx.insert(orderItems).values(items.map(item => ({
        orderId: order.id,
        variantId: item.variantId,
        productName: item.productName,
        variantSize: item.size,
        unitPriceInCentavos: item.variantPriceInCentavos ?? item.productPriceInCentavos,
        quantity: requestedByVariant.get(item.variantId) ?? 0,
        lineTotalInCentavos: (item.variantPriceInCentavos ?? item.productPriceInCentavos) * (requestedByVariant.get(item.variantId) ?? 0),
      })));
      await tx.insert(notifications).values({
        recipientUserId: studentId,
        schoolId,
        orderId: order.id,
        type: "order_pending",
        title: "Order received",
        body: `Your order ${number} is pending vendor confirmation.`,
      });

      const inventoryRows = items.map(item => ({ inventoryId: item.variantId, quantityDelta: -(requestedByVariant.get(item.variantId) ?? 0) }));
      const variantIds = inventoryRows.map(item => item.inventoryId);
      const inventoryRecords = await tx.select({ id: inventory.id, variantId: inventory.variantId }).from(inventory).where(inArray(inventory.variantId, variantIds));
      await tx.insert(inventoryMovements).values(inventoryRecords.map(record => ({
        inventoryId: record.id,
        quantityDelta: inventoryRows.find(item => item.inventoryId === record.variantId)?.quantityDelta ?? 0,
        reason: "order_placed",
        referenceType: "order",
        referenceId: order.id,
        createdByUserId: studentId,
      })));
      created.push({ id: order.id, orderNumber: number });
    }

    const cartIds = await tx.select({ id: carts.id }).from(carts).where(eq(carts.studentId, studentId));
    if (cartIds.length) await tx.delete(cartItems).where(inArray(cartItems.cartId, cartIds.map(cartItem => cartItem.id)));
    return created;
  });

  return createdOrders;
}

export async function listStudentOrders(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      pickupStatus: orders.pickupStatus,
      pickupLocation: orders.pickupLocation,
      pickupAt: orders.pickupAt,
      totalInCentavos: orders.totalInCentavos,
      placedAt: orders.placedAt,
      vendorName: vendors.name,
      schoolName: schools.name,
    })
    .from(orders)
    .innerJoin(vendors, eq(orders.vendorId, vendors.id))
    .innerJoin(schools, eq(orders.schoolId, schools.id))
    .where(eq(orders.studentId, studentId))
    .orderBy(desc(orders.placedAt));

  return Promise.all(rows.map(async order => {
    const items = await db.select({ productName: orderItems.productName, size: orderItems.variantSize, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, order.id));
    return { ...order, statusLabel: getOrderStatusLabel(order.status), items };
  }));
}

export async function listNotifications(recipientUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.recipientUserId, recipientUserId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(recipientUserId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, recipientUserId)));
}

export async function getVendorIdsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ vendorId: vendorStaff.vendorId }).from(vendorStaff).where(eq(vendorStaff.userId, userId));
  return rows.map(row => row.vendorId);
}

export async function updateInventoryForVendor(userId: number, variantId: number, quantity: number, lowStockThreshold: number) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const [record] = await db
    .select({ inventoryId: inventory.id, vendorId: products.vendorId, currentQuantity: inventory.quantity })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);
  if (!record) throw new Error("Inventory item not found.");
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.includes(record.vendorId)) throw new Error("You cannot manage this inventory item.");

  await db.transaction(async tx => {
    await tx.update(inventory).set({ quantity, lowStockThreshold }).where(eq(inventory.id, record.inventoryId));
    await tx.insert(inventoryMovements).values({
      inventoryId: record.inventoryId,
      quantityDelta: quantity - record.currentQuantity,
      reason: "manual_adjustment",
      createdByUserId: userId,
    });
  });
}

export async function listVendorOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.length) return [];
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      pickupStatus: orders.pickupStatus,
      pickupLocation: orders.pickupLocation,
      totalInCentavos: orders.totalInCentavos,
      placedAt: orders.placedAt,
      vendorName: vendors.name,
    })
    .from(orders)
    .innerJoin(vendors, eq(orders.vendorId, vendors.id))
    .where(inArray(orders.vendorId, vendorIds))
    .orderBy(desc(orders.placedAt));
  return Promise.all(rows.map(async order => {
    const items = await db
      .select({ productName: orderItems.productName, size: orderItems.variantSize, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    return { ...order, items };
  }));
}

export async function updateVendorOrderStatus(userId: number, orderId: number, status: OrderStatus) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found.");
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.includes(order.vendorId)) throw new Error("You cannot update this order.");
  if (!canTransitionOrder(order.status, status)) throw new Error(`An order cannot move from ${getOrderStatusLabel(order.status)} to ${getOrderStatusLabel(status)}.`);

  const pickupStatus = status === "ready_for_pickup" ? "ready" : status === "completed" ? "picked_up" : order.pickupStatus;
  await db.transaction(async tx => {
    await tx.update(orders).set({ status, pickupStatus, completedAt: status === "completed" ? new Date() : order.completedAt }).where(eq(orders.id, orderId));
    await tx.insert(notifications).values({
      recipientUserId: order.studentId,
      schoolId: order.schoolId,
      orderId,
      type: `order_${status}`,
      title: `Order ${getOrderStatusLabel(status)}`,
      body: `Your order ${order.orderNumber} is now ${getOrderStatusLabel(status).toLowerCase()}.`,
    });
  });
}

export async function getVendorDashboard(userId: number) {
  const db = await getDb();
  if (!db) return { pendingOrders: 0, readyForPickup: 0, lowStock: 0, todaysSalesInCentavos: 0, recentOrders: [] };
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.length) return { pendingOrders: 0, readyForPickup: 0, lowStock: 0, todaysSalesInCentavos: 0, recentOrders: [] };

  const orderRows = await db.select({ status: orders.status, totalInCentavos: orders.totalInCentavos, placedAt: orders.placedAt }).from(orders).where(inArray(orders.vendorId, vendorIds));
  const inventoryRows = await db
    .select({ quantity: inventory.quantity, lowStockThreshold: inventory.lowStockThreshold })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(products.vendorId, vendorIds));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    pendingOrders: orderRows.filter(order => ["pending", "confirmed", "preparing"].includes(order.status)).length,
    readyForPickup: orderRows.filter(order => order.status === "ready_for_pickup").length,
    lowStock: inventoryRows.filter(item => getInventoryAvailability(item) !== "in_stock").length,
    todaysSalesInCentavos: orderRows.filter(order => order.status === "completed" && order.placedAt >= today).reduce((total, order) => total + order.totalInCentavos, 0),
    recentOrders: await listVendorOrders(userId),
  };
}

export async function getSchoolOverview(userId: number) {
  const db = await getDb();
  if (!db) return { vendors: [], orderCount: 0, pickupReady: 0 };
  const memberships = await db.select({ schoolId: schoolMemberships.schoolId, role: schoolMemberships.role }).from(schoolMemberships).where(eq(schoolMemberships.userId, userId));
  const schoolIds = memberships.filter(member => member.role === "school_admin").map(member => member.schoolId);
  if (!schoolIds.length) return { vendors: [], orderCount: 0, pickupReady: 0 };
  const vendorRows = await db.select({ id: vendors.id, name: vendors.name, pickupLocation: vendors.pickupLocation, isAuthorized: vendors.isAuthorized, schoolId: vendors.schoolId }).from(vendors).where(inArray(vendors.schoolId, schoolIds));
  const orderRows = await db.select({ status: orders.status }).from(orders).where(inArray(orders.schoolId, schoolIds));
  return {
    vendors: vendorRows,
    orderCount: orderRows.length,
    pickupReady: orderRows.filter(order => order.status === "ready_for_pickup").length,
  };
}

export async function listVendorInventory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.length) return [];
  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      productName: products.name,
      size: productVariants.size,
      sku: productVariants.sku,
      quantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
      vendorName: vendors.name,
    })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(inArray(products.vendorId, vendorIds))
    .orderBy(products.name, productVariants.size);
  return rows.map(item => ({ ...item, availability: getInventoryAvailability(item) }));
}

export async function listVendorProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.length) return [];
  const rows = await db
    .select({
      id: products.id,
      vendorId: products.vendorId,
      categoryId: products.categoryId,
      categoryName: categories.name,
      name: products.name,
      description: products.description,
      imageUrl: products.imageUrl,
      priceInCentavos: products.priceInCentavos,
      isActive: products.isActive,
      variantId: productVariants.id,
      size: productVariants.size,
      quantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(inArray(products.vendorId, vendorIds))
    .orderBy(desc(products.createdAt));

  const grouped = new Map<number, {
    id: number; vendorId: number; categoryId: number | null; categoryName: string | null; name: string; description: string; imageUrl: string | null; priceInCentavos: number; isActive: boolean;
    variants: Array<{ id: number; size: string; quantity: number; availability: ReturnType<typeof getInventoryAvailability> }>;
  }>();
  for (const row of rows) {
    const product = grouped.get(row.id) ?? { id: row.id, vendorId: row.vendorId, categoryId: row.categoryId, categoryName: row.categoryName, name: row.name, description: row.description, imageUrl: row.imageUrl, priceInCentavos: row.priceInCentavos, isActive: row.isActive, variants: [] };
    if (row.variantId && row.size && row.quantity !== null && row.lowStockThreshold !== null) {
      product.variants.push({ id: row.variantId, size: row.size, quantity: row.quantity, availability: getInventoryAvailability({ quantity: row.quantity, lowStockThreshold: row.lowStockThreshold }) });
    }
    grouped.set(row.id, product);
  }
  return Array.from(grouped.values());
}

type VendorProductCreateInput = {
  vendorId?: number;
  categoryId?: number;
  name: string;
  description: string;
  imageUrl?: string;
  priceInCentavos: number;
  isActive: boolean;
  variants: Array<{ size: string; sku: string; quantity: number; lowStockThreshold: number }>;
};

export async function createVendorProduct(userId: number, input: VendorProductCreateInput) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const vendorIds = await getVendorIdsForUser(userId);
  const vendorId = input.vendorId ?? vendorIds[0];
  if (!vendorId || !vendorIds.includes(vendorId)) throw new Error("Choose a vendor workspace you are authorized to manage.");
  const [vendor] = await db.select({ schoolId: vendors.schoolId }).from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) throw new Error("Vendor workspace not found.");
  const duplicateSizes = new Set(input.variants.map(variant => variant.size.toLowerCase()));
  if (duplicateSizes.size !== input.variants.length) throw new Error("Each product size must be unique.");

  return db.transaction(async tx => {
    await tx.insert(products).values({
      schoolId: vendor.schoolId,
      vendorId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      priceInCentavos: input.priceInCentavos,
      isActive: input.isActive,
    });
    const [createdProduct] = await tx.select({ id: products.id }).from(products).where(and(eq(products.vendorId, vendorId), eq(products.name, input.name))).orderBy(desc(products.id)).limit(1);
    if (!createdProduct) throw new Error("The product could not be created.");
    for (const variant of input.variants) {
      await tx.insert(productVariants).values({ productId: createdProduct.id, size: variant.size, sku: variant.sku, isActive: true });
      const [createdVariant] = await tx.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.sku, variant.sku)).limit(1);
      if (!createdVariant) throw new Error("A product size could not be created.");
      await tx.insert(inventory).values({ variantId: createdVariant.id, quantity: variant.quantity, lowStockThreshold: variant.lowStockThreshold });
      await tx.insert(inventoryMovements).values({ inventoryId: createdVariant.id, quantityDelta: variant.quantity, reason: "initial_stock", createdByUserId: userId });
    }
    return { productId: createdProduct.id };
  });
}

export async function updateVendorProduct(userId: number, input: Omit<VendorProductCreateInput, "variants"> & { productId: number }) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const [existingProduct] = await db.select({ vendorId: products.vendorId }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!existingProduct) throw new Error("Product not found.");
  const vendorIds = await getVendorIdsForUser(userId);
  if (!vendorIds.includes(existingProduct.vendorId)) throw new Error("You cannot manage this product.");
  await db.update(products).set({ categoryId: input.categoryId, name: input.name, description: input.description, imageUrl: input.imageUrl, priceInCentavos: input.priceInCentavos, isActive: input.isActive }).where(eq(products.id, input.productId));
}

export async function createVendorAnnouncement(userId: number, input: { vendorId?: number; title: string; body: string; expiresAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const vendorIds = await getVendorIdsForUser(userId);
  const vendorId = input.vendorId ?? vendorIds[0];
  if (!vendorId || !vendorIds.includes(vendorId)) throw new Error("You cannot publish for this vendor.");
  const [vendor] = await db.select({ schoolId: vendors.schoolId }).from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) throw new Error("Vendor not found.");
  await db.insert(announcements).values({ schoolId: vendor.schoolId, vendorId, authorId: userId, title: input.title, body: input.body, expiresAt: input.expiresAt, isActive: true });
}

export async function setVendorAuthorization(userId: number, vendorId: number, isAuthorized: boolean) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const [vendor] = await db.select({ schoolId: vendors.schoolId }).from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) throw new Error("Vendor not found.");
  const [membership] = await db
    .select({ id: schoolMemberships.id })
    .from(schoolMemberships)
    .where(and(eq(schoolMemberships.userId, userId), eq(schoolMemberships.schoolId, vendor.schoolId), eq(schoolMemberships.role, "school_admin")))
    .limit(1);
  if (!membership) throw new Error("You can only manage vendors at your school.");
  await db.update(vendors).set({ isAuthorized }).where(eq(vendors.id, vendorId));
}

export async function createSchoolAnnouncement(userId: number, input: { title: string; body: string; expiresAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("CampusWear is not connected to its database.");
  const [membership] = await db
    .select({ schoolId: schoolMemberships.schoolId })
    .from(schoolMemberships)
    .where(and(eq(schoolMemberships.userId, userId), eq(schoolMemberships.role, "school_admin")))
    .limit(1);
  if (!membership) throw new Error("You are not assigned to a school administration workspace.");
  await db.insert(announcements).values({ schoolId: membership.schoolId, authorId: userId, title: input.title, body: input.body, expiresAt: input.expiresAt, isActive: true });
}

export async function uploadVendorProductImage(userId: number, input: { vendorId?: number; fileName: string; contentType: "image/jpeg" | "image/png" | "image/webp"; base64: string }) {
  const vendorIds = await getVendorIdsForUser(userId);
  const vendorId = input.vendorId ?? vendorIds[0];
  if (!vendorId || !vendorIds.includes(vendorId)) throw new Error("You cannot upload product images for this vendor.");
  const data = Buffer.from(input.base64, "base64");
  if (data.length === 0 || data.length > 4 * 1024 * 1024) throw new Error("Images must be smaller than 4 MB.");
  const extension = input.contentType === "image/jpeg" ? "jpg" : input.contentType === "image/png" ? "png" : "webp";
  const safeName = input.fileName.replace(/[^a-zA-Z0-9-_]/g, "-");
  const result = await storagePut(`campuswear/products/${vendorId}/${Date.now()}-${safeName}.${extension}`, data, input.contentType);
  return { url: result.url };
}
