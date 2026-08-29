import { supabase } from "@/lib/supabase";

export type Availability = "in_stock" | "low_stock" | "out_of_stock";

type CatalogRow = {
  product_id: string;
  product_name: string;
  product_description: string;
  image_path: string | null;
  price_in_centavos: number;
  category_name: string | null;
  vendor_name: string;
  school_name: string;
  variant_id: string;
  variant_size: string;
  availability: Availability;
};

export type CatalogVariant = { id: string; size: string; availability: Availability };
export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceInCentavos: number;
  categoryName: string | null;
  vendorName: string;
  schoolName: string;
  variants: CatalogVariant[];
};

export type CatalogCategory = { id: string; name: string; slug: string };
export type ApplicationSchool = { id: string; name: string; code: string };
export type VendorApplicationStatus = "pending" | "approved" | "rejected";
export type VendorApplication = {
  id: string;
  schoolId: string;
  schoolName: string;
  businessName: string;
  requestedSlug: string;
  contactEmail: string;
  contactPhone: string | null;
  requestedPickupLocation: string;
  status: VendorApplicationStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};
export type PlatformSchool = { id: string; name: string; code: string; isActive: boolean };
export type PlatformAccountRole = "student" | "vendor_staff" | "school_admin" | "platform_admin";
export type PlatformAccount = {
  userId: string;
  email: string;
  fullName: string | null;
  role: PlatformAccountRole;
  emailConfirmed: boolean;
  isBootstrapOwner: boolean;
  createdAt: string;
};

type VendorApplicationRow = {
  id: string;
  school_id: string;
  business_name: string;
  requested_slug: string;
  contact_email: string;
  contact_phone: string | null;
  requested_pickup_location: string;
  status: VendorApplicationStatus;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  schools: { name: string } | { name: string }[] | null;
};

function requireSupabase() {
  if (!supabase) throw new Error("CampusWear’s data service is not configured.");
  return supabase;
}

function imageUrlFor(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return requireSupabase().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function groupCatalogRows(rows: CatalogRow[]): CatalogProduct[] {
  const products = new Map<string, CatalogProduct>();
  for (const row of rows) {
    const product = products.get(row.product_id) ?? {
      id: row.product_id,
      name: row.product_name,
      description: row.product_description,
      imageUrl: imageUrlFor(row.image_path),
      priceInCentavos: row.price_in_centavos,
      categoryName: row.category_name,
      vendorName: row.vendor_name,
      schoolName: row.school_name,
      variants: [],
    };
    product.variants.push({ id: row.variant_id, size: row.variant_size, availability: row.availability });
    products.set(row.product_id, product);
  }
  return Array.from(products.values());
}

export async function listPublicCatalog(search?: string): Promise<CatalogProduct[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_public_catalog", { p_search: search || null, p_product_id: null });
  if (error) throw error;
  return groupCatalogRows((data ?? []) as CatalogRow[]);
}

export async function getPublicCatalogProduct(productId: string): Promise<CatalogProduct | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_public_catalog", { p_search: null, p_product_id: productId });
  if (error) throw error;
  return groupCatalogRows((data ?? []) as CatalogRow[])[0] ?? null;
}

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("categories").select("id, name, slug").order("sort_order").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listApplicationSchools(): Promise<ApplicationSchool[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("schools").select("id, name, code").eq("is_active", true).order("name");
  if (error) throw error;
  return (data ?? []) as ApplicationSchool[];
}

function mapVendorApplication(row: VendorApplicationRow): VendorApplication {
  const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
  return { id: row.id, schoolId: row.school_id, schoolName: school?.name ?? "CampusWear school", businessName: row.business_name, requestedSlug: row.requested_slug, contactEmail: row.contact_email, contactPhone: row.contact_phone, requestedPickupLocation: row.requested_pickup_location, status: row.status, reviewNote: row.review_note, createdAt: row.created_at, reviewedAt: row.reviewed_at };
}

