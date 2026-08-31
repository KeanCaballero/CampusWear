import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Announcements from "./pages/Announcements";
import Auth from "./pages/Auth";
import ConfirmedAccount from "./pages/ConfirmedAccount";
import Cart from "./pages/Cart";
import Favorites from "./pages/Favorites";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Orders from "./pages/Orders";
import ProductDetail from "./pages/ProductDetail";
import PasswordReset from "./pages/PasswordReset";
import PlatformAdmin from "./pages/PlatformAdmin";
import PlatformAccounts from "./pages/PlatformAccounts";
import PlatformTeam from "./pages/PlatformTeam";
import Profile from "./pages/Profile";
import SchoolAdmin from "./pages/SchoolAdmin";
import Shop from "./pages/Shop";
import StudentHome from "./pages/StudentHome";
import VendorApplication from "./pages/VendorApplication";
import VendorAnnouncements from "./pages/vendor/VendorAnnouncements";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorInventory from "./pages/vendor/VendorInventory";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorProducts from "./pages/vendor/VendorProducts";
import VendorReports from "./pages/vendor/VendorReports";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/student" component={StudentHome} />
    <Route path="/auth" component={Auth} />
    <Route path="/auth/confirmed" component={ConfirmedAccount} />
    <Route path="/auth/reset" component={PasswordReset} />
    <Route path="/shop/:id" component={ProductDetail} />
    <Route path="/shop" component={Shop} />
    <Route path="/cart" component={Cart} />
    <Route path="/favorites" component={Favorites} />
    <Route path="/orders" component={Orders} />
    <Route path="/announcements" component={Announcements} />
    <Route path="/notifications" component={Notifications} />
    <Route path="/profile" component={Profile} />
    <Route path="/vendor" component={VendorDashboard} />
    <Route path="/vendor/apply" component={VendorApplication} />
    <Route path="/vendor/orders" component={VendorOrders} />
    <Route path="/vendor/inventory" component={VendorInventory} />
    <Route path="/vendor/products" component={VendorProducts} />
    <Route path="/vendor/announcements" component={VendorAnnouncements} />
    <Route path="/vendor/reports" component={VendorReports} />
    <Route path="/admin" component={SchoolAdmin} />
    <Route path="/platform" component={PlatformAdmin} />
    <Route path="/platform/accounts" component={PlatformAccounts} />
    <Route path="/platform/team" component={PlatformTeam} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
