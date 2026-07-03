import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseContext';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { app } from '../lib/firebase';
import { format } from 'date-fns';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'manager' | 'agent';
  status: 'active' | 'inactive' | 'on_break';
  adminId: string | null;
  managerId: string | null;
  createdBy: string;
  createdAt: number;
  lastLogin?: number;
}

export default function Users() {
  const { user, loading: authLoading } = useFirebase();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const usersData: User[] = [];
      usersSnap.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      
      const userId = user.uid || (user as any).id;
      let filteredUsers = usersData;
      
      if ((user as any).role === 'admin') {
        filteredUsers = usersData.filter(u => 
          u.id === userId || 
          u.adminId === userId ||
          (u.role === 'agent' && u.adminId === userId)
        );
      } else if ((user as any).role === 'manager') {
        filteredUsers = usersData.filter(u => 
          u.id === userId || 
          u.managerId === userId
        );
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in to view users</div>;
  }

  if ((user as any).role !== 'super_admin' && (user as any).role !== 'admin' && (user as any).role !== 'manager') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading users...</div>;
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      alert('User deleted');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleResetPassword = async (userToReset: User) => {
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, userToReset.email);
      alert(`Password reset email sent to ${userToReset.email}`);
      setResetPasswordUser(null);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      alert(error?.message || 'Failed to send reset email');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return { bg: '#d4edda', color: '#155724' };
      case 'inactive': return { bg: '#f8d7da', color: '#721c24' };
      case 'on_break': return { bg: '#fff3cd', color: '#856404' };
      default: return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'super_admin': return '#dc3545';
      case 'admin': return '#007bff';
      case 'manager': return '#28a745';
      case 'agent': return '#6c757d';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>User Management</h1>
          <p style={{ color: '#666' }}>
            {(user as any).role === 'super_admin' 
              ? 'Create and manage all users'
              : (user as any).role === 'admin'
                ? 'Create and manage managers and agents under you'
                : 'Create and manage agents under you'}
          </p>
        </div>
        {((user as any).role === 'super_admin' || (user as any).role === 'admin' || (user as any).role === 'manager') && (
          <button
            onClick={() => {
              setEditingUser(null);
              setShowModal(true);
            }}
            style={{
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ➕ Add User
          </button>
        )}
      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            background: 'white'
          }}
        >
          <option value="all">All Roles</option>
          {(user as any).role === 'super_admin' && (
            <option value="super_admin">Super Admin</option>
          )}
          {(user as any).role !== 'manager' && (
            <option value="admin">Admin</option>
          )}
          {((user as any).role === 'super_admin' || (user as any).role === 'admin') && (
            <option value="manager">Manager</option>
          )}
          <option value="agent">Agent</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            background: 'white'
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_break">On Break</option>
        </select>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Last Login</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const statusColors = getStatusColor(u.status);
                const roleColor = getRoleColor(u.role);
                
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{u.fullName || 'Unknown'}</td>
                    <td style={{ padding: '12px' }}>{u.email || 'No email'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: roleColor,
                        color: 'white'
                      }}>
                        {u.role?.replace('_', ' ') || 'unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{u.phone || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: statusColors.bg,
                        color: statusColors.color
                      }}>
                        {u.status || 'unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.createdAt ? format(u.createdAt, 'MMM d, yyyy') : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.lastLogin ? format(u.lastLogin, 'MMM d, h:mm a') : 'Never'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setShowModal(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setResetPasswordUser(u)}
                          style={{
                            padding: '4px 8px',
                            background: '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      {showModal && (
        <UserModal
          open={showModal}
          onClose={() => setShowModal(false)}
          editingUser={editingUser}
          currentUser={user}
          onSave={loadUsers}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>Reset Password</h2>
            <p>Send password reset email to <strong>{resetPasswordUser.email}</strong>?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => handleResetPassword(resetPasswordUser)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Send Reset Email
              </button>
              <button
                onClick={() => setResetPasswordUser(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Modal Component
function UserModal({ 
  open, 
  onClose, 
  editingUser, 
  currentUser, 
  onSave 
}: { 
  open: boolean;
  onClose: () => void;
  editingUser: User | null;
  currentUser: any;
  onSave: () => void;
}) {
  const [fullName, setFullName] = useState(editingUser?.fullName || '');
  const [email, setEmail] = useState(editingUser?.email || '');
  const [phone, setPhone] = useState(editingUser?.phone || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin' | 'manager' | 'agent'>(
    editingUser?.role || 'agent'
  );
  const [status, setStatus] = useState(editingUser?.status || 'active');
  const [managerId, setManagerId] = useState(editingUser?.managerId || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const usersData: User[] = [];
        usersSnap.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() } as User);
        });
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    if (open) {
      loadUsers();
    }
  }, [open]);

  const getAvailableRoles = () => {
    const roles: { value: 'super_admin' | 'admin' | 'manager' | 'agent'; label: string }[] = [];
    if (currentUser?.role === 'super_admin') {
      roles.push({ value: 'super_admin', label: 'Super Admin' });
      roles.push({ value: 'admin', label: 'Admin' });
      roles.push({ value: 'manager', label: 'Manager' });
      roles.push({ value: 'agent', label: 'Agent' });
    } else if (currentUser?.role === 'admin') {
      roles.push({ value: 'manager', label: 'Manager' });
      roles.push({ value: 'agent', label: 'Agent' });
    } else if (currentUser?.role === 'manager') {
      roles.push({ value: 'agent', label: 'Agent' });
    }
    return roles;
  };

  const handleSubmit = async () => {
    if (!fullName || !email) {
      alert('Please fill in all required fields');
      return;
    }

    if (!editingUser && !password) {
      alert('Please enter a password for the new user');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth(app);
      let userId = editingUser?.id || '';

      if (!editingUser) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        userId = userCred.user.uid;
      }

      const userData = {
        fullName,
        email,
        phone: phone || '',
        role,
        status,
        managerId: role === 'agent' ? (managerId || null) : null,
        adminId: role === 'admin' ? currentUser?.uid : null,
        createdBy: editingUser?.createdBy || currentUser?.uid,
        createdAt: editingUser?.createdAt || Date.now()
      };

      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), userData);
        alert('User updated successfully!');
      } else {
        await addDoc(collection(db, 'users'), { id: userId, ...userData });
        alert('User created successfully!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered. Please use a different email.');
      } else {
        alert(error?.message || 'Failed to save user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>{editingUser ? 'Edit User' : 'Create User'}</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Full Name *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={!!editingUser}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              background: editingUser ? '#f5f5f5' : 'white'
            }}
          />
          {editingUser && <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Email cannot be changed</p>}
        </div>

        {!editingUser && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a secure password"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>User will use this password to login</p>
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'super_admin' | 'admin' | 'manager' | 'agent')}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            {getAvailableRoles().map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'on_break')}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_break">On Break</option>
          </select>
        </div>

        {role === 'agent' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Assign to Manager</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">None</option>
              {users
                .filter(u => u.role === 'manager' && (u.adminId === currentUser?.uid || currentUser?.role === 'super_admin'))
                .map(m => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))
              }
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}