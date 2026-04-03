import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Toast, Tag, Dialog } from 'react-vant';
import * as Icons from 'lucide-react';

interface Bill {
  id: string;
  petName: string;
  ownerName: string;
  items: { name: string; price: number; amount: number; unit: string }[];
  total: number;
  date: string;
  status: 'pending' | 'settled' | 'cancelled';
  billType?: string;
  docName?: string;
  createdAt?: string;
  ownerPhone?: string;
  amount?: string | number;
}

interface Doctor {
  id: number;
  name: string;
  department: string;
  title: string;
  avatar: string;
  status: '出诊中' | '手术中' | '休息' | '忙碌';
  experience: string;
  rating: number;
  fee?: number;
}

export default function AppointmentPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'booking' | 'payment' | 'history'>(
      location.state?.tab || 'booking'
  );
  const [bills, setBills] = useState<Bill[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payMethod, setPayMethod] = useState('wechat');
  const [historyFilter, setHistoryFilter] = useState('all');

  const [queueInfo, setQueueInfo] = useState<{ docName: string; count: number; time: number; status?: string } | null>(() => {
    const saved = localStorage.getItem('pet_his_queue');
    return saved ? JSON.parse(saved) : null;
  });

  const fetchData = async (silent = false) => {
    const phone = localStorage.getItem('userPhone');
    try {
      if (!silent) setLoading(true);
      const [paymentsRes, doctorsRes, apptsRes] = await Promise.all([
          phone ? fetch(`http://localhost:5000/payments?ownerPhone=${phone}`) : Promise.resolve({ json: () => [] }),
          fetch('http://localhost:5000/doctors'),
          phone ? fetch(`http://localhost:5000/appointments?ownerPhone=${phone}`) : Promise.resolve({ json: () => [] })
      ]);
      const paymentsData = await (paymentsRes.json ? paymentsRes.json() : []);
      const doctorsData = await doctorsRes.json();
      const apptsData = await (apptsRes.json ? apptsRes.json() : []);
      
      setBills(Array.isArray(paymentsData) ? paymentsData : []);
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);

      // Real-time synchronization of the current active appointment
      const activeAppt = Array.isArray(apptsData) ? apptsData.sort((a,b) => b.id - a.id)[0] : null;
      if (activeAppt && (activeAppt.status === 'TODO' || activeAppt.status === 'DOING')) {
          // Calculate wait count if TODO
          const allApptsRes = await fetch('http://localhost:5000/appointments');
          const allAppts = await allApptsRes.json();
          const todoCount = allAppts.filter((a: any) => a.status === 'TODO' && a.id < activeAppt.id).length;
          
          setQueueInfo({
              docName: activeAppt.doctor,
              count: todoCount,
              time: todoCount * 15,
              status: activeAppt.status
          });
          localStorage.setItem('pet_his_queue', JSON.stringify({ docName: activeAppt.doctor, count: todoCount, time: todoCount * 15, status: activeAppt.status }));
      } else if (activeAppt?.status === 'DONE') {
          // Auto clear if finished
          setQueueInfo(null);
          localStorage.removeItem('pet_his_queue');
      }
    } catch (err) {
      if (!silent) Toast.fail('无法连接 HIS 系统');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false); // First load is obvious
    const syncTimer = setInterval(() => fetchData(true), 5000); // Polls are silent
    return () => clearInterval(syncTimer);
  }, []);

  const handlePay = async () => {
    if (!selectedBill) return;
    
    Toast.loading({ message: '正在通讯银行/HIS 系统...', forbidClick: true });
    
    try {
        const res = await fetch(`http://localhost:5000/payments/${selectedBill.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'settled', paymentMethod: payMethod })
        });
        
        if (res.ok) {
            // Once payment is settled, proceed to create appointment record
            if (selectedBill.billType === 'registration') {
                Toast.loading({ message: '正在同步挂号排队系统...', forbidClick: true });
                
                try {
                    // Create a unique numeric ID or string ID that json-server can't conflict with
                    const appointmentId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
                    
                    const payload = {
                        id: appointmentId,
                        pet: selectedBill.petName || '门诊初诊患者',
                        owner: selectedBill.ownerName || '移动端主人',
                        ownerPhone: selectedBill.ownerPhone || '',
                        doctor: selectedBill.docName || '值班医生',
                        reason: '预约挂号 (已完成支付)',
                        isUrgent: false,
                        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                        status: 'TODO',
                        createdAt: new Date().toISOString()
                    };
                    
                    const aptPostRes = await fetch('http://localhost:5000/appointments', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify(payload)
                    });

                    if (!aptPostRes.ok) {
                        const errorMsg = await aptPostRes.text();
                        console.error("HIS Appt Failure:", errorMsg);
                        throw new Error('HIS 数据表写入拒绝');
                    }

                    // Refresh local queue count correctly
                    const apptRes = await fetch('http://localhost:5000/appointments');
                    if (apptRes.ok) {
                        const appts = await apptRes.json();
                        const todoCount = appts.filter((a: any) => a.status === 'TODO').length;
                        const newQueue = { docName: selectedBill.docName || '医生', count: todoCount, time: todoCount * 15 };
                        setQueueInfo(newQueue);
                        localStorage.setItem('pet_his_queue', JSON.stringify(newQueue));
                    }
                    
                    Toast.success('分诊成功！已进入排队队列');
                    setActiveTab('booking');
                } catch(e) {
                    console.error("Queue Sync Exception:", e);
                    Toast.fail('挂号同步异常，请向护士出示缴费凭证');
                }
            } else {
                Toast.success('结算中心已入账 ✅');
            }
            
            // 🚀 核心优化：关掉详情，自动帮用户跳到历史记录页查看成功结果
            setIsPayOpen(false);
            setTimeout(() => {
               setActiveTab('history');
               fetchData();
            }, 500);
        } else {
            Toast.fail('HIS 结算系统响应异常');
        }
    } catch (err) {
        Toast.fail('支付超时，请稍后重试');
    }
  };

  const handleCancelBill = async (billId: string) => {
      Dialog.confirm({ title: '取消挂号/缴费', message: '确认取消此单据？如果包含挂号费，取消后需重新排队。' }).then(async () => {
          Toast.loading({ message: '撤销中...', forbidClick: true });
          try {
              const res = await fetch(`http://localhost:5000/payments/${billId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'cancelled' })
              });
              if (res.ok) {
                  Toast.success('您已成功取消该业务');
                  fetchData();
                  if (queueInfo) {
                      setQueueInfo(null);
                      localStorage.removeItem('pet_his_queue');
                  }
              } else {
                  Toast.fail('取消失败');
              }
          } catch (err) {
              Toast.fail('网络异常');
          }
      }).catch(()=>{});
  };

  const handleBook = (doc: Doctor) => {
    if (doc.status !== '出诊中') {
        return Toast.fail(`抱歉，${doc.name} 医生当前【${doc.status}】`);
    }

    if (queueInfo) {
        return Dialog.confirm({
            title: '重置挂号',
            message: '您已经有一个进行中的挂号排队，是否要取消原排队并重新挂号？'
        }).then(() => processBooking(doc)).catch(() => {});
    }

    Dialog.confirm({
        title: '挂号确认',
        message: `确认挂号【${doc.department} - ${doc.name} ${doc.title}】？挂号费: ¥${(doc.fee || 50).toFixed(2)}`
    }).then(() => processBooking(doc)).catch(() => {});
  };

  const processBooking = async (doc: Doctor) => {
      Toast.loading({ message: '正在同步 HIS 收银系统...', forbidClick: true });
      
      const phone = localStorage.getItem('userPhone') || '15520187167';
      const newBill = {
         id: `REG-${Date.now()}-${Math.floor(Math.random()*100)}`,
          petName: '门诊初诊患者',
         ownerName: '移动端预约用户',
         ownerPhone: phone,
         items: [{ name: `${doc.name} (${doc.department}) 专属挂号费`, price: doc.fee || 50.00, amount: 1, unit: '次' }],
         total: doc.fee || 50.00,
         date: new Date().toISOString().split('T')[0],
         createdAt: new Date().toISOString(),
         status: 'pending',
         billType: 'registration',
         docName: doc.name
      };

      try {
          const res = await fetch('http://localhost:5000/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newBill)
          });
          if (res.ok) {
              Toast.success('已生成挂号费，请完成缴费');
              fetchData();
              setActiveTab('payment'); // 自动跳转到缴费页
          } else {
              Toast.fail('HIS 同步失败');
          }
      } catch (err) {
          Toast.fail('无法连接 HIS 系统');
      }
  };

  return (
    <div className="page-content animate-fade-in" style={{ padding: '16px' }}>
      <div className="header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#334155', margin: 0 }}>门诊与缴费</h2>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '4px 0 0 0' }}>实时连接医院 HIS 核心网络</p>
         </div>
         <Button icon={<Icons.RefreshCw size={18} />} round onClick={() => fetchData(false)} loading={loading} />
      </div>

      <div className="tab-buttons" style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#F1F5F9', padding: '6px', borderRadius: '16px' }}>
         <button onClick={() => setActiveTab('booking')} style={{ flex: 1, padding: '10px 4px', borderRadius: '12px', background: activeTab === 'booking' ? '#fff' : 'transparent', color: activeTab === 'booking' ? '#6366F1' : '#64748B', border: 'none', fontWeight: 800, fontSize: '0.85rem', boxShadow: activeTab === 'booking' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s' }}>
            医师挂号
         </button>
         <button onClick={() => setActiveTab('payment')} style={{ flex: 1, padding: '10px 4px', borderRadius: '12px', background: activeTab === 'payment' ? '#fff' : 'transparent', color: activeTab === 'payment' ? '#6366F1' : '#64748B', border: 'none', fontWeight: 800, fontSize: '0.85rem', boxShadow: activeTab === 'payment' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s' }}>
            待缴费单 {bills.filter(b=>b.status==='pending').length > 0 && <span style={{ background: '#EF4444', color: '#fff', borderRadius: '10px', padding: '2px 6px', fontSize: '0.65rem', marginLeft: '4px' }}>{bills.filter(b=>b.status==='pending').length}</span>}
         </button>
         <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '10px 4px', borderRadius: '12px', background: activeTab === 'history' ? '#fff' : 'transparent', color: activeTab === 'history' ? '#6366F1' : '#64748B', border: 'none', fontWeight: 800, fontSize: '0.85rem', boxShadow: activeTab === 'history' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s' }}>
            历史记录
         </button>
      </div>

      {activeTab === 'booking' && (
          <div className="booking-section">
              {queueInfo && (
                  <div className="queue-banner animate-slide-up" style={{ 
                      background: (queueInfo as any).status === 'DOING' ? 'linear-gradient(135deg, #10B981, #34D399)' : 'linear-gradient(135deg, #4F46E5, #6366F1)', 
                      borderRadius: '24px', padding: '24px', color: '#fff', marginBottom: '24px', position: 'relative', overflow: 'hidden' 
                  }}>
                      <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}><Icons.Activity size={120} /></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8.5rem', fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px' }}>
                              {(queueInfo as any).status === 'DOING' ? '❗ 医生正在为您诊断' : `就诊医生：${queueInfo.docName}`}
                          </span>
                          <span onClick={() => { setQueueInfo(null); localStorage.removeItem('pet_his_queue'); }} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '10px' }}>知道了</span>
                      </div>
                      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                          {(queueInfo as any).status === 'DOING' ? (
                               <div style={{ flex: 1 }}>
                                  <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }}>叫号到您了! 🎉</h1>
                                  <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>请携爱宠进入【{queueInfo.docName}】诊室就诊</p>
                               </div>
                          ) : (
                              <>
                                  <div>
                                     <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', opacity: 0.8 }}>前方排队患者</p>
                                     <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{queueInfo.count} <span style={{ fontSize: '1rem', fontWeight: 600 }}>人</span></h1>
                                  </div>
                                  <div style={{ flex: 1, textAlign: 'right' }}>
                                     <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', opacity: 0.8 }}>预估等待时长</p>
                                     <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>~{queueInfo.time} 分钟</h3>
                                  </div>
                              </>
                          )}
                      </div>
                  </div>
              )}

              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1E293B', marginBottom: '16px' }}>👩‍⚕️ 选择出诊团队</h3>
              {loading ? <p style={{ color: '#94A3B8' }}>载入中...</p> : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                      {doctors.map(doc => (
                          <div key={doc.id} style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', gap: '16px' }}>
                              <div style={{ width: '60px', height: '60px', background: '#F8FAFC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                  {doc.avatar || '👨‍⚕️'}
                              </div>
                              <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div>
                                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 900, color: '#1E293B' }}>{doc.name} <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{doc.title}</span></h4>
                                          <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#64748B' }}>所属科室: {doc.department} | 经验: {doc.experience}</p>
                                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#EF4444', fontWeight: 900 }}>挂号费: ¥ {(doc.fee || 50).toFixed(2)}</p>
                                      </div>
                                      <Tag type={doc.status === '出诊中' ? 'primary' : doc.status === '忙碌' ? 'warning' : 'danger'} plain style={{ fontWeight: 800 }}>
                                          {doc.status}
                                      </Tag>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 800 }}>⭐ 好评率 {doc.rating}</span>
                                      <Button size="small" type="primary" round style={{ fontWeight: 800, padding: '0 16px', filter: doc.status !== '出诊中' ? 'grayscale(1)' : 'none' }} onClick={() => handleBook(doc)}>立即挂号</Button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'payment' && (
          <div className="payment-section">
              {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>同步 HIS 数据中...</div>
              ) : bills.filter(b=>b.status==='pending').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 40px', background: '#F8FAFC', borderRadius: '24px' }}>
                      <Icons.Inbox size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
                      <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>暂无需要处理的缴纳费用</p>
                  </div>
              ) : (
                  <div className="bills-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {bills.filter(b => b.status === 'pending').map(bill => (
                        <div key={bill.id} className="bill-card" style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0, fontWeight: 800 }}>{bill.billType === 'pharmacy' ? '💊 药品采购账单' : '🏥 门诊医疗账单'}</h4>
                                <Tag type={bill.billType === 'pharmacy' ? 'warning' : 'primary'} plain>{bill.billType === 'pharmacy' ? '药房待付' : 'HIS 待付'}</Tag>
                            </div>
                            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '16px', marginBottom: '16px' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#94A3B8' }}>患者：{bill.petName} ({bill.ownerName})</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>单号：{bill.id}</p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1E293B' }}>¥ {Number(bill.total || bill.amount || 0).toFixed(2)}</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button plain round size="small" style={{ fontWeight: 800 }} onClick={() => handleCancelBill(bill.id)}>取消重排</Button>
                                    <Button type="primary" round size="small" style={{ fontWeight: 800, padding: '0 20px' }} onClick={() => { setSelectedBill({ ...bill, total: Number(bill.total || bill.amount || 0) }); setIsPayOpen(true); }}>确认缴费</Button>
                                </div>
                            </div>
                        </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'history' && (
          <div className="history-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1E293B' }}>📜 我的历史档案</h3>
              </div>

              {/* 筛选标签 */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
                  {[
                      { id: 'all', label: '全部记录' },
                      { id: 'registration', label: '挂号预约' },
                      { id: 'pharmacy', label: '药品采购' },
                      { id: 'redemption', label: '积分兑换' }
                  ].map(f => (
                      <div key={f.id} onClick={() => setHistoryFilter(f.id)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: historyFilter === f.id ? '#1E293B' : '#F1F5F9', color: historyFilter === f.id ? '#fff' : '#64748B' }}>
                          {f.label}
                      </div>
                  ))}
              </div>

              {loading ? (
                  <p style={{ color: '#94A3B8', textAlign: 'center' }}>载入历史记录中...</p>
              ) : bills.filter(b=>b.status!=='pending' && (historyFilter === 'all' || b.billType === historyFilter)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 40px', background: '#F8FAFC', borderRadius: '24px' }}>
                      <Icons.Clock size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
                      <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>暂无相关条件的历史记录</p>
                  </div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {bills.filter(b => b.status !== 'pending' && (historyFilter === 'all' || b.billType === historyFilter)).map(bill => (
                          <div key={bill.id} style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #F1F5F9', opacity: bill.status === 'cancelled' ? 0.7 : 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ padding: '8px', background: bill.billType === 'registration' ? '#EEF2FF' : bill.billType === 'redemption' ? '#FEF2F2' : '#FFFBEB', borderRadius: '12px' }}>
                                          {bill.billType === 'registration' && <Icons.Stethoscope size={18} color="#6366F1"/>}
                                          {bill.billType === 'pharmacy' && <Icons.Pill size={18} color="#F59E0B"/>}
                                          {bill.billType === 'redemption' && <Icons.Gift size={18} color="#EF4444"/>}
                                          {(!bill.billType) && <Icons.FileText size={18} color="#64748B"/>}
                                      </div>
                                      <h4 style={{ margin: 0, fontWeight: 800 }}>
                                          {bill.billType === 'pharmacy' ? '💊 药品在线采购' : bill.billType === 'redemption' ? '🎁 积分商城兑换' : '🏥 门诊挂号预约'}
                                      </h4>
                                  </div>
                                  <Tag type={bill.status === 'settled' ? 'primary' : 'danger'} plain style={{ fontWeight: 800 }}>
                                      {bill.status === 'settled' ? '☑ 成功' : '已取消/失败'}
                                  </Tag>
                              </div>
                              <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '12px', fontSize: '0.8rem', color: '#64748B' }}>
                                  {bill.billType === 'registration' && <p style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#334155' }}>主诊医生: {bill.docName}</p>}
                                  {(bill.billType === 'pharmacy' || bill.billType === 'redemption') && <p style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#F59E0B' }}>清单详情: 共 {Array.isArray(bill.items) ? bill.items.length : (bill.items || 1)} 件</p>}
                                  {bill.billType === 'redemption' ? (
                                      <p style={{ margin: '0 0 4px 0', color: '#EF4444', fontWeight: 800 }}>消耗积分: {Math.abs(Number(bill.total || 0))} 分</p>
                                  ) : (
                                      <p style={{ margin: '0 0 4px 0', fontWeight: 800, color: '#1E293B' }}>实付总额: ¥{Number(bill.total || bill.amount || 0).toFixed(2)}</p>
                                  )}
                                  <p style={{ margin: 0 }}>记录时间: {bill.createdAt ? new Date(bill.createdAt).toLocaleString() : bill.date}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* 支付弹层 */}
      {isPayOpen && selectedBill && (
          <div className="overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && setIsPayOpen(false)}>
              <div className="animate-slide-up" style={{ background: '#fff', padding: '32px 24px', borderRadius: '32px 32px 0 0' }}>
                  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                     <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>HIS 同步金额</span>
                     <h1 style={{ fontSize: '3rem', margin: '8px 0 0 0', color: '#1E293B', fontWeight: 900 }}>¥ {selectedBill.total.toFixed(2)}</h1>
                  </div>

                  <p style={{ fontWeight: 800, marginBottom: '16px', color: '#334155' }}>选择支付方式</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                      <div onClick={() => setPayMethod('wechat')} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${payMethod === 'wechat' ? '#07C160' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', background: '#07C16020', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💬</div>
                          <span style={{ fontWeight: 800, flex: 1 }}>微信支付队</span>
                          {payMethod === 'wechat' && <Icons.CheckCircle2 fill="#07C160" color="#fff" />}
                      </div>
                      <div onClick={() => setPayMethod('alipay')} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${payMethod === 'alipay' ? '#1677FF' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', background: '#1677FF20', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🔹</div>
                          <span style={{ fontWeight: 800, flex: 1 }}>支付宝</span>
                          {payMethod === 'alipay' && <Icons.CheckCircle2 fill="#1677FF" color="#fff" />}
                      </div>
                  </div>

                  <Button block type="primary" round style={{ height: '54px', fontSize: '1.1rem', fontWeight: 800 }} onClick={handlePay}>生物识别并支付</Button>
              </div>
          </div>
      )}

      <style>{`
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
