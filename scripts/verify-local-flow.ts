import { and, eq } from "drizzle-orm";
import { productVariants, users, vendorStaff } from "../drizzle/schema";
import { getDb } from "../server/db";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function contextFor(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const db = await getDb();
if (!db) throw new Error("A local database connection is required for the CampusWear flow verifier.");

await db.insert(users).values({
  openId: "local-flow-student",
  name: "Local Flow Student",
  email: "local-flow-student@campuswear.test",
  loginMethod: "local-verifier",
  role: "student",
}).onDuplicateKeyUpdate({ set: { name: "Local Flow Student", role: "student", lastSignedIn: new Date() } });

const [student] = await db.select().from(users).where(eq(users.openId, "local-flow-student")).limit(1);
if (!student) throw new Error("Unable to provision the local student test account.");

const [vendorUser] = await db
  .select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    loginMethod: users.loginMethod,
    role: users.role,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    lastSignedIn: users.lastSignedIn,
  })
  .from(vendorStaff)
  .innerJoin(users, eq(vendorStaff.userId, users.id))
  .limit(1);
if (!vendorUser) throw new Error("Seeded vendor staff is required for the local flow verifier.");

const studentCaller = appRouter.createCaller(contextFor(student));
const catalog = await studentCaller.catalog.list({});
const announcements = await studentCaller.announcements.list({});
if (!announcements.some(announcement => announcement.vendorName === "University Outfitters" && announcement.title === "Uniform availability and pickup updates")) {
  throw new Error("The active vendor announcement is not available in the student feed.");
}
const chosenProduct = catalog.find(product => product.vendorName === "University Outfitters" && product.variants.some(variant => variant.availability === "in_stock"));
const chosenVariant = chosenProduct?.variants.find(variant => variant.availability === "in_stock");
if (!chosenProduct || !chosenVariant) throw new Error("No in-stock University Outfitters variant is available for the local flow verifier.");

const previousCart = await studentCaller.student.cart();
for (const item of previousCart) await studentCaller.student.updateCartItem({ variantId: item.variantId, quantity: 0 });

await studentCaller.student.addToCart({ variantId: chosenVariant.id, quantity: 1 });
const cart = await studentCaller.student.cart();
if (cart.length !== 1 || cart[0]?.variantId !== chosenVariant.id) throw new Error("Student cart did not retain the selected variant.");

const createdOrders = await studentCaller.student.checkout({ pickupLocation: "Student Center, Ground Floor" });
const createdOrder = createdOrders[0];
if (!createdOrder) throw new Error("Checkout did not create an order.");

const vendorCaller = appRouter.createCaller(contextFor(vendorUser));
const vendorDashboard = await vendorCaller.vendor.dashboard();
if (vendorDashboard.lowStock < 1) {
  throw new Error("The vendor dashboard did not surface a low-stock size.");
}
const vendorOrders = await vendorCaller.vendor.orders();
if (!vendorOrders.some(order => order.id === createdOrder.id && order.items.some(item => item.productName === chosenProduct.name))) {
  throw new Error("Vendor fulfillment queue did not receive the new order with its item details.");
}

await vendorCaller.vendor.updateOrderStatus({ orderId: createdOrder.id, status: "confirmed" });
await vendorCaller.vendor.updateOrderStatus({ orderId: createdOrder.id, status: "preparing" });
await vendorCaller.vendor.updateOrderStatus({ orderId: createdOrder.id, status: "ready_for_pickup" });

const studentOrders = await studentCaller.student.orders();
const trackedOrder = studentOrders.find(order => order.id === createdOrder.id);
if (!trackedOrder || trackedOrder.status !== "ready_for_pickup" || trackedOrder.pickupStatus !== "ready") {
  throw new Error("Student tracking did not receive the ready-for-pickup status.");
}
const notifications = await studentCaller.student.notifications();
if (!notifications.some(notification => notification.orderId === createdOrder.id && notification.type === "order_ready_for_pickup")) {
  throw new Error("Student did not receive the pickup-ready notification.");
}

console.log(JSON.stringify({
  catalogProduct: chosenProduct.name,
  variant: chosenVariant.size,
  orderNumber: createdOrder.orderNumber,
  finalStatus: trackedOrder.status,
  pickupStatus: trackedOrder.pickupStatus,
  lowStockCount: vendorDashboard.lowStock,
  vendorAnnouncementVerified: true,
  verified: true,
}, null, 2));

process.exit(0);
