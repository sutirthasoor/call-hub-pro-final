import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs,
} from 'firebase/firestore';
import { format, subDays, startOfDay } from 'date-fns';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
  assignedTo: string;
  createdAt: number;
}

interface CallRecord {
  id: string;
  agentId: string;
  agentName: string;
  leadName?: string;
  leadPhone: string;
  duration: number;
  status: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed';
  startTime: Date;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
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
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Last 7 days calls
  const last7 = (() => {
    if (!calls || calls.length === 0) return [];
    return Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const start = startOfDay(d).getTime();
      const end = start + 86400000;
      const count = calls.filter((c) => {
        const callTime = c.startTime.getTime();
        return callTime >= start && callTime < end;
      }).length;
      return { day: format(d, "EEE"), calls: count };
    });
  })();

  // Leads by status
  const leadsByStatus = (() => {
    if (!leads || leads.length === 0) return [];
    return ["new", "contacted", "proposal", "won", "lost"].map((s) => ({
      status: s,
      count: leads.filter((l) => l.status === s).length,
    }));
  })();

  // Stats
  const totalCalls = calls?.length || 0;
  const answered = calls?.filter((c) => c.status === "answered").length || 0;
  const won = leads?.filter((l) => l.status === "won").length || 0;
  const totalLeads = leads?.length || 0;
  const conversion = totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0;
  const avgDur = totalCalls > 0
    ? Math.round(calls.reduce((a, c) => a + c.duration, 0) / totalCalls)
    : 0;

  // Recent calls
  const recent = calls 
    ? [...calls].sort((a, b) => b.startTime.getTime() - a.startTime.getTime()).slice(0, 10)
    : [];

  

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Dashboard</h1>
        <p style={{ color: '#666' }}>Your daily activity and tasks</p>
      </div>

      {/* KPI Cards */}
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
          <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Total Leads</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '5px' }}>{totalLeads}</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Calls Made</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '5px' }}>{totalCalls}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>{answered} answered</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Conversion Rate</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '5px' }}>{conversion}%</div>
          <div style={{ color: '#666', fontSize: '12px' }}>{won} won</div>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Avg Call Duration</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '5px' }}>{formatDuration(avgDur)}</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Leads by Status */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Leads by Status</h3>
          <div style={{ height: '280px' }}>
            {leadsByStatus.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leadsByStatus.map((item) => (
                  <div key={item.status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{item.status}</span>
                      <span style={{ fontWeight: 'bold' }}>{item.count}</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      background: '#e9ecef', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${totalLeads > 0 ? (item.count / totalLeads) * 100 : 0}%`,
                        background: '#007bff',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%',
                color: '#666'
              }}>
                No lead data available
              </div>
            )}
          </div>
        </div>

        {/* Calls per Day */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Calls per Day (Last 7 Days)</h3>
          <div style={{ height: '280px' }}>
            {last7.length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '100%' }}>
                {last7.map((item) => {
                  const maxValue = Math.max(...last7.map(d => d.calls), 1);
                  const height = (item.calls / maxValue) * 200;
                  return (
                    <div key={item.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <div style={{ 
                        width: '30px', 
                        height: `${height}px`, 
                        background: '#007bff', 
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease'
                      }} />
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>{item.day}</div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.calls}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%',
                color: '#666'
              }}>
                No call data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Recent Calls</h3>
        <div style={{ maxHeight: '280px', overflow: 'auto' }}>
          {recent.length > 0 ? (
            recent.map((call) => (
              <div
                key={call.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: '1px solid #eee'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500' }}>{call.agentName}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {call.leadName || 'Unknown'} • {call.leadPhone}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: call.status === 'answered' ? '#d4edda' : '#e2e3e5',
                    color: call.status === 'answered' ? '#155724' : '#383d41'
                  }}>
                    {call.status}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {formatDuration(call.duration)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%',
              color: '#666'
            }}>
              No calls yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}