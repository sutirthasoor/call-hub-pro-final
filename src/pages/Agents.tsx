import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseContext';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  where
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { app } from '../lib/firebase';

interface Agent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'on_break';
  createdAt: number;
  createdBy: string;
}

export default function Agents() {
  const { user, loading: authLoading } = useFirebase();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newAgent, setNewAgent] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent'
  });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const agentsData: Agent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (data.role === 'agent' || data.role === 'admin') {
          agentsData.push({ 
            id: doc.id, 
            ...data,
            fullName: data.fullName || '',
            email: data.email || '',
            phone: data.phone || '',
            status: data.status || 'inactive'
          } as Agent);
        }
      });
      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchAgents();
  }, [user]);

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const auth = getAuth(app);
      
      const userCred = await createUserWithEmailAndPassword(
        auth, 
        newAgent.email, 
        newAgent.password
      );

      await addDoc(collection(db, 'users'), {
        id: userCred.user.uid,
        fullName: newAgent.fullName,
        email: newAgent.email,
        phone: newAgent.phone || '',
        role: newAgent.role,
        status: 'active',
        createdAt: Date.now(),
        createdBy: 'admin'
      });

      alert('Agent created successfully!');
      setShowAddModal(false);
      setNewAgent({ fullName: '', email: '', phone: '', password: '', role: 'agent' });
      fetchAgents();
    } catch (error: any) {
      alert(error.message || 'Error creating agent');
    }
  };

  const updateAgentStatus = async (agentId: string, status: string) => {
    try {
      const q = query(collection(db, 'users'), where('id', '==', agentId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, { status });
      });
      fetchAgents();
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Delete this agent?')) return;
    try {
      const q = query(collection(db, 'users'), where('id', '==', agentId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const searchLower = search.toLowerCase();
    const nameMatch = agent.fullName?.toLowerCase().includes(searchLower) || false;
    const emailMatch = agent.email?.toLowerCase().includes(searchLower) || false;
    return nameMatch || emailMatch;
  });

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading agents...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Agents</h1>
          <p style={{ color: '#666' }}>Manage your team members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          + Add Agent
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '14px' }}>Total Agents</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{agents.length}</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '14px' }}>Active</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
            {agents.filter(a => a.status === 'active').length}
          </div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '14px' }}>On Break</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffc107' }}>
            {agents.filter(a => a.status === 'on_break').length}
          </div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '14px' }}>Inactive</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc3545' }}>
            {agents.filter(a => a.status === 'inactive').length}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {filteredAgents.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '40px' }}>
            No agents found
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div
              key={agent.id}
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{agent.fullName || 'Unknown'}</h3>
                  <div style={{ color: '#666', fontSize: '14px' }}>{agent.email || 'No email'}</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>{agent.phone || 'No phone'}</div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: agent.status === 'active' ? '#d4edda' :
                              agent.status === 'on_break' ? '#fff3cd' : '#f8d7da',
                  color: agent.status === 'active' ? '#155724' :
                          agent.status === 'on_break' ? '#856404' : '#721c24'
                }}>
                  {agent.status || 'unknown'}
                </span>
              </div>

              <div style={{ 
                marginTop: '15px',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => updateAgentStatus(agent.id, 'active')}
                  style={{
                    padding: '5px 12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Set Active
                </button>
                <button
                  onClick={() => updateAgentStatus(agent.id, 'on_break')}
                  style={{
                    padding: '5px 12px',
                    background: '#ffc107',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Break
                </button>
                <button
                  onClick={() => updateAgentStatus(agent.id, 'inactive')}
                  style={{
                    padding: '5px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Deactivate
                </button>
                <button
                  onClick={() => deleteAgent(agent.id)}
                  style={{
                    padding: '5px 12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
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
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>Add New Agent</h2>
            <form onSubmit={handleAddAgent}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={newAgent.fullName}
                  onChange={(e) => setNewAgent({ ...newAgent, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Email *</label>
                <input
                  type="email"
                  required
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
                <input
                  type="text"
                  value={newAgent.phone}
                  onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Password *</label>
                <input
                  type="password"
                  required
                  value={newAgent.password}
                  onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                <select
                  value={newAgent.role}
                  onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create Agent
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}