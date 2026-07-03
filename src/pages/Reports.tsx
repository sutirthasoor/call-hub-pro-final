import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseContext';
import { 
  collection, 
  getDocs
} from 'firebase/firestore';

interface Agent {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  assignedTo: string | null;
}

interface CallRecord {
  id: string;
  agentId: string;
  agentName: string;
  status: string;
  duration: number;
  startTime: Date;
}

export default function Reports() {
  const { user, loading: authLoading } = useFirebase();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('agent');

  // Fetch data
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch agents
      const agentsRef = collection(db, 'users');
      const agentsSnap = await getDocs(agentsRef);
      const agentsData: Agent[] = [];
      agentsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'agent' || data.role === 'admin') {
          agentsData.push({ id: doc.id, ...data } as Agent);
        }
      });
      setAgents(agentsData);

      // Fetch leads
      const leadsRef = collection(db, 'leads');
      const leadsSnap = await getDocs(leadsRef);
      const leadsData: Lead[] = [];
      leadsSnap.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() } as Lead);
      });
      setLeads(leadsData);

      // Fetch calls
      const callsRef = collection(db, 'calls');
      const callsSnap = await getDocs(callsRef);
      const callsData: CallRecord[] = [];
      callsSnap.forEach((doc) => {
        const data = doc.data();
        callsData.push({
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate?.() || new Date(data.startTime)
        } as CallRecord);
      });
      setCalls(callsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get agent metrics
  const getAgentMetrics = (agentId: string) => {
    const agentLeads = leads.filter(l => l.assignedTo === agentId);
    const agentCalls = calls.filter(c => c.agentId === agentId);
    const answeredCalls = agentCalls.filter(c => c.status === 'answered');
    const totalCalls30d = agentCalls.length;
    const conversion = agentLeads.length > 0 
      ? Math.round((agentLeads.filter(l => l.status === 'won').length / agentLeads.length) * 100)
      : 0;
    const avgDuration = totalCalls30d > 0
      ? Math.round(agentCalls.reduce((sum, c) => sum + c.duration, 0) / totalCalls30d)
      : 0;
    const answerRate = totalCalls30d > 0
      ? Math.round((answeredCalls.length / totalCalls30d) * 100)
      : 0;

    return {
      leadsAssigned: agentLeads.length,
      calls30d: totalCalls30d,
      conversion,
      avgDuration,
      answerRate,
      callsToday: agentCalls.filter(c => {
        const today = new Date();
        return c.startTime.getDate() === today.getDate() &&
               c.startTime.getMonth() === today.getMonth() &&
               c.startTime.getFullYear() === today.getFullYear();
      }).length
    };
  };

  // Generate report data
  const getReportData = () => {
    switch(reportType) {
      case 'agent':
        return {
          title: 'Agent Performance',
          cols: ['Agent', 'Leads', 'Calls (30d)', 'Conversion', 'Avg Duration', 'Answer Rate'],
          rows: agents.map(a => {
            const m = getAgentMetrics(a.id);
            return [a.fullName, m.leadsAssigned, m.calls30d, `${m.conversion}%`, formatDuration(m.avgDuration), `${m.answerRate}%`];
          })
        };
      
      case 'conversion':
        return {
          title: 'Lead Conversion',
          cols: ['Status', 'Count', 'Share'],
          rows: ['new', 'contacted', 'proposal', 'won', 'lost'].map(s => {
            const n = leads.filter(l => l.status === s).length;
            return [s, n, leads.length ? `${Math.round((n / leads.length) * 100)}%` : '0%'];
          })
        };
      
      case 'volume':
        return {
          title: 'Call Volume',
          cols: ['Status', 'Count'],
          rows: ['answered', 'voicemail', 'no_answer', 'busy', 'failed'].map(s => {
            return [s, calls.filter(c => c.status === s).length];
          })
        };
      
      case 'activity':
        return {
          title: 'Daily Activity',
          cols: ['Agent', 'Calls Today', 'Status'],
          rows: agents.map(a => {
            const m = getAgentMetrics(a.id);
            return [a.fullName, m.callsToday, a.status];
          })
        };
      
      default:
        return {
          title: 'Agent Performance',
          cols: ['Agent', 'Leads', 'Calls (30d)', 'Conversion', 'Avg Duration', 'Answer Rate'],
          rows: agents.map(a => {
            const m = getAgentMetrics(a.id);
            return [a.fullName, m.leadsAssigned, m.calls30d, `${m.conversion}%`, formatDuration(m.avgDuration), `${m.answerRate}%`];
          })
        };
    }
  };

  const report = getReportData();

  // Export CSV
  const exportCSV = () => {
    const header = report.cols.join(',');
    const rows = report.rows.map(row => row.join(',')).join('\n');
    const csv = `${header}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print/PDF
  const exportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>${report.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background: #f5f5f5; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>${report.title}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>${report.cols.map(c => `<th>${c}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${report.rows.map(row => 
                `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  // Email report (simulated)
  const emailReport = () => {
    alert('📧 Report would be emailed to: admin@example.com');
  };

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in to view reports</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading reports...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Reports</h1>
        <p style={{ color: '#666' }}>Generate performance and activity reports</p>
      </div>

      {/* Report Controls */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="agent">Agent Performance</option>
            <option value="conversion">Lead Conversion</option>
            <option value="volume">Call Volume</option>
            <option value="activity">Daily Activity</option>
          </select>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{report.title}</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportPDF}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            PDF
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            CSV
          </button>
          <button
            onClick={emailReport}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ✉Email
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              {report.cols.map((col, index) => (
                <th key={index} style={{ padding: '12px', textAlign: 'left' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={report.cols.length} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No data available
                </td>
              </tr>
            ) : (
              report.rows.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} style={{ padding: '12px' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginTop: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Total Agents</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{agents.length}</div>
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Total Leads</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{leads.length}</div>
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Total Calls</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{calls.length}</div>
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Conversion Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {leads.length > 0 
              ? `${Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100)}%`
              : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
}