export async function listMyVendorApplications(): Promise<VendorApplication[]> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to view vendor applications.");
  const { data, error } = await client.from("vendor_applications").select("id, school_id, business_name, requested_slug, contact_email, contact_phone, requested_pickup_location, status, review_note, created_at, reviewed_at, schools(name)").eq("applicant_user_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as VendorApplicationRow[]).map(mapVendorApplication);
}

export async function submitVendorApplication(input: { schoolId: string; businessName: string; requestedSlug: string; contactEmail: string; contactPhone?: string; pickupLocation: string }): Promise<void> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in before applying as a vendor.");
  const { error } = await client.from("vendor_applications").insert({ school_id: input.schoolId, applicant_user_id: user.id, business_name: input.businessName.trim(), requested_slug: input.requestedSlug.trim().toLowerCase(), contact_email: input.contactEmail.trim().toLowerCase(), contact_phone: input.contactPhone?.trim() || null, requested_pickup_location: input.pickupLocation.trim() });
  if (error) throw error;
}

async function requirePlatformAdministrator() {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to open platform administration.");
  const { data: profile, error } = await client.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (profile?.role !== "platform_admin") throw new Error("Platform administrator access is required.");
  return client;
}

export async function listPlatformVendorApplications(): Promise<VendorApplication[]> {
  const client = await requirePlatformAdministrator();
  const { data, error } = await client.from("vendor_applications").select("id, school_id, business_name, requested_slug, contact_email, contact_phone, requested_pickup_location, status, review_note, created_at, reviewed_at, schools(name)").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return ((data ?? []) as VendorApplicationRow[]).map(mapVendorApplication);
}

export async function listPlatformSchools(): Promise<PlatformSchool[]> {
  const client = await requirePlatformAdministrator();
  const { data, error } = await client.from("schools").select("id, name, code, is_active").order("name").limit(100);
  if (error) throw error;
  return (data ?? []).map(school => ({ id: school.id, name: school.name, code: school.code, isActive: school.is_active }));
}

export async function platformAdminOverview(): Promise<{ applications: VendorApplication[]; schools: PlatformSchool[]; schoolCount: number; vendorCount: number; pendingApplications: number }> {
  const client = await requirePlatformAdministrator();
  const [applications, schools, vendors] = await Promise.all([listPlatformVendorApplications(), listPlatformSchools(), client.from("vendors").select("id", { count: "exact", head: true })]);
  if (vendors.error) throw vendors.error;
  return { applications, schools, schoolCount: schools.filter(school => school.isActive).length, vendorCount: vendors.count ?? 0, pendingApplications: applications.filter(application => application.status === "pending").length };
}

export async function setPlatformSchoolActive(input: { schoolId: string; isActive: boolean }): Promise<void> {
  const client = await requirePlatformAdministrator();
  const { error } = await client.rpc("set_platform_school_active", { p_school_id: input.schoolId, p_is_active: input.isActive });
  if (error) throw error;
}

export type PlatformTeamMember = { userId: string; email: string; fullName: string | null; isBootstrapOwner: boolean; grantedAt: string };

export function platformTeamQueryKey(userId: string | number | null | undefined) {
  return ["supabase-platform-team", userId ?? "anonymous"] as const;
}

export function platformAccountsQueryKey(userId: string | number | null | undefined, search?: string) {
  return ["supabase-platform-accounts", userId ?? "anonymous", search?.trim() || ""] as const;
}

export function platformOverviewQueryKey(userId: string | number | null | undefined) {
  return ["supabase-platform-overview", userId ?? "anonymous"] as const;
}

export function schoolAdminOverviewQueryKey(userId: string | number | null | undefined) {
  return ["supabase-school-admin-overview", userId ?? "anonymous"] as const;
}

export async function listPlatformTeamMembers(): Promise<PlatformTeamMember[]> {
  const client = await requirePlatformAdministrator();
  const { data, error } = await client.rpc("list_platform_team_members");
  if (error) throw error;
  return (data ?? []).map((member: { user_id: string; email: string; full_name: string | null; is_bootstrap_owner: boolean; granted_at: string }) => ({ userId: member.user_id, email: member.email, fullName: member.full_name, isBootstrapOwner: member.is_bootstrap_owner, grantedAt: member.granted_at }));
}

