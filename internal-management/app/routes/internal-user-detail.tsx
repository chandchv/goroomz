import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import UserDetailView from '../components/users/UserDetailView';
import DeactivateUserDialog from '../components/users/DeactivateUserDialog';
import internalUserService from '../services/internalUserService';
import type { InternalUser } from '../services/internalUserService';
import { useToast } from '../hooks/useToast';

export default function InternalUserDetailRoute() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
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

  const handleDeactivate = async (userIdToDeactivate: string) => {
    try {
      // Fetch user details
      const user = await internalUserService.getUserById(userIdToDeactivate);
      setSelectedUser(user);
      setDeactivateMode(user.isActive ? 'deactivate' : 'reactivate');
      setShowDeactivateDialog(true);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      showToast({
        title: 'Error',
        description: 'Failed to load user details',
        type: 'error'
      });
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!selectedUser) return;

    try {
      if (deactivateMode === 'deactivate') {
        await internalUserService.deactivateUser(selectedUser.id);
        showToast({ 
          title: 'User deactivated successfully', 
          description: 'All authentication tokens have been revoked',
          type: 'success' 
        });
      } else {
        await internalUserService.reactivateUser(selectedUser.id);
        showToast({ 
          title: 'User reactivated successfully', 
          description: 'User can now access the platform',
          type: 'success' 
        });
      }
      
      // Refresh the view
      setRefreshKey(prev => prev + 1);
      
      // Close dialog
      setShowDeactivateDialog(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(`Failed to ${deactivateMode} user:`, err);
      // Error is handled in the dialog component
      throw err;
    }
  };

  const handleCloseDeactivateDialog = () => {
    setShowDeactivateDialog(false);
    setSelectedUser(null);
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <UserDetailView 
          key={refreshKey}
          userId={userId} 
          onDeactivate={handleDeactivate}
        />
        
        <DeactivateUserDialog
          isOpen={showDeactivateDialog}
          onClose={handleCloseDeactivateDialog}
          onConfirm={handleConfirmDeactivation}
          user={selectedUser}
          mode={deactivateMode}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
