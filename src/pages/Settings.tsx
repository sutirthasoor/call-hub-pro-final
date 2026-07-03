import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseContext';
import { 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';

interface Settings {
  companyName: string;
  timezone: string;
  voipServer: string;
  voipPort: string;
  voipWebsocketUrl: string;
  autoRecord: boolean;
  recordingRetentionDays: number;
}

export default function Settings() {
  const { user, loading: authLoading } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [voipServer, setVoipServer] = useState('');
  const [voipPort, setVoipPort] = useState('');
  const [voipWs, setVoipWs] = useState('');
  const [autoRecord, setAutoRecord] = useState(false);
  const [retention, setRetention] = useState('90');
  const [activeTab, setActiveTab] = useState('general');

  // Load settings
  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settingsRef = doc(db, 'settings', 'app_settings');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setCompanyName(data.companyName || 'Call Hub Pro');
        setTimezone(data.timezone || 'UTC');
        setVoipServer(data.voipServer || '');
        setVoipPort(data.voipPort || '5060');
        setVoipWs(data.voipWebsocketUrl || '');
        setAutoRecord(data.autoRecord || false);
        setRetention(String(data.recordingRetentionDays || 90));
      } else {
        setCompanyName('Call Hub Pro');
        setTimezone('UTC');
        setVoipServer('');
        setVoipPort('5060');
        setVoipWs('');
        setAutoRecord(false);
        setRetention('90');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'app_settings');
      const settingsData = {
        companyName,
        timezone,
        voipServer,
        voipPort,
        voipWebsocketUrl: voipWs,
        autoRecord,
        recordingRetentionDays: Number(retention) || 90,
        updatedAt: Date.now()
      };
      await setDoc(settingsRef, settingsData, { merge: true });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in to view settings</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Settings</h1>
        <p style={{ color: '#666' }}>Configure your workspace settings</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0',
        marginBottom: '20px',
        borderBottom: '1px solid #ddd'
      }}>
        {['general', 'voip', 'recording', 'api'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#007bff' : 'transparent',
              color: activeTab === tab ? 'white' : '#333',
              border: activeTab === tab ? 'none' : 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              borderBottom: activeTab === tab ? 'none' : '2px solid transparent'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Company Settings</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Logo</label>
            <input
              type="file"
              accept="image/*"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Upload your company logo (PNG, JPG, SVG)</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
              <option value="Australia/Sydney">Sydney (AEDT)</option>
            </select>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* VoIP Settings */}
      {activeTab === 'voip' && (
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>VoIP / SIP Configuration</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Asterisk Server IP</label>
            <input
              type="text"
              value={voipServer}
              onChange={(e) => setVoipServer(e.target.value)}
              placeholder="sip.example.com"
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>SIP Port</label>
            <input
              type="text"
              value={voipPort}
              onChange={(e) => setVoipPort(e.target.value)}
              placeholder="5060"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>WebSocket URL</label>
            <input
              type="text"
              value={voipWs}
              onChange={(e) => setVoipWs(e.target.value)}
              placeholder="wss://sip.example.com:8089/ws"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Recording Settings */}
      {activeTab === 'recording' && (
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Recording Settings</h3>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontWeight: '500' }}>Auto-record calls</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Automatically record all incoming and outgoing calls</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
              <input
                type="checkbox"
                checked={autoRecord}
                onChange={(e) => setAutoRecord(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: autoRecord ? '#007bff' : '#ccc',
                borderRadius: '26px',
                transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '20px',
                  width: '20px',
                  left: autoRecord ? '26px' : '3px',
                  bottom: '3px',
                  background: 'white',
                  borderRadius: '50%',
                  transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Retention Period (days)</label>
            <input
              type="number"
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              min="1"
              max="365"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Number of days to keep recordings before automatic deletion
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'api' && (
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>API Keys</h3>
          
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Generate keys for the mobile app to authenticate with your backend.
          </p>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Current API Key</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value="sk_live_demo_••••••••••••"
                readOnly
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f5f5f5'
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText('sk_live_demo_••••••••••••');
                  alert('API key copied to clipboard!');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm('Generate a new API key? This will invalidate the old key.')) {
                alert('New API key generated: sk_live_new_' + Math.random().toString(36).substring(7));
              }
            }}
            style={{
              padding: '12px 24px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Generate New Key
          </button>
        </div>
      )}
    </div>
  );
}