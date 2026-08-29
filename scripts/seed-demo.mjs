import mysql from "mysql2/promise";

if (process.env.NODE_ENV === "production") {
  throw new Error("Development seed data is disabled in production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the CampusWear demo dataset.");
}

const db = await mysql.createConnection(connectionString);

async function upsertId(query, values) {
  const [result] = await db.execute(query, values);
  return Number(result.insertId);
}

try {
  const schoolId = await upsertId(
    `insert into schools (name, code, slug, supportEmail)
     values (?, ?, ?, ?)
     on duplicate key update id = last_insert_id(id), name = values(name), supportEmail = values(supportEmail)`,
    ["CampusWear Demo University", "CWDU", "campuswear-demo", "support@campuswear.demo"],
  );

  const uniformVendorId = await upsertId(
    `insert into vendors (schoolId, name, slug, pickupLocation, contactEmail, isAuthorized, isActive)
     values (?, ?, ?, ?, ?, true, true)
     on duplicate key update id = last_insert_id(id), pickupLocation = values(pickupLocation), isAuthorized = true, isActive = true`,
    [schoolId, "University Outfitters", "university-outfitters", "Student Center, Ground Floor", "outfitters@campuswear.demo"],
  );
  const sportVendorId = await upsertId(
    `insert into vendors (schoolId, name, slug, pickupLocation, contactEmail, isAuthorized, isActive)
     values (?, ?, ?, ?, ?, true, true)
     on duplicate key update id = last_insert_id(id), pickupLocation = values(pickupLocation), isAuthorized = true, isActive = true`,
    [schoolId, "Campus Sport Hub", "campus-sport-hub", "Athletics Complex, Lobby", "sport@campuswear.demo"],
  );

  const uniformsCategoryId = await upsertId(
    `insert into categories (schoolId, name, slug, sortOrder)
     values (?, ?, ?, ?)
     on duplicate key update id = last_insert_id(id), name = values(name), sortOrder = values(sortOrder)`,
    [schoolId, "Uniforms", "uniforms", 1],
  );
  const essentialsCategoryId = await upsertId(
    `insert into categories (schoolId, name, slug, sortOrder)
     values (?, ?, ?, ?)
     on duplicate key update id = last_insert_id(id), name = values(name), sortOrder = values(sortOrder)`,
    [schoolId, "Campus essentials", "campus-essentials", 2],
  );
  const sportsCategoryId = await upsertId(
    `insert into categories (schoolId, name, slug, sortOrder)
     values (?, ?, ?, ?)
     on duplicate key update id = last_insert_id(id), name = values(name), sortOrder = values(sortOrder)`,
    [schoolId, "PE & sports", "pe-sports", 3],
  );

  const productRows = [
    {
      vendorId: uniformVendorId,
      categoryId: uniformsCategoryId,
      name: "BSIT Men's Uniform",
      description: "Collared shirt and tailored pants set for BSIT students, available in standard campus sizes.",
      price: 85000,
      skuPrefix: "CWDU-MU",
      sizes: [["S", 18], ["M", 12], ["L", 5], ["XL", 0]],
    },
    {
      vendorId: uniformVendorId,
      categoryId: uniformsCategoryId,
      name: "BSIT Women's Uniform",
      description: "Tailored blouse and skirt set for BSIT students, designed for everyday campus wear.",
      price: 85000,
      skuPrefix: "CWDU-WU",
      sizes: [["S", 8], ["M", 16], ["L", 4], ["XL", 2]],
    },
    {
      vendorId: sportVendorId,
      categoryId: sportsCategoryId,
      name: "PE Uniform Set",
      description: "Breathable tee and athletic shorts set for PE classes and campus sports activities.",
      price: 65000,
      skuPrefix: "CWDU-PE",
      sizes: [["S", 20], ["M", 20], ["L", 7], ["XL", 3]],
    },
    {
      vendorId: uniformVendorId,
      categoryId: essentialsCategoryId,
      name: "University Event Shirt",
      description: "Limited university event shirt for orientation season and official campus activities.",
      price: 39900,
      skuPrefix: "CWDU-EV",
      sizes: [["S", 0], ["M", 6], ["L", 14], ["XL", 9]],
    },
  ];

  for (const product of productRows) {
    const [existingProducts] = await db.execute(
      `select id from products where vendorId = ? and name = ? order by id asc`,
      [product.vendorId, product.name],
    );
    const [canonicalProduct] = existingProducts;
    const productId = canonicalProduct
      ? canonicalProduct.id
      : await upsertId(
          `insert into products (schoolId, vendorId, categoryId, name, description, priceInCentavos, isActive)
           values (?, ?, ?, ?, ?, ?, true)`,
          [schoolId, product.vendorId, product.categoryId, product.name, product.description, product.price],
        );

    await db.execute(
      `update products set categoryId = ?, description = ?, priceInCentavos = ?, isActive = true where id = ?`,
      [product.categoryId, product.description, product.price, productId],
    );
    await db.execute(
      `delete from products
       where vendorId = ? and name = ? and id <> ?
         and not exists (select 1 from productVariants where productVariants.productId = products.id)`,
      [product.vendorId, product.name, productId],
    );

    for (const [size, quantity] of product.sizes) {
      const variantId = await upsertId(
        `insert into productVariants (productId, size, sku, isActive)
         values (?, ?, ?, true)
         on duplicate key update id = last_insert_id(id), isActive = true`,
        [productId, size, `${product.skuPrefix}-${size}`],
      );
      await db.execute(
        `insert into inventory (variantId, quantity, lowStockThreshold)
         values (?, ?, 5)
         on duplicate key update quantity = values(quantity), lowStockThreshold = values(lowStockThreshold)`,
        [variantId, quantity],
      );
    }
  }

  await db.execute(
    `insert into pickupSlots (vendorId, label, startsAt, endsAt, capacity, isActive)
     select ?, 'Weekday collection · 10:00–16:00', date_add(curdate(), interval 1 day), date_add(curdate(), interval 1 day) + interval 16 hour, 40, true
     where not exists (select 1 from pickupSlots where vendorId = ? and label = 'Weekday collection · 10:00–16:00')`,
    [uniformVendorId, uniformVendorId],
  );

  await db.execute(`delete from announcements where schoolId = ? and title = ?`, [schoolId, "Demo catalog is ready to explore"]);
  const [existingAnnouncements] = await db.execute(
    `select id from announcements where schoolId = ? and title = ? limit 1`,
    [schoolId, "Uniform availability and pickup updates"],
  );
  if (existingAnnouncements.length === 0) {
    await db.execute(
      `insert into announcements (schoolId, vendorId, title, body, isActive) values (?, ?, ?, ?, true)`,
      [schoolId, uniformVendorId, "Uniform availability and pickup updates", "Check size-level availability before visiting the Student Center. Pickup requests are confirmed by the authorized vendor."],
    );
  } else {
    await db.execute(
      `update announcements set body = ?, vendorId = ?, isActive = true where id = ?`,
      ["Check size-level availability before visiting the Student Center. Pickup requests are confirmed by the authorized vendor.", uniformVendorId, existingAnnouncements[0].id],
    );
  }

  const [developmentUsers] = await db.execute(
    `select id from users order by id asc limit 1`,
  );
  const developmentUser = developmentUsers[0];
  if (developmentUser) {
    await db.execute(
      `insert into vendorStaff (vendorId, userId) values (?, ?)
       on duplicate key update vendorId = values(vendorId)`,
      [uniformVendorId, developmentUser.id],
    );
    await db.execute(
      `insert into schoolMemberships (schoolId, userId, role) values (?, ?, 'school_admin')
       on duplicate key update role = values(role)`,
      [schoolId, developmentUser.id],
    );
  }

  console.log("CampusWear development demo data is ready.");
} finally {
  await db.end();
}
