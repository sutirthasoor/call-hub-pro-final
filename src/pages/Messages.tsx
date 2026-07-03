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
  doc,
  orderBy
} from 'firebase/firestore';
import { format } from 'date-fns';

interface Message {
  id: string;
  title: string;
  content: string;
  type: 'notification' | 'alert' | 'reminder';
  targetAudience: 'all' | 'agents' | 'managers' | 'specific';
  targetUserIds?: string[];
  status: 'draft' | 'sent' | 'failed';
  sentAt?: number;
  sentBy: string;
  createdAt: number;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export default function Messages() {
  const { user, loading: authLoading } = useFirebase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'notification' | 'alert' | 'reminder'>('notification');
  const [targetAudience, setTargetAudience] = useState<'all' | 'agents' | 'managers' | 'specific'>('all');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  // Load messages and users
  useEffect(() => {
    if (!user) return;
    loadMessages();
    loadUsers();
  }, [user]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const messagesData: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          title: data.title || '',
          content: data.content || '',
          type: data.type || 'notification',
          targetAudience: data.targetAudience || 'all',
          targetUserIds: data.targetUserIds || [],
          status: data.status || 'draft',
          sentAt: data.sentAt || null,
          sentBy: data.sentBy || user?.uid || 'unknown',
          createdAt: data.createdAt || Date.now()
        });
      });
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      alert('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

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

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('notification');
    setTargetAudience('all');
    setTargetUsers([]);
  };

  const handleSendMessage = async () => {
    if (!title || !content) {
      alert('Please fill in title and content');
      return;
    }

    const newMessage: any = {
      title: title.trim(),
      content: content.trim(),
      type: type,
      targetAudience: targetAudience,
      status: 'sent',
      sentAt: Date.now(),
      sentBy: user?.uid || 'unknown',
      createdAt: Date.now()
    };

    if (targetAudience === 'specific' && targetUsers.length > 0) {
      newMessage.targetUserIds = targetUsers;
    }

    try {
      await addDoc(collection(db, 'messages'), newMessage);
      alert('Message sent successfully!');
      resetForm();
      setShowModal(false);
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleSaveDraft = async () => {
    if (!title || !content) {
      alert('Please fill in title and content');
      return;
    }

    const draft: any = {
      title: title.trim(),
      content: content.trim(),
      type: type,
      targetAudience: targetAudience,
      status: 'draft',
      sentBy: user?.uid || 'unknown',
      createdAt: Date.now()
    };

    if (targetAudience === 'specific' && targetUsers.length > 0) {
      draft.targetUserIds = targetUsers;
    }

    try {
      await addDoc(collection(db, 'messages'), draft);
      alert('Draft saved!');
      resetForm();
      setShowModal(false);
      loadMessages();
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'messages', id));
      alert('Message deleted');
      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleResend = async (message: Message) => {
    try {
      await updateDoc(doc(db, 'messages', message.id), {
        status: 'sent',
        sentAt: Date.now()
      });
      alert('Message resent!');
      loadMessages();
    } catch (error) {
      console.error('Error resending:', error);
      alert('Failed to resend');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'sent': return { bg: '#d4edda', color: '#155724' };
      case 'draft': return { bg: '#fff3cd', color: '#856404' };
      case 'failed': return { bg: '#f8d7da', color: '#721c24' };
      default: return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'notification': return '#007bff';
      case 'alert': return '#dc3545';
      case 'reminder': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filterStatus === 'all') return true;
    return msg.status === filterStatus;
  });

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in to view messages</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading messages...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Message Center</h1>
          <p style={{ color: '#666' }}>Create and send messages to connected mobile apps</p>
        </div>
        <button
          onClick={() => {
            resetForm();
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
          New Message
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '8px 16px',
            background: filterStatus === 'all' ? '#007bff' : 'transparent',
            color: filterStatus === 'all' ? 'white' : '#333',
            border: filterStatus === 'all' ? 'none' : '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          All Messages ({messages.length})
        </button>
        <button
          onClick={() => setFilterStatus('sent')}
          style={{
            padding: '8px 16px',
            background: filterStatus === 'sent' ? '#007bff' : 'transparent',
            color: filterStatus === 'sent' ? 'white' : '#333',
            border: filterStatus === 'sent' ? 'none' : '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sent ({messages.filter(m => m.status === 'sent').length})
        </button>
        <button
          onClick={() => setFilterStatus('draft')}
          style={{
            padding: '8px 16px',
            background: filterStatus === 'draft' ? '#007bff' : 'transparent',
            color: filterStatus === 'draft' ? 'white' : '#333',
            border: filterStatus === 'draft' ? 'none' : '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Drafts ({messages.filter(m => m.status === 'draft').length})
        </button>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px',
          textAlign: 'center',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#666'
        }}>
          No messages found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredMessages.map((msg) => {
            const statusColors = getStatusColor(msg.status);
            const typeColor = getTypeColor(msg.type);
            
            return (
              <div
                key={msg.id}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: statusColors.bg,
                        color: statusColors.color
                      }}>
                        {msg.status.toUpperCase()}
                      </span>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: typeColor,
                        color: 'white'
                      }}>
                        {msg.type}
                      </span>
                      {msg.sentAt && (
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {format(msg.sentAt, 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                    
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{msg.title}</h3>
                    <p style={{ margin: '0 0 10px 0', color: '#555' }}>{msg.content}</p>
                    
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Target: {msg.targetAudience}
                      {msg.targetAudience === 'specific' && msg.targetUserIds && (
                        <span> ({msg.targetUserIds.length} users)</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    {msg.status === 'draft' && (
                      <button
                        onClick={() => handleResend(msg)}
                        style={{
                          padding: '6px 12px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Send
                      </button>
                    )}
                    {msg.status === 'sent' && (
                      <button
                        onClick={() => handleResend(msg)}
                        style={{
                          padding: '6px 12px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(msg.id)}
                      style={{
                        padding: '6px 12px',
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Message Modal */}
      {showModal && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>New Message</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Message title"
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="notification">Notification</option>
                <option value="alert">Alert</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Users</option>
                <option value="agents">Agents Only</option>
                <option value="managers">Managers Only</option>
                <option value="specific">Specific Users</option>
              </select>
            </div>

            {targetAudience === 'specific' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select Users</label>
                <select
                  onChange={(e) => {
                    if (e.target.value && !targetUsers.includes(e.target.value)) {
                      setTargetUsers([...targetUsers, e.target.value]);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Add user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                  ))}
                </select>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                  {targetUsers.map(uid => {
                    const u = users.find(u => u.id === uid);
                    return u ? (
                      <span key={uid} style={{
                        padding: '4px 10px',
                        background: '#e9ecef',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        {u.fullName}
                        <button
                          onClick={() => setTargetUsers(targetUsers.filter(id => id !== uid))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc3545',
                            fontSize: '14px'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Content *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Message content..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveDraft}
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
                Save Draft
              </button>
              <button
                onClick={handleSendMessage}
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
                Send Now
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
                style={{
                  padding: '12px 20px',
                  background: '#dc3545',
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