export async function listPlatformAccounts(search?: string): Promise<PlatformAccount[]> {
  const client = await requirePlatformAdministrator();
  const { data, error } = await client.rpc("list_platform_accounts", { p_search: search?.trim() || null });
  if (error) throw error;
  return (data ?? []).map((account: { user_id: string; email: string; full_name: string | null; role: PlatformAccountRole; email_confirmed: boolean; is_bootstrap_owner: boolean; created_at: string }) => ({
    userId: account.user_id,
    email: account.email,
    fullName: account.full_name,
    role: account.role,
    emailConfirmed: account.email_confirmed,
    isBootstrapOwner: account.is_bootstrap_owner,
    createdAt: account.created_at,
  }));
}

export async function grantPlatformTeamAccess(email: string): Promise<void> {
  const client = await requirePlatformAdministrator();
  const { error } = await client.rpc("grant_platform_team_access", { p_email: email.trim().toLowerCase() });
  if (error) throw error;
}

export async function revokePlatformTeamAccess(userId: string): Promise<void> {
  const client = await requirePlatformAdministrator();
  const { error } = await client.rpc("revoke_platform_team_access", { p_user_id: userId });
  if (error) throw error;
}

export async function approveVendorApplication(applicationId: string): Promise<void> {
  const client = await requirePlatformAdministrator();
  const { error } = await client.rpc("approve_vendor_application", { p_application_id: applicationId });
  if (error) throw error;
}

export async function rejectVendorApplication(input: { applicationId: string; reviewNote: string }): Promise<void> {
  const client = await requirePlatformAdministrator();
  const { error } = await client.rpc("reject_vendor_application", { p_application_id: input.applicationId, p_review_note: input.reviewNote.trim() });
  if (error) throw error;
}

export async function addVariantToCart(input: { productId: string; variantId: string; quantity: number }): Promise<void> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in before adding items to your cart.");

  const { data: product, error: productError } = await client.from("products").select("school_id").eq("id", input.productId).maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error("This product is no longer available.");

  const { data: existingCart, error: cartReadError } = await client.from("carts").select("id").eq("student_id", user.id).eq("school_id", product.school_id).maybeSingle();
  if (cartReadError) throw cartReadError;
  let cartId = existingCart?.id;
  if (!cartId) {
    const { data: cart, error: cartCreateError } = await client.from("carts").insert({ student_id: user.id, school_id: product.school_id }).select("id").single();
    if (cartCreateError) throw cartCreateError;
    cartId = cart.id;
  }

  const { data: existingItem, error: itemReadError } = await client.from("cart_items").select("quantity").eq("cart_id", cartId).eq("variant_id", input.variantId).maybeSingle();
  if (itemReadError) throw itemReadError;
  const quantity = Math.min(10, (existingItem?.quantity ?? 0) + input.quantity);
  const { error: upsertError } = await client.from("cart_items").upsert({ cart_id: cartId, variant_id: input.variantId, quantity }, { onConflict: "cart_id,variant_id" });
  if (upsertError) throw upsertError;
}

export type CartLine = {
  variantId: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  size: string;
  vendorName: string;
  unitPriceInCentavos: number;
  quantity: number;
  availability: Availability;
};

export function cartQueryKey(userId: string | number | null | undefined) {
  return ["supabase-cart", userId ?? "anonymous"] as const;
}

