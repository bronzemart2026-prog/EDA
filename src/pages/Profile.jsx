import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { toBanglaNumber } from '../utils/bangla';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import { LogOut, UserPlus, Users, Edit, Shield, Check, X, Save, Eye } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const isAdmin = user.role === 'admin';

  // State for Users List
  const [usersList, setUsersList] = useState([]);
  const [membersList, setMembersList] = useState([]); // Used for member dropdown
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeUserDetail, setActiveUserDetail] = useState(null);
  
  // Form submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [userForm, setUserForm] = useState({
    name: '',
    mobile: '',
    username: '',
    password: '',
    role: 'member',
    status: 'active',
    memberId: ''
  });

  // Fetch users & members list (only if admin)
  const fetchAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const usersData = await apiRequest('/api/users');
      setUsersList(usersData);
      
      const membersData = await apiRequest('/api/members');
      setMembersList(membersData);
    } catch (err) {
      setError('ইউজার লিস্ট লোড করা সম্ভব হয়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showUsersPanel) {
      fetchAdminData();
    }
  }, [showUsersPanel]);

  const handleLogout = () => {
    if (window.confirm('আপনি কি নিশ্চিতভাবে লগআউট করতে চান?')) {
      logout();
    }
  };

  // Create User submit
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const body = { ...userForm };
    if (!body.memberId) delete body.memberId; // Clean empty memberId

    const promise = apiRequest('/api/users', {
      method: 'POST',
      body
    });

    toast.promise(promise, {
      loading: 'ইউজার তৈরি করা হচ্ছে...',
      success: 'ইউজার সফলভাবে তৈরি হয়েছে!',
      error: (err) => err.message || 'ইউজার তৈরি করতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      setShowAddModal(false);
      resetUserForm();
      fetchAdminData();
    } catch (err) {} finally {
      setIsSubmitting(false);
    }
  };

  // Edit User submit
  const handleEditUser = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const body = { ...userForm };
    if (!body.password) delete body.password; // Do not send empty password
    if (!body.memberId) body.memberId = null;

    const promise = apiRequest(`/api/users/${selectedUser._id}`, {
      method: 'PUT',
      body
    });

    toast.promise(promise, {
      loading: 'আপডেট করা হচ্ছে...',
      success: 'ইউজার সফলভাবে আপডেট হয়েছে!',
      error: (err) => err.message || 'ইউজার এডিট করতে ব্যর্থ হয়েছে'
    });

    try {
      await promise;
      setShowEditModal(false);
      resetUserForm();
      fetchAdminData();
    } catch (err) {} finally {
      setIsSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (window.confirm('আপনি কি নিশ্চিতভাবে এই ইউজারটি মুছে ফেলতে চান?')) {
      const promise = apiRequest(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      toast.promise(promise, {
        loading: 'মুছে ফেলা হচ্ছে...',
        success: 'ইউজার সফলভাবে মুছে ফেলা হয়েছে!',
        error: (err) => err.message || 'ইউজার মুছে ফেলা যায়নি'
      });

      try {
        await promise;
        fetchAdminData();
      } catch (err) {}
    }
  };

  // Trigger edit setup
  const handleOpenEditModal = (usr) => {
    setSelectedUser(usr);
    setUserForm({
      name: usr.name,
      mobile: usr.mobile,
      username: usr.username,
      password: '', // Leave empty for no change
      role: usr.role,
      status: usr.status,
      memberId: usr.memberId?._id || usr.memberId || ''
    });
    setShowEditModal(true);
  };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      mobile: '',
      username: '',
      password: '',
      role: 'member',
      status: 'active',
      memberId: ''
    });
    setSelectedUser(null);
  };

  return (
    <div className="app-container">
      <Header title="আমার প্রোফাইল" />

      <main className="content-wrapper">

        {/* User Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '5px solid var(--primary)' }}>
          <div style={{
            width: '72px',
            height: '72px',
            backgroundColor: 'var(--primary-glow)',
            color: 'var(--primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            fontWeight: 'bold',
            marginBottom: '12px',
            flexShrink: 0
          }}>
            {user.name.charAt(0)}
          </div>
          
          <h2 style={{ fontSize: 'var(--kpi-font)', marginBottom: '4px', wordBreak: 'break-word', width: '100%' }}>{user.name}</h2>
          <span className={`list-badge ${user.role === 'admin' ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: '16px' }}>
            {user.role === 'admin' ? 'সিস্টেম এডমিন' : 'সমিতি সদস্য'}
          </span>

          <table style={{ width: '100%', fontSize: 'var(--font-sm)', textAlign: 'left', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', padding: '6px 0', whiteSpace: 'nowrap' }}>ইউজারনেম:</td>
                <td style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.username}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', padding: '6px 0', whiteSpace: 'nowrap' }}>মোবাইল নম্বর:</td>
                <td style={{ wordBreak: 'break-all' }}>{toBanglaNumber(user.mobile)}</td>
              </tr>
              {user.memberId && (
                <tr>
                  <td style={{ color: 'var(--text-muted)', padding: '6px 0', whiteSpace: 'nowrap' }}>লিঙ্কড সদস্য আইডি:</td>
                  <td style={{ fontWeight: 600, wordBreak: 'break-all' }}>{toBanglaNumber(user.memberId.memberId || '')}</td>
                </tr>
              )}
            </tbody>
          </table>

          <button 
            className="btn btn-danger btn-sm" 
            onClick={handleLogout}
            style={{ 
              marginTop: '12px', 
              gap: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#dc2626',
              fontWeight: 700,
              minHeight: '38px',
              width: '100%',
              borderRadius: '10px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            }}
          >
            <LogOut size={16} />
            <span>লগআউট (Logout)</span>
          </button>
        </div>

        {/* Admin Panels */}
        {isAdmin && (
          <div style={{ marginBottom: '16px' }}>
            <button
              className="btn btn-outline"
              style={{ justifyContent: 'space-between', padding: '10px 14px', minHeight: '52px', border: '1px solid var(--border)', fontSize: 'var(--font-sm)' }}
              onClick={() => setShowUsersPanel(!showUsersPanel)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, marginRight: '4px' }}>
                <Shield size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ইউজার ম্যানেজমেন্ট (লগইন কন্ট্রোল)</span>
              </div>
              <span style={{ flexShrink: 0 }}>{showUsersPanel ? '▲' : '▼'}</span>
            </button>

            {showUsersPanel && (
              <div className="card" style={{ marginTop: '10px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '1rem' }}>অ্যাপ ব্যবহারকারীগণ ({toBanglaNumber(usersList.length)} জন)</h4>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: 'auto', minHeight: '36px', gap: '4px' }}
                    onClick={() => {
                      resetUserForm();
                      setShowAddModal(true);
                    }}
                  >
                    <UserPlus size={14} />
                    <span>ইউজার যোগ করুন</span>
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '16px' }}>লোড হচ্ছে...</div>
                ) : (
                  <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>নাম/ইউজার</th>
                          <th>রোল</th>
                          <th>স্থিতি</th>
                          <th>অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((usr) => (
                          <tr key={usr._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{usr.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{usr.username}</div>
                            </td>
                            <td>
                              <span className={`list-badge ${usr.role === 'admin' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                {usr.role === 'admin' ? 'এডমিন' : 'সদস্য'}
                              </span>
                            </td>
                            <td>
                              <span className={`list-badge ${usr.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                {usr.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '2px 6px', minHeight: '28px' }}
                                  onClick={() => setActiveUserDetail(usr)}
                                  title="বিস্তারিত"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '2px 6px', minHeight: '28px' }}
                                  onClick={() => handleOpenEditModal(usr)}
                                  title="সম্পাদনা"
                                >
                                  <Edit size={12} />
                                </button>
                                {usr.username !== 'admin' && (
                                  <button
                                    className="btn btn-danger btn-sm"
                                    style={{ padding: '2px 6px', minHeight: '28px', backgroundColor: 'var(--danger)' }}
                                    onClick={() => handleDeleteUser(usr._id)}
                                    title="মুছে ফেলুন"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------- MODAL: USER DETAILS ----------------- */}
        {activeUserDetail && (
          <div className="modal-overlay" onClick={() => setActiveUserDetail(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ব্যবহারকারী বিস্তারিত বিবরণী</h3>
                <button className="modal-close" onClick={() => setActiveUserDetail(null)}>
                  <X size={24} />
                </button>
              </div>

              <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '12px' }}>
                <h4 style={{ marginBottom: '8px' }}>{activeUserDetail.name}</h4>
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '6px 0' }}>ইউজারনেম:</td>
                      <td style={{ fontWeight: 600 }}>{activeUserDetail.username}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '6px 0' }}>মোবাইল নম্বর:</td>
                      <td>{toBanglaNumber(activeUserDetail.mobile)}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '6px 0' }}>অ্যাকাউন্ট রোল:</td>
                      <td>
                        <span className={`list-badge ${activeUserDetail.role === 'admin' ? 'badge-success' : 'badge-warning'}`}>
                          {activeUserDetail.role === 'admin' ? 'সিস্টেম এডমিন' : 'সমিতি সদস্য'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-muted)', padding: '6px 0' }}>অ্যাকাউন্ট স্থিতি:</td>
                      <td>
                        <span className={`list-badge ${activeUserDetail.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {activeUserDetail.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                    </tr>
                    {activeUserDetail.memberId && (
                      <tr>
                        <td style={{ color: 'var(--text-muted)', padding: '6px 0' }}>লিঙ্কড সদস্য:</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {activeUserDetail.memberId.name} (আইডি: {toBanglaNumber(activeUserDetail.memberId.memberId)})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* ----------------- MODAL: CREATE USER ----------------- */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>নতুন ইউজার তৈরি করুন</h3>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddUser}>
                <div className="form-group">
                  <label className="form-label">পুরো নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="যেমন: মোঃ সাকিব হাসান"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    placeholder="যেমন: 01700000000"
                    value={userForm.mobile}
                    onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ইউজারনেম (লগইন আইডি)</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="যেমন: sakib"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="পাসওয়ার্ড দিন"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ইউজার রোল</label>
                  <select
                    className="form-control"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value, memberId: e.target.value === 'admin' ? '' : userForm.memberId })}
                  >
                    <option value="member">সদস্য (শুধুমাত্র নিজের ডাটা রিড-অনলি)</option>
                    <option value="admin">এডমিন (সম্পূর্ণ এক্সেস)</option>
                  </select>
                </div>

                {userForm.role === 'member' && (
                  <div className="form-group">
                    <label className="form-label">সদস্য প্রোফাইল লিঙ্ক করুন (ঐচ্ছিক)</label>
                    <select
                      className="form-control"
                      value={userForm.memberId}
                      onChange={(e) => setUserForm({ ...userForm, memberId: e.target.value })}
                    >
                      <option value="">নির্বাচন করুন...</option>
                      {membersList.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} (আইডি: {toBanglaNumber(m.memberId)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">ইউজার স্থিতি</label>
                  <select
                    className="form-control"
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                  >
                    <option value="active">সক্রিয় (চলবে)</option>
                    <option value="inactive">নিষ্ক্রিয় (বন্ধ)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: EDIT USER ----------------- */}
        {showEditModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ইউজার তথ্য সংশোধন</h3>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditUser}>
                <div className="form-group">
                  <label className="form-label">পুরো নাম</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    maxLength="16"
                    className="form-control"
                    value={userForm.mobile}
                    onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ইউজারনেম (লগইন আইডি)</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    disabled={selectedUser.username === 'admin'} // Admin username is locked
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">নতুন পাসওয়ার্ড (পরিবর্তন না করতে চাইলে ফাঁকা রাখুন)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="নতুন পাসওয়ার্ড দিন"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ইউজার রোল</label>
                  <select
                    className="form-control"
                    disabled={selectedUser.username === 'admin'} // Admin role is locked
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value, memberId: e.target.value === 'admin' ? '' : userForm.memberId })}
                  >
                    <option value="member">সদস্য (শুধুমাত্র নিজের ডাটা রিড-অনলি)</option>
                    <option value="admin">এডমিন (সম্পূর্ণ এক্সেস)</option>
                  </select>
                </div>

                {userForm.role === 'member' && (
                  <div className="form-group">
                    <label className="form-label">সদস্য প্রোফাইল লিঙ্ক করুন</label>
                    <select
                      className="form-control"
                      value={userForm.memberId}
                      onChange={(e) => setUserForm({ ...userForm, memberId: e.target.value })}
                    >
                      <option value="">নির্বাচন করুন...</option>
                      {membersList.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} (আইডি: {toBanglaNumber(m.memberId)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">ইউজার স্থিতি</label>
                  <select
                    className="form-control"
                    disabled={selectedUser.username === 'admin'} // Admin status is locked
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                  >
                    <option value="active">সক্রিয় (চলবে)</option>
                    <option value="inactive">নিষ্ক্রিয় (বন্ধ)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={isSubmitting}>
                  <Save size={18} />
                  <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'আপডেট সংরক্ষণ করুন'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </main>

      <BottomNav />
    </div>
  );
}
