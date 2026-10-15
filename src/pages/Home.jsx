import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { toBanglaNumber, formatBDT } from '../utils/bangla';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import { Users, Landmark, AlertCircle, TrendingUp, HandCoins, LandmarkIcon, CheckCircle2, Wallet, Receipt } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch overall dashboard statistics for both admin and member
        const dashboardData = await apiRequest('/api/reports/dashboard');
        setStats(dashboardData);

        if (user.role !== 'admin') {
          // If member, fetch their personal member profile
          const myMemberId = user.memberId?._id || user.memberId;
          if (myMemberId) {
            try {
              // Fetch individual member details directly to get precise calculations
              const memberDetail = await apiRequest(`/api/members/${myMemberId}`);
              if (memberDetail && memberDetail.member) {
                const mappedMember = {
                  ...memberDetail.member,
                  totalDeposited: memberDetail.calculations.totalDeposited,
                  totalDue: memberDetail.calculations.totalDue,
                  currentBalance: memberDetail.calculations.currentBalance,
                  monthsElapsed: memberDetail.calculations.monthsElapsed
                };
                setMemberStats(mappedMember);
              }
            } catch (memberErr) {
              console.error('Error fetching individual member details:', memberErr);
              // Fallback: Fetch all members and find the logged-in user
              const membersData = await apiRequest('/api/members');
              const foundMember = membersData.find(m => m._id === myMemberId || m.mobile === user.mobile);
              if (foundMember) {
                setMemberStats(foundMember);
              }
            }
          }
        }
      } catch (err) {
        setError('ডাটা লোড করতে সমস্যা হয়েছে');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="app-container">
      <Header title="ড্যাশবোর্ড" />

      <main className="content-wrapper">
        <div className="card" style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          color: 'white',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/main_logo.png" alt="Logo" style={{
              width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              backgroundColor: '#fff',
              padding: '2px'
            }} />
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                স্বাগতম, {user.name} 👋
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.85rem' }}>
                পদবী: {user.role === 'admin' ? 'এডমিন (পরিচালক)' : 'সমিতি সদস্য'}
              </p>
            </div>
          </div>

        </div>

        {error && (
          <div className="card" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span style={{ fontWeight: 600 }}>লোড হচ্ছে...</span>
          </div>
        ) : user.role === 'admin' && stats ? (
          <div>
            {/* Current Balance Highlight Card */}
            <div className="card" style={{
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '2px' }}>সমিতির চলতি তহবিল (বর্তমান ব্যালেন্স)</span>
                <h2 style={{ fontSize: '1.7rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
                  {formatBDT(stats.totalDeposits + stats.totalInstallmentsCollected - stats.totalInvestments - (stats.totalExpenses || 0))}
                </h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.18)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={28} color="white" />
              </div>
            </div>

            {/* Project Profit Highlight Card */}
            <div className="card" style={{
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '2px' }}>প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</span>
                <h2 style={{ fontSize: '1.7rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
                  {formatBDT(stats.totalProfit)}
                </h2>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                  আদায়কৃত মোট মুনাফা: <strong style={{ color: '#bbf7d0' }}>{formatBDT(stats.totalRealizedProfit || 0)}</strong>
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.18)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={28} color="white" />
              </div>
            </div>

            {/* Admin Grid Cards */}
            <div className="grid-2">
              <div className="kpi-card">
                <div>
                  <div className="kpi-icon-wrapper">
                    <Users size={18} color="var(--primary)" />
                  </div>
                  <div className="kpi-title">মোট সদস্য</div>
                </div>
                <div className="kpi-value">{toBanglaNumber(stats.totalMembers)} জন</div>
              </div>

              <div className="kpi-card success">
                <div>
                  <div className="kpi-icon-wrapper">
                    <Landmark size={18} color="var(--success)" />
                  </div>
                  <div className="kpi-title">মোট সঞ্চয় জমা</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.totalDeposits)}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="kpi-card danger">
                <div>
                  <div className="kpi-icon-wrapper">
                    <AlertCircle size={18} color="var(--danger)" />
                  </div>
                  <div className="kpi-title">সদস্য সঞ্চয় বকেয়া</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.memberDueAmount)}</div>
              </div>

              <div className="kpi-card danger">
                <div>
                  <div className="kpi-icon-wrapper">
                    <AlertCircle size={18} color="var(--danger)" />
                  </div>
                  <div className="kpi-title">প্রজেক্ট কিস্তি বকেয়া</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.projectDueAmount)}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="kpi-card accent">
                <div>
                  <div className="kpi-icon-wrapper">
                    <TrendingUp size={18} color="var(--accent)" />
                  </div>
                  <div className="kpi-title">মোট বিনিয়োগ</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.totalInvestments)}</div>
              </div>

              <div className="kpi-card success">
                <div>
                  <div className="kpi-icon-wrapper">
                    <HandCoins size={18} color="var(--success)" />
                  </div>
                  <div className="kpi-title">কিস্তি আদায়</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.totalInstallmentsCollected)}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="kpi-card">
                <div>
                  <div className="kpi-icon-wrapper">
                    <LandmarkIcon size={18} color="var(--primary)" />
                  </div>
                  <div className="kpi-title">প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.totalProfit)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>আদায়কৃত: <strong style={{ color: 'var(--success)' }}>{formatBDT(stats.totalRealizedProfit || 0)}</strong></div>
              </div>

              <div className="kpi-card danger">
                <div>
                  <div className="kpi-icon-wrapper">
                    <AlertCircle size={18} color="var(--danger)" />
                  </div>
                  <div className="kpi-title">সর্বমোট বকেয়া</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.totalDueAmount)}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="kpi-card danger" onClick={() => navigate('/expenses')} style={{ cursor: 'pointer', borderLeft: '4px solid #be123c' }}>
                <div>
                  <div className="kpi-icon-wrapper">
                    <Receipt size={18} color="#be123c" />
                  </div>
                  <div className="kpi-title">মোট খরচ (ব্যয়)</div>
                </div>
                <div className="kpi-value">{formatBDT(stats.totalExpenses || 0)}</div>
              </div>

              <div className="kpi-card" onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
                <div>
                  <div className="kpi-icon-wrapper">
                    <CheckCircle2 size={18} color="var(--primary)" />
                  </div>
                  <div className="kpi-title">সক্রিয় প্রজেক্ট</div>
                </div>
                <div className="kpi-value">{toBanglaNumber(stats.activeProjects)} টি</div>
              </div>
            </div>
          </div>
        ) : memberStats ? (
          <div>
            {/* Member Custom View */}
            <div className="card" style={{ borderLeft: '5px solid var(--primary)', backgroundColor: 'white' }}>
              <div className="card-title">আমার অ্যাকাউন্ট বিবরণী</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>সদস্য আইডি:</span>
                  <span style={{ fontWeight: 'bold' }}>{toBanglaNumber(memberStats.memberId)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>মোবাইল নম্বর:</span>
                  <span>{toBanglaNumber(memberStats.mobile)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>সদস্যপদের স্থিতি:</span>
                  <span className={`list-badge ${memberStats.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {memberStats.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="kpi-card success">
                <div>
                  <div className="kpi-icon-wrapper">
                    <Landmark size={18} color="var(--success)" />
                  </div>
                  <div className="kpi-title">আমার মোট সঞ্চয় জমা</div>
                </div>
                <div className="kpi-value">{formatBDT(memberStats.totalDeposited)}</div>
              </div>

              <div className="kpi-card danger">
                <div>
                  <div className="kpi-icon-wrapper">
                    <AlertCircle size={18} color="var(--danger)" />
                  </div>
                  <div className="kpi-title">আমার মোট বকেয়া</div>
                </div>
                <div className="kpi-value">{formatBDT(memberStats.totalDue)}</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>নির্ধারিত মাসিক কিস্তির হার</span>
                <h3 style={{ fontSize: 'var(--kpi-font)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatBDT(memberStats.monthlyDepositAmount)}</h3>
              </div>
              <div style={{ textAlign: 'right', minWidth: 0, flex: 1 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>মোট জমাকৃত মাস</span>
                <h3 style={{ fontSize: 'var(--kpi-font)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toBanglaNumber(memberStats.monthsElapsed)} মাস</h3>
              </div>
            </div>

            {/* General Dashboard Summary Cards for Member */}
            {stats && (
              <div>
                <h3 style={{
                  fontSize: '1.05rem',
                  margin: '28px 0 16px 4px',
                  color: 'var(--primary-dark)',
                  borderLeft: '4px solid var(--primary)',
                  paddingLeft: '10px',
                  fontWeight: 700
                }}>
                  সমিতির সার্বিক অবস্থা (ড্যাশবোর্ড)
                </h3>

                {/* Current Balance Highlight Card */}
                <div className="card" style={{
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 20px',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '2px' }}>সমিতির চলতি তহবিল (বর্তমান ব্যালেন্স)</span>
                    <h2 style={{ fontSize: '1.7rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
                      {formatBDT(stats.totalDeposits + stats.totalInstallmentsCollected - stats.totalInvestments - (stats.totalExpenses || 0))}
                    </h2>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={28} color="white" />
                  </div>
                </div>

                {/* Project Profit Highlight Card */}
                <div className="card" style={{
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 20px',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '2px' }}>প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</span>
                    <h2 style={{ fontSize: '1.7rem', color: 'white', marginTop: '2px', fontWeight: 800 }}>
                      {formatBDT(stats.totalProfit)}
                    </h2>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                      আদায়কৃত মোট মুনাফা: <strong style={{ color: '#bbf7d0' }}>{formatBDT(stats.totalRealizedProfit || 0)}</strong>
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={28} color="white" />
                  </div>
                </div>

                {/* Admin Grid Cards */}
                <div className="grid-2">
                  <div className="kpi-card">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <Users size={18} color="var(--primary)" />
                      </div>
                      <div className="kpi-title">মোট সদস্য</div>
                    </div>
                    <div className="kpi-value">{toBanglaNumber(stats.totalMembers)} জন</div>
                  </div>

                  <div className="kpi-card success">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <Landmark size={18} color="var(--success)" />
                      </div>
                      <div className="kpi-title">মোট সঞ্চয় জমা</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.totalDeposits)}</div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="kpi-card danger">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <AlertCircle size={18} color="var(--danger)" />
                      </div>
                      <div className="kpi-title">সদস্য সঞ্চয় বকেয়া</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.memberDueAmount)}</div>
                  </div>

                  <div className="kpi-card danger">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <AlertCircle size={18} color="var(--danger)" />
                      </div>
                      <div className="kpi-title">প্রজেক্ট কিস্তি বকেয়া</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.projectDueAmount)}</div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="kpi-card accent">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <TrendingUp size={18} color="var(--accent)" />
                      </div>
                      <div className="kpi-title">মোট বিনিয়োগ</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.totalInvestments)}</div>
                  </div>

                  <div className="kpi-card success">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <HandCoins size={18} color="var(--success)" />
                      </div>
                      <div className="kpi-title">কিস্তি আদায়</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.totalInstallmentsCollected)}</div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="kpi-card">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <LandmarkIcon size={18} color="var(--primary)" />
                      </div>
                      <div className="kpi-title">প্রজেক্ট থেকে টার্গেটকৃত মোট মুনাফা</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.totalProfit)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>আদায়কৃত: <strong style={{ color: 'var(--success)' }}>{formatBDT(stats.totalRealizedProfit || 0)}</strong></div>
                  </div>

                  <div className="kpi-card danger">
                    <div>
                      <div className="kpi-icon-wrapper">
                        <AlertCircle size={18} color="var(--danger)" />
                      </div>
                      <div className="kpi-title">সর্বমোট বকেয়া</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.totalDueAmount)}</div>
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '16px' }}>
                  <div className="kpi-card danger" onClick={() => navigate('/expenses')} style={{ cursor: 'pointer', borderLeft: '4px solid #be123c' }}>
                    <div>
                      <div className="kpi-icon-wrapper">
                        <Receipt size={18} color="#be123c" />
                      </div>
                      <div className="kpi-title">মোট খরচ (ব্যয়)</div>
                    </div>
                    <div className="kpi-value">{formatBDT(stats.totalExpenses || 0)}</div>
                  </div>

                  <div className="kpi-card" onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
                    <div>
                      <div className="kpi-icon-wrapper">
                        <CheckCircle2 size={18} color="var(--primary)" />
                      </div>
                      <div className="kpi-title">সক্রিয় প্রজেক্ট</div>
                    </div>
                    <div className="kpi-value">{toBanglaNumber(stats.activeProjects)} টি</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <p>আপনার কোনো সদস্য প্রোফাইল লিঙ্ক করা নেই। অনুগ্রহ করে পরিচালকের সাথে যোগাযোগ করুন।</p>
          </div>
        )}
        <Footer />
      </main>

      <BottomNav />
    </div>
  );
}