async function currentCart() {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to access your cart.");
  const { data, error } = await client.from("carts").select("id").eq("student_id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCart(): Promise<CartLine[]> {
  const client = requireSupabase();
  const cart = await currentCart();
  if (!cart) return [];
  const { data: cartItems, error: itemsError } = await client.from("cart_items").select("variant_id, quantity").eq("cart_id", cart.id);
  if (itemsError) throw itemsError;
  if (!cartItems?.length) return [];
  const catalog = await listPublicCatalog();
  const variants = new Map(catalog.flatMap(product => product.variants.map(variant => [variant.id, { product, variant }] as const)));
  return cartItems.flatMap(item => {
    const entry = variants.get(item.variant_id);
    if (!entry) return [];
    return [{ variantId: item.variant_id, productId: entry.product.id, productName: entry.product.name, imageUrl: entry.product.imageUrl, size: entry.variant.size, vendorName: entry.product.vendorName, unitPriceInCentavos: entry.product.priceInCentavos, quantity: item.quantity, availability: entry.variant.availability }];
  });
}

export async function updateCartItem(input: { variantId: string; quantity: number }): Promise<void> {
  const client = requireSupabase();
  const cart = await currentCart();
  if (!cart) throw new Error("Your cart no longer exists.");
  if (input.quantity <= 0) {
    const { error } = await client.from("cart_items").delete().eq("cart_id", cart.id).eq("variant_id", input.variantId);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("cart_items").update({ quantity: Math.min(10, input.quantity) }).eq("cart_id", cart.id).eq("variant_id", input.variantId);
  if (error) throw error;
}

export async function checkoutCart(pickupLocation: string): Promise<number> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_order_from_cart", { pickup_location_input: pickupLocation.trim(), pickup_at_input: null, pickup_slot_input: null });
  if (error) throw error;
  return (data ?? []).length;
}

export type StudentOrder = {
  id: string;
  orderNumber: string;
  status: "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "completed" | "cancelled" | "rejected";
  pickupStatus: "scheduled" | "ready" | "picked_up";
  pickupLocation: string;
  pickupAt: string | null;
  totalInCentavos: number;
  vendorName: string;
  schoolName: string;
  items: Array<{ productName: string; size: string }>;
};

export async function listStudentOrders(): Promise<StudentOrder[]> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to view orders.");
  const { data, error } = await client.from("orders").select("id, order_number, status, pickup_status, pickup_location, pickup_at, total_in_centavos, vendors(name), schools(name), order_items(product_name, variant_size)").eq("student_id", user.id).order("placed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((order: any) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    pickupStatus: order.pickup_status,
    pickupLocation: order.pickup_location,
    pickupAt: order.pickup_at,
    totalInCentavos: order.total_in_centavos,
    vendorName: order.vendors?.name ?? "Authorized vendor",
    schoolName: order.schools?.name ?? "CampusWear school",
    items: (order.order_items ?? []).map((item: any) => ({ productName: item.product_name, size: item.variant_size })),
  }));
}

export function studentOrdersQueryKey(userId: string | number | null | undefined) {
  return ["supabase-student-orders", userId ?? "anonymous"] as const;
}

export type NotificationItem = { id: string; title: string; body: string; readAt: string | null; createdAt: string };

export async function listNotifications(): Promise<NotificationItem[]> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to view notifications.");
  const { data, error } = await client.from("notifications").select("id, title, body, read_at, created_at").eq("recipient_user_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(item => ({ id: item.id, title: item.title, body: item.body, readAt: item.read_at, createdAt: item.created_at }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).is("read_at", null);
  if (error) throw error;
}

export function notificationsQueryKey(userId: string | number | null | undefined) {
  return ["supabase-notifications", userId ?? "anonymous"] as const;
}

export type Announcement = { id: string; title: string; body: string; createdAt: string; vendorName: string | null; schoolName: string | null };

