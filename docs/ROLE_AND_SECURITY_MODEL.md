# CampusWear Role and Security Model

The browser may conditionally show the appropriate student, vendor, or school-admin interface, but it is not an authorization boundary. CampusWear server procedures validate every protected mutation and query against the authenticated role and associated school or vendor relationships.

| Role | Student records | Vendor records | School records | Platform records |
|---|---|---|---|---|
| Student | Own profile, cart, orders, notifications | Public catalog and announcements only | Public school catalog context | No access |
| Vendor staff | Order information for their vendor only | Assigned vendor catalog, stock, orders, announcements | Assigned school scope only | No access |
| School admin | School-scoped activity | Authorized school vendors | School settings and announcements | No access |
| Platform admin | Support access as needed | All vendors | All schools | Full administration |

For Supabase production environments, the corresponding RLS migration enables policies on every exposed `public` table. Client writes are limited to ownership and membership predicates. The inventory-safe checkout function performs row locking and order creation in one database transaction so browser-submitted stock numbers are never trusted.

