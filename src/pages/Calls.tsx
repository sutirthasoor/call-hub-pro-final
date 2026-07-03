import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseContext';
import { 
  collection, 
  getDocs,
  doc,
  query,
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore';
import { format, isValid } from 'date-fns';

interface CallRecord {
  id: string;
  callSid?: string;
  agentId: string;
  agentName: string;
  agentEmail?: string;
  leadId?: string;
  leadName?: string;
  leadPhone: string;
  leadEmail?: string;
  duration: number;
  status: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed' | 'unknown' | 'completed';
  direction?: 'inbound' | 'outbound';
  startTime: Date;
  endTime?: Date;
  recordingSid?: string;
  recordingUrl?: string;
  transcript?: string;
  hasRecording?: boolean;
  hasTranscript?: boolean;
  notes?: string;
  outcome?: string;
  callType?: string;
  recordingDuration?: number;
  recordingStatus?: string;
  isTranscribing?: boolean;
  transcriptionError?: string;
}

// ✅ Backend URLs
const BACKEND_URL = 'https://call-recording-backend.onrender.com';
const DEEPGRAM_API_KEY = 'c50f3cfb98d6b3586fe819f36c72d8536789450f';

export default function Calls() {
  const { user, loading: authLoading } = useFirebase();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [loadingRecordings, setLoadingRecordings] = useState<Record<string, boolean>>({});
  const [transcribingCalls, setTranscribingCalls] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch calls from Firebase
  useEffect(() => {
    if (!user) return;
    fetchCalls();
  }, [user]);

  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get ALL calls from Firebase
      const callsRef = collection(db, 'calls');
      const q = query(callsRef, orderBy('startTime', 'desc'), limit(1000));
      const callsSnap = await getDocs(q);
      
      // Separate: entries with recordings (from server) and entries without (from frontend)
      const recordingEntries: Record<string, any> = {};
      const frontendEntries: Record<string, any> = {};
      
      callsSnap.forEach((doc) => {
        const data = doc.data();
        const callSid = data.callSid || doc.id;
        
        if (data.recordingSid && data.hasRecording) {
          if (!recordingEntries[callSid] || data.recordingSid) {
            recordingEntries[callSid] = {
              id: doc.id,
              ...data,
              docId: doc.id
            };
          }
        } else {
          if (!frontendEntries[callSid]) {
            frontendEntries[callSid] = {
              id: doc.id,
              ...data,
              docId: doc.id
            };
          }
        }
      });
      
      // Now merge: For each recording entry, find matching frontend entry
      const mergedCalls: CallRecord[] = [];
      
      Object.keys(recordingEntries).forEach((callSid) => {
        const recordingData = recordingEntries[callSid];
        const frontendData = frontendEntries[callSid] || {};
        
        let startTime = new Date();
        const startTimeSource = frontendData.startTime || recordingData.startTime;
        if (startTimeSource) {
          if (typeof startTimeSource === 'object' && startTimeSource.toDate) {
            startTime = startTimeSource.toDate();
          } else if (typeof startTimeSource === 'string') {
            startTime = new Date(startTimeSource);
          } else if (typeof startTimeSource === 'number') {
            startTime = new Date(startTimeSource);
          }
        }
        
        const mergedCall: CallRecord = {
          id: recordingData.docId || recordingData.id,
          callSid: callSid,
          agentId: frontendData.agentId || recordingData.agentId || '',
          agentName: frontendData.agentName || recordingData.agentName || 'Unknown Agent',
          agentEmail: frontendData.agentEmail || recordingData.agentEmail || null,
          leadId: frontendData.leadId || recordingData.leadId || null,
          leadName: frontendData.leadName || recordingData.leadName || '',
          leadPhone: frontendData.leadPhone || recordingData.leadPhone || 'Unknown',
          leadEmail: frontendData.leadEmail || recordingData.leadEmail || null,
          duration: recordingData.duration || frontendData.duration || 0,
          status: recordingData.status || frontendData.status || 'unknown',
          direction: frontendData.direction || recordingData.direction || 'outbound',
          startTime: startTime,
          endTime: frontendData.endTime || recordingData.endTime || undefined,
          recordingSid: recordingData.recordingSid || null,
          recordingUrl: recordingData.recordingUrl || null,
          recordingDuration: recordingData.recordingDuration || null,
          recordingStatus: recordingData.recordingStatus || null,
          transcript: recordingData.transcript || frontendData.transcript || null,
          hasRecording: true,
          hasTranscript: !!(recordingData.transcript || frontendData.transcript),
          notes: frontendData.notes || recordingData.notes || '',
          outcome: frontendData.outcome || recordingData.outcome || null,
          callType: frontendData.callType || recordingData.callType || 'standard',
          isTranscribing: false,
          transcriptionError: undefined
        };
        
        mergedCalls.push(mergedCall);
      });
      
      mergedCalls.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      setCalls(mergedCalls);
      
    } catch (error) {
      console.error('Error fetching calls:', error);
      setError('Failed to load calls. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Generate transcript on demand using Deepgram
  const generateTranscript = async (callId: string, _recordingUrl: string, recordingSid: string) => {
    if (transcripts[callId]) return; // Already have transcript
    
    setTranscribingCalls(prev => ({ ...prev, [callId]: true }));
    setError(null);
    
    try {
      // First, try to get the recording audio URL
      const audioUrl = `${BACKEND_URL}/recording-audio/${recordingSid}`;
      
      console.log('🎙️ Generating transcript for:', callId);
      console.log('📡 Audio URL:', audioUrl);
      
      // Call Deepgram API directly with the audio URL
      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: audioUrl,
          punctuate: true,
          model: 'nova-2',
          diarize: true,
          smart_format: true,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Deepgram response received');
      
      // Extract transcript
      let transcript = '';
      try {
        transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      } catch (e) {
        console.error('Error extracting transcript:', e);
        transcript = 'Could not extract transcript from response';
      }
      
      if (transcript) {
        // Save transcript to Firebase
        const callRef = doc(db, 'calls', callId);
        await updateDoc(callRef, {
          transcript: transcript,
          hasTranscript: true,
          transcriptUpdatedAt: new Date().toISOString()
        });
        
        // Update local state
        setTranscripts(prev => ({ ...prev, [callId]: transcript }));
        
        // Update the call in the list
        setCalls(prev => prev.map(call => 
          call.id === callId 
            ? { ...call, transcript, hasTranscript: true }
            : call
        ));
        
        console.log('📝 Transcript saved to Firebase:', transcript.substring(0, 100) + '...');
      } else {
        throw new Error('No transcript generated');
      }
      
    } catch (error) {
      console.error('❌ Error generating transcript:', error);
      setError(`Failed to generate transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Update call with error
      setCalls(prev => prev.map(call => 
        call.id === callId 
          ? { ...call, transcriptionError: error instanceof Error ? error.message : 'Unknown error' }
          : call
      ));
    } finally {
      setTranscribingCalls(prev => ({ ...prev, [callId]: false }));
    }
  };

  // Safe date formatting
  const safeFormat = (date: Date | undefined, formatStr: string) => {
    if (!date || !isValid(date)) return 'Invalid date';
    try {
      return format(date, formatStr);
    } catch {
      return 'Invalid date';
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get recording URL from backend proxy
  const getRecordingUrl = async (recordingSid: string): Promise<string | null> => {
    if (!recordingSid) return null;
    return `${BACKEND_URL}/recording-audio/${recordingSid}`;
  };

  // Load recording
  const loadRecording = async (callId: string, recordingSid: string) => {
    if (!recordingSid) {
      console.warn('No recording SID provided');
      return;
    }
    
    if (recordingUrls[callId]) return;
    
    setLoadingRecordings(prev => ({ ...prev, [callId]: true }));
    try {
      const url = await getRecordingUrl(recordingSid);
      if (url) {
        setRecordingUrls(prev => ({ ...prev, [callId]: url }));
        console.log('✅ Recording URL loaded:', url);
      } else {
        console.warn('⚠️ No recording URL returned');
        setError('Could not load recording. Please try again.');
      }
    } catch (error) {
      console.error('Error loading recording:', error);
      setError('Failed to load recording. Please try again.');
    } finally {
      setLoadingRecordings(prev => ({ ...prev, [callId]: false }));
    }
  };

  // Play recording
  const togglePlay = (callId: string, recordingUrl: string) => {
    if (playingCallId === callId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingCallId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = recordingUrl;
        audioRef.current.play()
          .then(() => {
            console.log('▶️ Playing recording:', recordingUrl);
            setPlayingCallId(callId);
          })
          .catch((error) => {
            console.error('❌ Playback error:', error);
            setError('Failed to play recording: ' + error.message);
          });
      }
    }
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setPlayingCallId(null);
  };

  // Filter calls
  const filteredCalls = calls.filter(call => {
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      call.agentName?.toLowerCase().includes(searchLower) ||
      (call.leadName || '').toLowerCase().includes(searchLower) ||
      call.leadPhone.includes(search) ||
      (call.leadEmail || '').toLowerCase().includes(searchLower) ||
      (call.callSid || '').toLowerCase().includes(searchLower);
    
    const matchStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalCalls = filteredCalls.length;
  const answeredCalls = filteredCalls.filter(c => c.status === 'answered' || c.status === 'completed').length;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
  const withRecordings = filteredCalls.filter(c => c.recordingSid).length;
  const withTranscripts = filteredCalls.filter(c => c.transcript).length;

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'answered': return { bg: '#d4edda', color: '#155724' };
      case 'completed': return { bg: '#d4edda', color: '#155724' };
      case 'voicemail': return { bg: '#fff3cd', color: '#856404' };
      case 'no_answer': return { bg: '#e2e3e5', color: '#383d41' };
      case 'busy': return { bg: '#f8d7da', color: '#721c24' };
      case 'failed': return { bg: '#f8d7da', color: '#721c24' };
      default: return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in to view calls</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading calls...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <audio ref={audioRef} onEnded={handleAudioEnd} style={{ display: 'none' }} />

      {/* Error message */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '12px 20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Call Logs</h1>
        <p style={{ color: '#666' }}>Review calls with recordings, listen to audio, and generate transcripts</p>
        <div style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>
          Total calls with recordings: {calls.length}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Total Calls</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalCalls}</div>
        </div>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Answered</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{answeredCalls}</div>
        </div>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Answer Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{answerRate}%</div>
        </div>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Recordings</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{withRecordings}</div>
        </div>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#666', fontSize: '12px' }}>Transcripts</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{withTranscripts}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search by agent, lead, phone, email, or Call SID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'white'
          }}
        >
          <option value="all">All Status</option>
          <option value="answered">Answered</option>
          <option value="completed">Completed</option>
          <option value="voicemail">Voicemail</option>
          <option value="no_answer">No Answer</option>
          <option value="busy">Busy</option>
          <option value="failed">Failed</option>
        </select>

        <button
          onClick={() => fetchCalls()}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Calls Table */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date & Time</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Agent</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Lead Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Duration</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Recording</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Transcript</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  {calls.length === 0 ? 'No calls with recordings found. Make a call and wait for the recording to process.' : 'No calls match your filters.'}
                </td>
              </tr>
            ) : (
              filteredCalls.slice(0, 200).map((call) => {
                const statusColors = getStatusColor(call.status);
                const hasRecording = call.recordingSid && call.recordingSid.length > 0;
                const hasTranscript = call.transcript && call.transcript.length > 0;
                const isTranscribing = transcribingCalls[call.id];
                const hasTranscriptInState = transcripts[call.id];
                
                return (
                  <tr key={call.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      {safeFormat(call.startTime, 'MMM d, yyyy h:mm:ss a')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{call.agentName}</div>
                      {call.agentEmail && (
                        <div style={{ fontSize: '11px', color: '#888' }}>{call.agentEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {call.leadName || '—'}
                      {call.leadId && (
                        <div style={{ fontSize: '10px', color: '#aaa' }}>ID: {call.leadId}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {call.leadPhone}
                      {call.leadEmail && (
                        <div style={{ fontSize: '11px', color: '#888' }}>{call.leadEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {formatDuration(call.duration)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        background: statusColors.bg,
                        color: statusColors.color
                      }}>
                        {call.status}
                      </span>
                      {call.direction && (
                        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {hasRecording ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {loadingRecordings[call.id] ? (
                            <span>Loading...</span>
                          ) : recordingUrls[call.id] ? (
                            <button
                              onClick={() => togglePlay(call.id, recordingUrls[call.id])}
                              style={{
                                padding: '5px 12px',
                                background: playingCallId === call.id ? '#dc3545' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {playingCallId === call.id ? '⏹ Stop' : '▶ Play'}
                            </button>
                          ) : (
                            <button
                              onClick={() => loadRecording(call.id, call.recordingSid!)}
                              style={{
                                padding: '5px 12px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Load
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {hasTranscript || hasTranscriptInState ? (
                        <button
                          onClick={() => {
                            const transcriptText = hasTranscriptInState || call.transcript || '';
                            const modal = document.createElement('div');
                            modal.style.cssText = `
                              position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                              background: rgba(0,0,0,0.5); display: flex; align-items: center;
                              justify-content: center; z-index: 9999;
                            `;
                            modal.innerHTML = `
                              <div style="background: white; border-radius: 12px; padding: 30px; 
                                max-width: 600px; max-height: 80vh; overflow: auto; width: 90%;">
                                <h3 style="margin-top: 0;">Call Transcript</h3>
                                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; 
                                  white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
                                  ${transcriptText || 'No transcript available'}
                                </div>
                                <button onclick="this.closest('div[style]').remove()" 
                                  style="margin-top: 15px; padding: 8px 20px; background: #007bff; 
                                  color: white; border: none; border-radius: 6px; cursor: pointer;">
                                  Close
                                </button>
                              </div>
                            `;
                            document.body.appendChild(modal);
                            modal.addEventListener('click', (e) => {
                              if (e.target === modal) modal.remove();
                            });
                          }}
                          style={{
                            padding: '5px 12px',
                            background: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                      ) : (
                        <button
                          onClick={() => generateTranscript(call.id, call.recordingUrl || '', call.recordingSid || '')}
                          disabled={isTranscribing || !call.recordingSid}
                          style={{
                            padding: '5px 12px',
                            background: isTranscribing ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isTranscribing || !call.recordingSid ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isTranscribing ? '⏳ Generating...' : 'Generate'}
                        </button>
                      )}
                      {call.transcriptionError && (
                        <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '2px' }}>
                          Error: {call.transcriptionError}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
        Showing {Math.min(filteredCalls.length, 200)} of {filteredCalls.length} calls with recordings
      </div>
    </div>
  );
}