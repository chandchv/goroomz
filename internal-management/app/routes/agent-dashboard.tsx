import RoleProtectedRoute from '../components/RoleProtectedRoute';
import MainLayout from '../components/MainLayout';
import AgentDashboardPage from '../pages/AgentDashboardPage';

export default function AgentDashboardRoute() {
  return (
    <RoleProtectedRoute allowedRoles={['agent']}>
      <MainLayout>
        <AgentDashboardPage />
      </MainLayout>
    </RoleProtectedRoute>
  );
}
