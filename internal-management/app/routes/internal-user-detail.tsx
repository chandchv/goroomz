import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import UserDetailView from '../components/users/UserDetailView';
import DeactivateUserDialog from '../components/users/DeactivateUserDialog';
import UserEditModal from '../components/users/UserEditModal';
import internalUserService from '../services/internalUserService';
import type { InternalUser } from '../services/internalUserService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';

export default function InternalUserDetailRoute() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [deactivateMode, setDeactivateMode] = useState<'deactivate' | 'reactivate'>('deactivate');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!userId) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">User ID is required</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const isSuperuser = currentUser?.role === 'superuser' || currentUser?.role === 'admin' || 
                      currentUser?.internalRole === 'superuser' || currentUser?.internalRole === 'platform_admin';

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setRefreshKey(prev => prev + 1);
    showToast({ title: 'User updated successfully', type: 'success' });
  };

  const handleDeactivate = async (userIdToDeactivate: string) => {
    try {
      const user = await internalUserService.getUserById(userIdToDeactivate);
      setSelectedUser(user);
      setDeactivateMode(user.isActive ? 'deactivate' : 'reactivate');
      setShowDeactivateDialog(true);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      showToast({ title: 'Error', description: 'Failed to load user details', type: 'error' });
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!selectedUser) return;
    try {
      if (deactivateMode === 'deactivate') {
        await internalUserService.deactivateUser(selectedUser.id);
        showToast({ title: 'User deactivated successfully', type: 'success' });
      } else {
        await internalUserService.reactivateUser(selectedUser.id);
        showToast({ title: 'User reactivated successfully', type: 'success' });
      }
      setRefreshKey(prev => prev + 1);
      setShowDeactivateDialog(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(`Failed to ${deactivateMode} user:`, err);
      throw err;
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <UserDetailView 
          key={refreshKey}
          userId={userId} 
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
        />
        
        <DeactivateUserDialog
          isOpen={showDeactivateDialog}
          onClose={() => { setShowDeactivateDialog(false); setSelectedUser(null); }}
          onConfirm={handleConfirmDeactivation}
          user={selectedUser}
          mode={deactivateMode}
        />

        <UserEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
          userId={userId}
          canEditRole={isSuperuser}
          canEditPermissions={isSuperuser}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
