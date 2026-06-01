import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LoginPage } from '@/features/auth/login-page';
import { SignupPage } from '@/features/auth/signup-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { MenuPage } from '@/features/menu/menu-page';
import { TablesPage } from '@/features/tables/tables-page';
import { PosPage } from '@/features/pos/pos-page';
import { OrdersListPage } from '@/features/orders/orders-list-page';
import { BillingPage } from '@/features/billing/billing-page';
import { CustomersPage } from '@/features/customers/customers-page';
import { CustomerDetailPage } from '@/features/customers/customer-detail-page';
import { FeedbackPage } from '@/features/customers/feedback-page';
import { InventoryPage } from '@/features/inventory/inventory-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { KdsPage } from '@/features/kds/kds-page';
import { StaffPage } from '@/features/staff/staff-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { LeadsPage } from '@/features/leads/leads-page';
import { CommunicationsPage } from '@/features/communications/communications-page';
import { TasksPage } from '@/features/tasks/tasks-page';
import { CampaignsPage } from '@/features/campaigns/campaigns-page';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/layout/protected-route';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/pos" element={<PosPage />} />
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/billing/:orderId" element={<BillingPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/kds" element={<KdsPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/communications" element={<CommunicationsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