export async function listAnnouncements(): Promise<Announcement[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("announcements").select("id, title, body, created_at, vendors(name), schools(name)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((notice: any) => ({ id: notice.id, title: notice.title, body: notice.body, createdAt: notice.created_at, vendorName: notice.vendors?.name ?? null, schoolName: notice.schools?.name ?? null }));
}

export type VendorOrder = {
  id: string;
  orderNumber: string;
  status: StudentOrder["status"];
  pickupStatus: StudentOrder["pickupStatus"];
  pickupLocation: string;
  placedAt: string;
  completedAt: string | null;
  totalInCentavos: number;
  items: Array<{ productName: string; size: string; quantity: number }>;
};

export const vendorNextStatuses: Record<VendorOrder["status"], VendorOrder["status"][]> = {
  pending: ["confirmed", "rejected", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready_for_pickup", "cancelled"], ready_for_pickup: ["completed", "cancelled"], completed: [], cancelled: [], rejected: [],
};

export function vendorDashboardQueryKey(userId: string | number | null | undefined) {
  return ["supabase-vendor-dashboard", userId ?? "anonymous"] as const;
}

export function vendorPickupLocationQueryKey(userId: string | number | null | undefined) {
  return ["supabase-vendor-pickup-location", userId ?? "anonymous"] as const;
}

export function vendorManagedProductsQueryKey(userId: string | number | null | undefined) {
  return ["supabase-managed-products", userId ?? "anonymous"] as const;
}

export function vendorInventoryQueryKey(userId: string | number | null | undefined) {
  return ["supabase-vendor-inventory", userId ?? "anonymous"] as const;
}

export function vendorOrdersQueryKey(userId: string | number | null | undefined) {
  return ["supabase-vendor-orders", userId ?? "anonymous"] as const;
}

export async function listVendorOrders(): Promise<VendorOrder[]> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to view vendor orders.");
  const { data, error } = await client.from("orders").select("id, order_number, status, pickup_status, pickup_location, placed_at, completed_at, total_in_centavos, order_items(product_name, variant_size, quantity)").order("placed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((order: any) => ({ id: order.id, orderNumber: order.order_number, status: order.status, pickupStatus: order.pickup_status, pickupLocation: order.pickup_location, placedAt: order.placed_at, completedAt: order.completed_at, totalInCentavos: order.total_in_centavos, items: (order.order_items ?? []).map((item: any) => ({ productName: item.product_name, size: item.variant_size, quantity: item.quantity })) }));
}

export async function transitionVendorOrder(input: { orderId: string; status: VendorOrder["status"] }): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("transition_order_status", { p_order_id: input.orderId, p_new_status: input.status });
  if (error) throw error;
}

type VendorContext = { vendorId: string; schoolId: string };
async function vendorContext(): Promise<VendorContext> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to manage products.");
  const { data: assignment, error: assignmentError } = await client.from("vendor_staff").select("vendor_id").eq("user_id", user.id).maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) throw new Error("Your account is not assigned to an authorized vendor.");
  const { data: vendor, error: vendorError } = await client.from("vendors").select("school_id").eq("id", assignment.vendor_id).single();
  if (vendorError) throw vendorError;
  return { vendorId: assignment.vendor_id, schoolId: vendor.school_id };
}

export async function getVendorPickupLocation(): Promise<string> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { data, error } = await client.from("vendors").select("pickup_location").eq("id", context.vendorId).single();
  if (error) throw error;
  return data.pickup_location;
}

export async function updateVendorPickupLocation(pickupLocation: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("update_vendor_pickup_location", { p_pickup_location: pickupLocation.trim() });
  if (error) throw error;
}

export type ManagedProduct = { id: string; vendorId: string; name: string; description: string; imageUrl: string | null; priceInCentavos: number; isActive: boolean; variants: Array<{ id: string; size: string; quantity: number; lowStockThreshold: number; availability: Availability }> };

export async function listManagedProducts(): Promise<ManagedProduct[]> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { data, error } = await client.from("products").select("id, vendor_id, name, description, image_path, price_in_centavos, is_active, product_variants(id, size, inventory(quantity, low_stock_threshold))").eq("vendor_id", context.vendorId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((product: any) => ({ id: product.id, vendorId: product.vendor_id, name: product.name, description: product.description, imageUrl: imageUrlFor(product.image_path), priceInCentavos: product.price_in_centavos, isActive: product.is_active, variants: (product.product_variants ?? []).map((variant: any) => { const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory; const quantity = inventory?.quantity ?? 0; const threshold = inventory?.low_stock_threshold ?? 5; return { id: variant.id, size: variant.size, quantity, lowStockThreshold: threshold, availability: quantity <= 0 ? "out_of_stock" : quantity <= threshold ? "low_stock" : "in_stock" }; }) }));
}

export type VendorProductInput = { name: string; description: string; priceInCentavos: number; variants: Array<{ size: string; sku: string; quantity: number; lowStockThreshold: number }> };

