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

interface Question {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'boolean';
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  targetAudience: 'all' | 'agents' | 'managers' | 'customers';
  status: 'draft' | 'active' | 'closed';
  sentAt?: number;
  expiresAt?: number;
  createdBy: string;
  createdAt: number;
  responses?: SurveyResponse[];
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userName: string;
  answers: Record<string, any>;
  submittedAt: number;
}

export default function Surveys() {
  const { user, loading: authLoading } = useFirebase();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResponses, setShowResponses] = useState<Survey | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'agents' | 'managers' | 'customers'>('all');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  // Load surveys
  useEffect(() => {
    if (!user) return;
    loadSurveys();
  }, [user]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'surveys'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const surveysData: Survey[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        surveysData.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          questions: data.questions || [],
          targetAudience: data.targetAudience || 'all',
          status: data.status || 'draft',
          sentAt: data.sentAt || null,
          expiresAt: data.expiresAt || null,
          createdBy: data.createdBy || user?.uid || 'unknown',
          createdAt: data.createdAt || Date.now(),
          responses: data.responses || []
        });
      });
      setSurveys(surveysData);
    } catch (error) {
      console.error('Error loading surveys:', error);
      alert('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        text: '',
        type: 'text',
        required: false,
        options: []
      }
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setQuestions([]);
    setTargetAudience('all');
  };

  const handleSaveSurvey = async () => {
    if (!title || questions.length === 0) {
      alert('Please add a title and at least one question');
      return;
    }

    const newSurvey = {
      title: title.trim(),
      description: description.trim(),
      questions: questions,
      targetAudience: targetAudience,
      status: 'draft',
      createdBy: user?.uid || 'unknown',
      createdAt: Date.now(),
      responses: []
    };

    try {
      await addDoc(collection(db, 'surveys'), newSurvey);
      alert('Survey created successfully!');
      resetForm();
      setShowModal(false);
      loadSurveys();
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Failed to save survey');
    }
  };

  const handleSendSurvey = async (survey: Survey) => {
    try {
      await updateDoc(doc(db, 'surveys', survey.id), {
        status: 'active',
        sentAt: Date.now()
      });
      alert(`Survey "${survey.title}" sent to mobile app!`);
      loadSurveys();
    } catch (error) {
      console.error('Error sending survey:', error);
      alert('Failed to send survey');
    }
  };

  const handleCloseSurvey = async (id: string) => {
    if (!confirm('Close this survey?')) return;
    try {
      await updateDoc(doc(db, 'surveys', id), { status: 'closed' });
      alert('Survey closed');
      loadSurveys();
    } catch (error) {
      console.error('Error closing survey:', error);
      alert('Failed to close survey');
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!confirm('Delete this survey?')) return;
    try {
      await deleteDoc(doc(db, 'surveys', id));
      alert('Survey deleted');
      loadSurveys();
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert('Failed to delete survey');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return { bg: '#d4edda', color: '#155724' };
      case 'draft': return { bg: '#fff3cd', color: '#856404' };
      case 'closed': return { bg: '#e2e3e5', color: '#383d41' };
      default: return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  const filteredSurveys = surveys.filter(s => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  // Auth check
  if (authLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Please log in to view surveys</div>;
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading surveys...</div>;
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
          <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Survey Manager</h1>
          <p style={{ color: '#666' }}>Create and send surveys to connected mobile apps</p>
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
          Create Survey
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
        {['all', 'active', 'draft', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '8px 16px',
              background: filterStatus === status ? '#007bff' : 'transparent',
              color: filterStatus === status ? 'white' : '#333',
              border: filterStatus === status ? 'none' : '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {status} ({surveys.filter(s => status === 'all' || s.status === status).length})
          </button>
        ))}
      </div>

      {/* Surveys List */}
      {filteredSurveys.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px',
          textAlign: 'center',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#666'
        }}>
          No surveys found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredSurveys.map((survey) => {
            const statusColors = getStatusColor(survey.status);
            
            return (
              <div
                key={survey.id}
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
                        {survey.status.toUpperCase()}
                      </span>
                      {survey.sentAt && (
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          Sent: {format(survey.sentAt, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{survey.title}</h3>
                    <p style={{ margin: '0 0 10px 0', color: '#555' }}>{survey.description}</p>
                    
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#666' }}>
                      <span>{survey.questions?.length || 0} questions</span>
                      <span>{survey.targetAudience}</span>
                      <span>{survey.responses?.length || 0} responses</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    {survey.status === 'draft' && (
                      <button
                        onClick={() => handleSendSurvey(survey)}
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
                    {survey.status === 'active' && (
                      <>
                        <button
                          onClick={() => setShowResponses(survey)}
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
                          Responses
                        </button>
                        <button
                          onClick={() => handleCloseSurvey(survey.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Close
                        </button>
                      </>
                    )}
                    {survey.status === 'closed' && (
                      <button
                        onClick={() => setShowResponses(survey)}
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
                        Responses
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSurvey(survey.id)}
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

      {/* Create Survey Modal */}
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>Create New Survey</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Survey Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter survey title"
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Survey description"
                rows={3}
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="all">All Users</option>
                <option value="agents">Agents Only</option>
                <option value="managers">Managers Only</option>
                <option value="customers">Customers Only</option>
              </select>
            </div>

            {/* Questions Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: '500' }}>Questions</label>
                <button
                  onClick={addQuestion}
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
                  Add Question
                </button>
              </div>

              {questions.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  border: '2px dashed #ddd',
                  borderRadius: '4px',
                  color: '#666'
                }}>
                  Click "Add Question" to start building your survey
                </div>
              ) : (
                questions.map((q, index) => (
                  <div
                    key={q.id}
                    style={{
                      background: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '4px',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong>Question {index + 1}</strong>
                      <button
                        onClick={() => removeQuestion(index)}
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
                        ✕
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                      placeholder="Enter question"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginBottom: '10px'
                      }}
                    />
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          background: 'white'
                        }}
                      >
                        <option value="text">Text Answer</option>
                        <option value="rating">Rating (1-5)</option>
                        <option value="boolean">Yes/No</option>
                        <option value="multiple_choice">Multiple Choice</option>
                      </select>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                        />
                        Required
                      </label>
                    </div>

                    {q.type === 'multiple_choice' && (
                      <div style={{ marginTop: '10px' }}>
                        <input
                          type="text"
                          placeholder="Options (comma separated: Option 1, Option 2, Option 3)"
                          onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveSurvey}
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
                Save Survey
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
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
      )}

      {/* Responses Modal */}
      {showResponses && (
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Responses: {showResponses.title}</h2>
              <button
                onClick={() => setShowResponses(null)}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{showResponses.responses?.length || 0}</div>
                <div style={{ color: '#666' }}>Total Responses</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{(showResponses.responses?.length || 0) > 0 ? '✅' : '⏳'}</div>
                <div style={{ color: '#666' }}>Status</div>
              </div>
            </div>

            {showResponses.questions.map((q, idx) => (
              <div key={q.id} style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>{idx + 1}. {q.text}</h4>
                {showResponses.responses && showResponses.responses.length > 0 ? (
                  showResponses.responses.map((r, ridx) => (
                    <div key={ridx} style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      fontSize: '14px'
                    }}>
                      <strong>{r.userName || 'Anonymous'}:</strong>{' '}
                      {typeof r.answers[q.id] === 'string' 
                        ? r.answers[q.id] 
                        : JSON.stringify(r.answers[q.id] || 'No answer')}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#666', padding: '10px' }}>No responses yet</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}