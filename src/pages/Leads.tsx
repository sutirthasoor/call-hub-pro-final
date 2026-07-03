import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseContext';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { format, isValid } from 'date-fns';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
  assignedTo: string | null;
  createdBy: string;
  createdAt: number;
}

interface Agent {
  id: string;
  fullName: string;
  email: string;
}

export default function Leads() {
  const { user, loading: authLoading } = useFirebase();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAgent, setBulkAgent] = useState('');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Safe date formatter
  const safeFormat = (date: any, formatStr: string) => {
    if (!date) return 'Invalid date';
    const d = typeof date === 'number' ? new Date(date) : date;
    if (!isValid(d)) return 'Invalid date';
    try {
      return format(d, formatStr);
    } catch {
      return 'Invalid date';
    }
  };

  // Fetch leads and agents
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch leads
      const leadsRef = collection(db, 'leads');
      const leadsSnap = await getDocs(leadsRef);
      const leadsData: Lead[] = [];
      leadsSnap.forEach((doc) => {
        const data = doc.data();
        leadsData.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          email: data.email || '',
          company: data.company || '',
          notes: data.notes || '',
          status: data.status || 'new',
          assignedTo: data.assignedTo || null,
          createdBy: data.createdBy || '',
          createdAt: data.createdAt || Date.now()
        } as Lead);
      });
      setLeads(leadsData);

      // Fetch agents
      const agentsRef = collection(db, 'users');
      const agentsSnap = await getDocs(agentsRef);
      const agentsData: Agent[] = [];
      agentsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'agent' || data.role === 'admin') {
          agentsData.push({ id: doc.id, fullName: data.fullName || '', email: data.email || '' } as Agent);
        }
      });
      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch = !search ||
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.includes(search) ||
        (lead.email || '').toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchAgent = agentFilter === 'all' || lead.assignedTo === agentFilter;
      
      return matchSearch && matchStatus && matchAgent;
    });
  }, [leads, search, statusFilter, agentFilter]);

  // ============================================
  // IMPORT FUNCTIONS
  // ============================================
  
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const rows = text.split(/\r?\n/).filter(Boolean);
      const [head, ...rest] = rows;
      const cols = head.split(",").map((s) => s.trim().toLowerCase());
      const idx = (n: string) => cols.indexOf(n);
      
      const parsed = rest.map((r) => {
        const c = r.split(",");
        return {
          firstName: c[idx("first name")] || c[0] || "",
          lastName: c[idx("last name")] || c[1] || "",
          phone: c[idx("phone")] || c[2] || "",
          email: c[idx("email")] || c[3] || "",
          company: c[idx("company")] || c[4] || "",
          notes: c[idx("notes")] || c[5] || "",
        };
      });
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleFile(file);
      } else {
        alert('Please upload a CSV file');
      }
    }
  };

  const importLeads = async () => {
    if (!preview || !user) return;
    
    try {
      const batch = writeBatch(db);
      const leadsRef = collection(db, 'leads');
      
      preview.forEach((p) => {
        const newLead = {
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          email: p.email || '',
          company: p.company || '',
          notes: p.notes || '',
          status: 'new' as const,
          assignedTo: null,
          createdBy: user.uid,
          createdAt: Date.now()
        };
        const docRef = doc(leadsRef);
        batch.set(docRef, newLead);
      });
      
      await batch.commit();
      alert(`Imported ${preview.length} leads successfully!`);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchData();
    } catch (error) {
      console.error('Error importing leads:', error);
      alert('Failed to import leads');
    }
  };

  const downloadTemplate = () => {
    const template = "First Name,Last Name,Phone,Email,Company,Notes\nJane,Doe,+15551234567,jane@example.com,Acme Inc,Initial outreach\nJohn,Smith,+15559876543,john@example.com,XYZ Corp,Follow up needed";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  
  const exportCSV = () => {
    const header = "Name,Phone,Email,Status,Assigned,Created\n";
    const body = filteredLeads
      .map((l) => {
        const agent = agents.find(a => a.id === l.assignedTo);
        return `${l.firstName} ${l.lastName},${l.phone},${l.email || ''},${l.status},${agent?.fullName || ''},${safeFormat(l.createdAt, 'yyyy-MM-dd')}`;
      })
      .join("\n");
    
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${safeFormat(Date.now(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // BULK ASSIGN
  // ============================================

  const bulkAssign = async () => {
    if (!bulkAgent || selected.size === 0) return;
    
    try {
      const batch = writeBatch(db);
      selected.forEach(async (leadId) => {
        const leadRef = doc(db, 'leads', leadId);
        batch.update(leadRef, { assignedTo: bulkAgent });
      });
      await batch.commit();
      
      alert(`Assigned ${selected.size} leads to ${agents.find(a => a.id === bulkAgent)?.fullName}`);
      setSelected(new Set());
      setBulkAgent('');
      fetchData();
    } catch (error) {
      console.error('Error assigning leads:', error);
      alert('Failed to assign leads');
    }
  };

  // ============================================
  // BULK DELETE - NEW
  // ============================================

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selected.size} selected leads? This action cannot be undone.`)) return;
    
    try {
      const batch = writeBatch(db);
      selected.forEach((leadId) => {
        const leadRef = doc(db, 'leads', leadId);
        batch.delete(leadRef);
      });
      await batch.commit();
      
      alert(`Deleted ${selected.size} leads successfully!`);
      setSelected(new Set());
      fetchData();
    } catch (error) {
      console.error('Error deleting leads:', error);
      alert('Failed to delete leads');
    }
  };

  // ============================================
  // SINGLE LEAD ACTIONS
  // ============================================

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      fetchData();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead');
    }
  };

  // ============================================
  // AUTH CHECKS
  // ============================================

  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading leads...</div>;
  }

  const canImport = true;

  // ============================================
  // UI RENDER
  // ============================================

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Leads</h1>
        <p style={{ color: '#666' }}>Import, assign and track leads through the pipeline</p>
      </div>

      {/* IMPORT SECTION */}
      {canImport && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '25px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Bulk Import (CSV)</h3>
              <p style={{ color: '#666', fontSize: '12px', margin: '5px 0 0 0' }}>
                Columns: First Name, Last Name, Phone, Email, Company, Notes
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              Template
            </button>
          </div>
          
          {/* Drag & Drop Area */}
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              border: isDragging ? '2px solid #007bff' : '2px dashed #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              background: isDragging ? '#f0f7ff' : '#fafafa',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ color: '#666', fontWeight: '500' }}>Drop CSV here or click to upload</span>
            <span style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>Supports .csv files</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>

          {/* Preview Table */}
          {preview && (
            <div style={{ marginTop: '15px' }}>
              <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '10px' }}>
                Preview ({preview.length} rows):
              </p>
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Phone</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{p.firstName} {p.lastName}</td>
                        <td style={{ padding: '10px' }}>{p.phone}</td>
                        <td style={{ padding: '10px' }}>{p.email}</td>
                        <td style={{ padding: '10px' }}>{p.company}</td>
                      </tr>
                    ))}
                    {preview.length > 5 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '10px', textAlign: 'center', color: '#999' }}>
                          ... and {preview.length - 5} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={importLeads}
                  style={{
                    padding: '10px 24px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Import {preview.length} leads
                </button>
                <button
                  onClick={() => setPreview(null)}
                  style={{
                    padding: '10px 24px',
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
          )}
        </div>
      )}

      {/* FILTERS & EXPORT */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white'
            }}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white'
            }}
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.fullName}</option>
            ))}
          </select>

          <button
            onClick={exportCSV}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
            }}
          >
            Export
          </button>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '15px',
            padding: '10px',
            background: '#f8f9fa',
            borderRadius: '4px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: '500' }}>{selected.size} selected</span>
            
            <select
              value={bulkAgent}
              onChange={(e) => setBulkAgent(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: 'white',
                minWidth: '150px'
              }}
            >
              <option value="">Assign to agent...</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.fullName}</option>
              ))}
            </select>
            
            <button
              onClick={bulkAssign}
              disabled={!bulkAgent}
              style={{
                padding: '8px 20px',
                background: bulkAgent ? '#007bff' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: bulkAgent ? 'pointer' : 'not-allowed'
              }}
            >
              Assign
            </button>

            {/* BULK DELETE BUTTON */}
            <button
              onClick={bulkDelete}
              style={{
                padding: '8px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete Selected
            </button>

            <button
              onClick={() => setSelected(new Set())}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* LEADS TABLE */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(filteredLeads.map(l => l.id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                  checked={selected.size === filteredLeads.length && filteredLeads.length > 0}
                />
              </th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Assigned</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No leads found
                </td>
              </tr>
            ) : (
              filteredLeads.slice(0, 200).map((lead) => {
                const agent = agents.find(a => a.id === lead.assignedTo);
                const statusColors = {
                  new: { bg: '#e3f2fd', color: '#0d47a1' },
                  contacted: { bg: '#fff3e0', color: '#e65100' },
                  proposal: { bg: '#f3e5f5', color: '#4a148c' },
                  won: { bg: '#e8f5e9', color: '#1b5e20' },
                  lost: { bg: '#fbe9e7', color: '#bf360c' }
                };
                const colors = statusColors[lead.status] || statusColors.new;

                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selected);
                          if (e.target.checked) {
                            newSelected.add(lead.id);
                          } else {
                            newSelected.delete(lead.id);
                          }
                          setSelected(newSelected);
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td style={{ padding: '12px' }}>{lead.phone}</td>
                    <td style={{ padding: '12px' }}>{lead.email || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          background: colors.bg,
                          color: colors.color,
                          fontSize: '12px'
                        }}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="proposal">Proposal</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {agent ? agent.fullName : <span style={{ color: '#999' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '12px' }}>{safeFormat(lead.createdAt, 'MMM d')}</td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        style={{
                          padding: '4px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
        Showing {Math.min(filteredLeads.length, 200)} of {filteredLeads.length} leads
      </div>
    </div>
  );
}