export async function createManagedProduct(input: VendorProductInput): Promise<ManagedProduct> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { data: product, error: productError } = await client.from("products").insert({ school_id: context.schoolId, vendor_id: context.vendorId, name: input.name.trim(), description: input.description.trim(), price_in_centavos: input.priceInCentavos, is_active: true }).select("id, vendor_id, name, description, image_path, price_in_centavos, is_active").single();
  if (productError) throw productError;
  const variants: ManagedProduct["variants"] = [];
  for (const entry of input.variants) {
    const { data: variant, error: variantError } = await client.from("product_variants").insert({ product_id: product.id, size: entry.size.trim(), sku: entry.sku.trim(), is_active: true }).select("id, size").single();
    if (variantError) throw variantError;
    const { error: inventoryError } = await client.from("inventory").insert({ variant_id: variant.id, quantity: entry.quantity, low_stock_threshold: entry.lowStockThreshold });
    if (inventoryError) throw inventoryError;
    variants.push({ id: variant.id, size: variant.size, quantity: entry.quantity, lowStockThreshold: entry.lowStockThreshold, availability: entry.quantity <= 0 ? "out_of_stock" : entry.quantity <= entry.lowStockThreshold ? "low_stock" : "in_stock" });
  }
  return { id: product.id, vendorId: product.vendor_id, name: product.name, description: product.description, imageUrl: imageUrlFor(product.image_path), priceInCentavos: product.price_in_centavos, isActive: product.is_active, variants };
}

export async function updateManagedProduct(input: { id: string; name: string; description: string; priceInCentavos: number; isActive: boolean }): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("products").update({ name: input.name.trim(), description: input.description.trim(), price_in_centavos: input.priceInCentavos, is_active: input.isActive }).eq("id", input.id);
  if (error) throw error;
}

export class ProductDeleteBlockedError extends Error {
  readonly productId: string;
  constructor(productId: string) {
    super("This product is part of a student order, so it cannot be permanently deleted. Hide it instead so the order history stays intact.");
    this.name = "ProductDeleteBlockedError";
    this.productId = productId;
  }
}

export async function setManagedProductVisibility(input: { id: string; isActive: boolean }): Promise<void> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { error } = await client.from("products").update({ is_active: input.isActive }).eq("id", input.id).eq("vendor_id", context.vendorId);
  if (error) throw error;
}

export async function deleteManagedProduct(input: { id: string }): Promise<{ imageRemoved: boolean }> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { data: product, error: readError } = await client.from("products").select("id, image_path").eq("id", input.id).eq("vendor_id", context.vendorId).maybeSingle();
  if (readError) throw readError;
  if (!product) throw new Error("This product is no longer available in your vendor catalog.");

  // The database stays authoritative here. The delete policy silently filters out products
  // that order history still references, so a blocked delete returns no error and no rows.
  // Confirm a row actually came back before reporting success or removing the stored image.
  const { data: deleted, error: deleteError } = await client.from("products").delete().eq("id", product.id).eq("vendor_id", context.vendorId).select("id");
  if (deleteError) throw deleteError;
  if (!deleted?.length) throw new ProductDeleteBlockedError(product.id);

  if (!product.image_path || /^https?:\/\//.test(product.image_path)) return { imageRemoved: !product.image_path };
  const { error: imageError } = await client.storage.from("product-images").remove([product.image_path]);
  return { imageRemoved: !imageError };
}

export async function uploadProductImage(input: { productId: string; file: File }): Promise<string> {
  const client = requireSupabase();
  const context = await vendorContext();
  const extension = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${context.vendorId}/${input.productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("product-images").upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error: updateError } = await client.from("products").update({ image_path: path }).eq("id", input.productId);
  if (updateError) throw updateError;
  return imageUrlFor(path) ?? "";
}

export type VendorInventoryItem = { variantId: string; productName: string; size: string; sku: string; quantity: number; lowStockThreshold: number; availability: Availability };
export async function listVendorInventory(): Promise<VendorInventoryItem[]> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { data, error } = await client.from("products").select("name, product_variants(id, size, sku, inventory(quantity, low_stock_threshold))").eq("vendor_id", context.vendorId).order("name");
  if (error) throw error;
  return (data ?? []).flatMap((product: any) => (product.product_variants ?? []).map((variant: any) => { const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory; const quantity = inventory?.quantity ?? 0; const lowStockThreshold = inventory?.low_stock_threshold ?? 5; return { variantId: variant.id, productName: product.name, size: variant.size, sku: variant.sku, quantity, lowStockThreshold, availability: quantity <= 0 ? "out_of_stock" : quantity <= lowStockThreshold ? "low_stock" : "in_stock" }; }));
}

export async function updateVendorInventory(input: { variantId: string; quantity: number; lowStockThreshold: number }): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("inventory").update({ quantity: Math.max(0, input.quantity), low_stock_threshold: Math.max(0, input.lowStockThreshold), updated_at: new Date().toISOString() }).eq("variant_id", input.variantId);
  if (error) throw error;
}

export async function publishVendorAnnouncement(input: { title: string; body: string }): Promise<void> {
  const client = requireSupabase();
  const context = await vendorContext();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to publish an announcement.");
  const { error } = await client.from("announcements").insert({ school_id: context.schoolId, vendor_id: context.vendorId, author_id: user.id, title: input.title.trim(), body: input.body.trim(), is_active: true });
  if (error) throw error;
}

export async function vendorDashboardData() {
  const [orders, inventory] = await Promise.all([listVendorOrders(), listVendorInventory()]);
  const today = new Date().toISOString().slice(0, 10);
  return {
    pendingOrders: orders.filter(order => ["pending", "confirmed", "preparing"].includes(order.status)).length,
    readyForPickup: orders.filter(order => order.status === "ready_for_pickup").length,
    lowStock: inventory.filter(item => item.availability !== "in_stock").length,
    // Surfaced on the dashboard inventory panel. Reuses the inventory already fetched above,
    // so this adds no extra query.
    lowStockItems: inventory.filter(item => item.availability !== "in_stock").slice(0, 6),
    todaysSalesInCentavos: orders.filter(order => order.status === "completed" && order.completedAt?.startsWith(today)).reduce((sum, order) => sum + order.totalInCentavos, 0),
    recentOrders: orders.slice(0, 6),
  };
}

type SchoolAdminContext = { schoolId: string };
async function schoolAdminContext(): Promise<SchoolAdminContext> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to open school administration.");
  const { data: profile, error } = await client.from("profiles").select("school_id, role").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!profile?.school_id || !["school_admin", "platform_admin"].includes(profile.role)) throw new Error("Your account is not assigned to a school administration role.");
  return { schoolId: profile.school_id };
}

export type SchoolVendor = { id: string; name: string; pickupLocation: string; isAuthorized: boolean };
export async function schoolAdminOverview() {
  const client = requireSupabase();
  const context = await schoolAdminContext();
  const [{ data: vendors, error: vendorError }, { data: orders, error: ordersError }] = await Promise.all([
    client.from("vendors").select("id, name, pickup_location, is_authorized").eq("school_id", context.schoolId).order("name"),
    client.from("orders").select("id, status").eq("school_id", context.schoolId),
  ]);
  if (vendorError) throw vendorError;
  if (ordersError) throw ordersError;
  const mappedVendors = (vendors ?? []).map(vendor => ({ id: vendor.id, name: vendor.name, pickupLocation: vendor.pickup_location, isAuthorized: vendor.is_authorized }));
  return { vendors: mappedVendors, orderCount: orders?.length ?? 0, pickupReady: orders?.filter(order => order.status === "ready_for_pickup").length ?? 0 };
}

export async function setVendorAuthorization(input: { vendorId: string; isAuthorized: boolean }): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("vendors").update({ is_authorized: input.isAuthorized }).eq("id", input.vendorId);
  if (error) throw error;
}

export async function publishSchoolAnnouncement(input: { title: string; body: string }): Promise<void> {
  const client = requireSupabase();
  const context = await schoolAdminContext();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in to publish an announcement.");
  const { error } = await client.from("announcements").insert({ school_id: context.schoolId, vendor_id: null, author_id: user.id, title: input.title.trim(), body: input.body.trim(), is_active: true });
  if (error) throw error;
}
