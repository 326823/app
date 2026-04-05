import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, NoticeBar, Progress, Space, Divider, Button, Popup, Form, Field, Toast, Cell, Radio, Tag } from 'react-vant';
import * as Icons from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [userPhone, setUserPhone] = useState('宠物主');
  const [pets, setPets] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [activeInpatient, setActiveInpatient] = useState<any>(null);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAddPetOpen, setIsAddPetOpen] = useState(false);

  const fetchPets = () => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
        setLoading(true);
        fetch(`https://houduan-hlb1.onrender.com/records?phone=${phone}`)
          .then(res => res.json())
          .then(data => {
            const mappedPets = data.map((item: any) => ({
                id: item.id,
                name: item.petName,
                breed: (item.type || '🐶 犬类').split(' ')[1] || item.type,
                age: '1岁', 
                weight: '未知', 
                icon: (item.type || '🐶').split(' ')[0] || '🐶',
                status: item.status,
                statusColor: item.status === '已康复' ? '#10B981' : '#6366F1',
                vaccineProgress: item.status === '已康复' ? 100 : 20
            }));
            setPets(mappedPets);
            setLoading(false);
          })
          .catch(() => setLoading(false));
    } else {
        setLoading(false);
    }
  };

  const fetchVisits = () => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
        fetch(`https://houduan-hlb1.onrender.com/medical_records?ownerPhone=${phone}&_sort=createdAt&_order=desc&_limit=3`)
          .then(res => res.json())
          .then(data => {
            const mappedVisits = data.map((item: any) => ({
                id: item.id,
                date: new Date(item.createdAt).toLocaleDateString(),
                pet: item.petName,
                type: `第 ${item.visitNo} 次就诊`,
                detail: item.assessment || '常规检查',
                status: '已结束'
            }));
            setVisits(mappedVisits);
          })
          .catch(() => {});
    }
  };

  const fetchInpatientStatus = () => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
        fetch(`https://houduan-hlb1.onrender.com/inpatients?phone=${phone}`)
          .then(res => res.json())
          .then(data => {
            if (data.length > 0) setActiveInpatient(data[0]);
            else setActiveInpatient(null);
          })
          .catch(() => {});
    }
  };

  const fetchPayments = () => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
        fetch(`https://houduan-hlb1.onrender.com/payments?ownerPhone=${phone}&status=pending`)
          .then(res => res.json())
          .then(data => setPendingPaymentCount(Array.isArray(data) ? data.length : 0))
          .catch(() => {});
    }
  };

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
        setUserPhone(phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'));
        fetchPets();
        fetchVisits();
        fetchInpatientStatus();
        fetchPayments();
    } else {
        setLoading(false);
    }
  }, []);

  const handleAddPet = async (values: any) => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
        Toast.fail('登录状态已失效，请重新登录');
        return;
    }

    Toast.loading({ message: '正在同步 HIS 档案...', forbidClick: true });
    console.log('Submitting Pet Data:', values);

    try {
        const res = await fetch('https://houduan-hlb1.onrender.com/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                petName: values.petName,
                ownerName: values.ownerName,
                phone: phone,
                type: values.type,
                status: '观察中',
                lastVisit: new Date().toLocaleString().slice(0, 16).replace('T', ' ')
            })
        });
        
        if (res.ok) {
            Toast.success('宠物档案创建成功！');
            setIsAddPetOpen(false);
            form.resetFields();
            fetchPets();
        } else {
            const errData = await res.text();
            console.error('Server error:', errData);
            Toast.fail(`同步失败: ${res.status}`);
        }
    } catch (err) {
        console.error('Network catch:', err);
        Toast.fail('网络请求超时，请检查联网状态');
    }
  };

  return (
    <div className="page-content animate-fade-in" style={{ padding: '16px' }}>
      {/* 🔝 实时状态提醒 */}
      <NoticeBar
        leftIcon={<Icons.Activity size={16} />}
        scrollable
        text={activeInpatient ? `[住院通知] 您的宠物“${activeInpatient.petName}”正处于 ${activeInpatient.status} 状态，病房号：${activeInpatient.room}。` : (pets.length > 0 ? `[就诊动态] 您的宠物“${pets[0].name}”的年度免疫接种已开启提醒，请及时带它回院。` : `[欢迎] 您已进入宠爱之城 HIS 移动端，请先添加您的爱宠信息。`)}
        style={{ borderRadius: '12px', marginBottom: '20px', background: activeInpatient ? '#FFF1F2' : '#F0F9FF', color: activeInpatient ? '#E11D48' : '#0369A1' }}
      />

      {/* 👋 动态欢迎语 */}
      <div className="header-greeting" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '4px' }}>你好，{userPhone} 👋</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>欢迎使用智慧宠物医院 HIS 患者端</p>
          </div>
          <div 
            onClick={() => navigate('/hospital-map')}
            style={{ background: '#F1F5F9', padding: '8px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#6366F1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
              <Icons.MapPin size={12} /> {localStorage.getItem('selectedHospital') || '深圳中心院'}
          </div>
      </div>

      {/* 🚀 核心服务板块 */}
      <div className="grid-menu" style={{ marginBottom: '32px' }}>
        {[
          { icon: <Icons.Calendar color="#6366F1" size={24} />, label: '挂号预约', bg: '#EEF2FF', path: '/appointment', tab: 'booking' },
          { icon: <Icons.FileText color="#EC4899" size={24} />, label: '诊疗报告', bg: '#FDF2F8', path: '/medical-records' },
          { icon: <Icons.CreditCard color="#F59E0B" size={24} />, label: '排队缴费', bg: '#FFFBEB', badge: pendingPaymentCount > 0 ? pendingPaymentCount : null, path: '/appointment', tab: 'payment' },
          { icon: <Icons.Pill color="#10B981" size={24} />, label: '在线购药', bg: '#F0FDF4', path: '/pharmacy' },
        ].map((item, index) => (
          <div 
            className="grid-item" 
            key={index}
            onClick={() => item.path && navigate(item.path, { state: { tab: item.tab } })}
          >
            <Badge content={item.badge} offset={[-2, 2]}>
                <div className="icon-wrapper" style={{ background: item.bg }}>{item.icon}</div>
            </Badge>
            <p>{item.label}</p>
          </div>
        ))}
      </div>

      {/* 📊 我的宠物列表 */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>我的毛孩子</h3>
          <span style={{ fontSize: '0.85rem', color: '#6366F1', fontWeight: 600 }} onClick={() => setIsAddPetOpen(true)}>添加宠物</span>
      </div>

      {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载档案中...</div>
      ) : pets.length === 0 ? (
          /* --- 空状态：引导添加宠物 --- */
          <div 
            onClick={() => {
                console.log('Opening Add Pet Popup');
                setIsAddPetOpen(true);
            }}
            style={{ 
                background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', 
                borderRadius: '24px', 
                padding: '40px 24px', 
                textAlign: 'center',
                border: '2px dashed #C7D2FE',
                cursor: 'pointer'
            }}
          >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🐾</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#4338CA' }}>添加您的宠物</h4>
              <p style={{ color: '#6366F1', fontSize: '0.85rem', margin: '0 0 20px 0' }}>快速建立院内健康档案，开启智慧医疗服务</p>
              <Button 
                type="primary" 
                round 
                style={{ width: '160px', background: '#6366F1' }} 
                onClick={(e) => {
                    e.stopPropagation();
                    Toast.info('正在开启档案系统...');
                    setIsAddPetOpen(true);
                }}
              >
                  立即添加
              </Button>
          </div>
      ) : (
          /* --- 📁 增强型宠物仪表盘 (Requirement: Premium & Interactive) --- */
          <div className="pet-carousel-container" style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '16px', 
              padding: '8px 4px 20px 4px', 
              margin: '0 -4px',
              scrollbarWidth: 'none' /* 隐藏滚动条 */
          }}>
              {pets.map((pet) => (
                  <div 
                    key={pet.id} 
                    className="pet-premium-card" 
                    onClick={() => navigate('/medical-records', { state: { petId: pet.id } })}
                    style={{ 
                        flex: '0 0 280px', /* 固定宽度形成横向效果 */
                        background: '#fff', 
                        borderRadius: '32px', 
                        padding: '24px', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
                        border: '1px solid #F1F5F9',
                        position: 'relative',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                  >
                      {/* 宠物主体信息 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '16px' }}>
                              <div style={{ 
                                  width: '56px', height: '56px', 
                                  background: pet.statusColor === '#10B981' ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' : '#F8FAFC', 
                                  borderRadius: '20px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '1.8rem',
                                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                              }}>
                                  {pet.icon}
                              </div>
                              <div>
                                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1E293B' }}>{pet.name}</h4>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{pet.breed}</span>
                                      <span style={{ color: '#E2E8F0' }}>•</span>
                                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{pet.age}·{pet.weight}</span>
                                  </div>
                              </div>
                          </div>
                          <Tag 
                            round 
                            type="primary" 
                            style={{ 
                                padding: '4px 8px', 
                                background: pet.statusColor + '20', 
                                color: pet.statusColor, 
                                border: `0.5px solid ${pet.statusColor}40`,
                                fontSize: '0.65rem',
                                fontWeight: 800
                            }}
                          >
                              {pet.status}
                          </Tag>
                      </div>
                      
                      {/* 健康进度仪表 */}
                      {pet.vaccineProgress !== undefined && (
                          <div className="health-metrics" style={{ background: '#F8FAFC', borderRadius: '24px', padding: '16px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '10px' }}>
                                  <span style={{ color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div style={{ width: '6px', height: '6px', background: '#6366F1', borderRadius: '50%' }} /> 健康评分
                                  </span>
                                  <span style={{ fontWeight: 800, color: '#6366F1' }}>{pet.vaccineProgress}%</span>
                              </div>
                              <Progress 
                                percentage={pet.vaccineProgress} 
                                pivotText=' ' 
                                strokeWidth='10px' 
                                color='linear-gradient(to right, #6366F1, #818CF8)' 
                                trackColor='#E2E8F0'
                              />
                          </div>
                      )}

                      {/* 快捷操作区 */}
                      <div style={{ borderTop: '0.5px solid #F1F5F9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '20px' }}>
                              <div style={{ textAlign: 'center' }}>
                                  <Icons.Syringe size={16} color="#94A3B8" />
                                  <p style={{ margin: '2px 0 0 0', fontSize: '0.6rem', color: '#94A3B8', fontWeight: 600 }}>接种</p>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                  <Icons.ClipboardList size={16} color="#94A3B8" />
                                  <p style={{ margin: '2px 0 0 0', fontSize: '0.6rem', color: '#94A3B8', fontWeight: 600 }}>档案</p>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                  <Icons.HeartPulse size={16} color="#94A3B8" />
                                  <p style={{ margin: '2px 0 0 0', fontSize: '0.6rem', color: '#94A3B8', fontWeight: 600 }}>就诊</p>
                              </div>
                          </div>
                          <div 
                             onClick={(e) => { e.stopPropagation(); navigate('/appointment', { state: { pet } }); }}
                             style={{ background: '#6366F1', width: '32px', height: '32px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                          >
                              <Icons.Plus size={18} strokeWidth={3} />
                          </div>
                      </div>
                  </div>
              ))}
              
              {/* 最后的占位符，增加滑到底后的诱导感 */}
              <div 
                onClick={() => setIsAddPetOpen(true)}
                style={{ 
                    flex: '0 0 100px', 
                    borderRadius: '32px', 
                    border: '2px dashed #E2E8F0', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#94A3B8',
                    cursor: 'pointer'
                }}
              >
                  <Icons.PlusCircle size={24} />
                  <p style={{ fontSize: '0.7rem', marginTop: '8px', fontWeight: 600 }}>添加多一只</p>
              </div>
          </div>
      )}

      {/* 📄 就诊历史 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>就诊历史</h3>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>更多历史</span>
      </div>

      <div className="visit-timeline" style={{ position: 'relative', marginLeft: '4px' }}>
          {visits.map((visit) => (
             <div key={visit.id} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div style={{ width: '8px', height: '8px', background: '#6366F1', borderRadius: '50%', border: '2px solid #E0E7FF' }}></div>
                     <div style={{ flex: 1, width: '1px', background: '#E2E8F0', marginTop: '4px' }}></div>
                 </div>
                 <div style={{ flex: 1, paddingBottom: '16px', borderBottom: '1px solid #F8FAFC' }}>
                     <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>{visit.date} · {visit.status}</p>
                     <h5 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700 }}>{visit.type} ({visit.pet})</h5>
                     <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>{visit.detail}</p>
                 </div>
             </div>
          ))}
      </div>
      
      <Divider style={{ margin: '40px 0', color: '#E2E8F0', fontSize: '0.75rem' }}>由 宠爱之城 HIS 系统提供技术支持</Divider>

      {/* 🏠 添加宠物弹出层 */}
      <Popup
        visible={isAddPetOpen}
        onClose={() => setIsAddPetOpen(false)}
        position='bottom'
        round
        style={{ height: '70%', background: '#F8FAFC' }}
      >
        <div style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 900 }}>🎉 创建宠物电子档案</h3>
            <Form
               form={form}
               onFinish={handleAddPet}
               layout='vertical'
               footer={
                 <div style={{ margin: '16px 0' }}>
                   <Button nativeType='submit' type='primary' block round style={{ height: '52px', fontSize: '1rem', fontWeight: 800 }}>建立并同步档案</Button>
                 </div>
               }
            >
                <div style={{ background: '#fff', borderRadius: '20px', padding: '12px', marginBottom: '16px' }}>
                    <Form.Item name='petName' label='宠物昵称' rules={[{ required: true, message: '请填写宠物的名字' }]}>
                        <Field placeholder='如：奥利奥' />
                    </Form.Item>
                    <Form.Item name='type' label='宠物种类' initialValue='🐱 猫咪'>
                        <Radio.Group direction='horizontal'>
                            <Radio name='🐶 犬类'>🐶 犬类</Radio>
                            <Radio name='🐱 猫咪'>🐱 猫咪</Radio>
                            <Radio name='🦎 异宠'>🦎 异宠</Radio>
                            <Radio name='🕊️ 鸟类'>🕊️ 鸟类</Radio>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item name='ownerName' label='主人真实姓名' rules={[{ required: true, message: '请填写您的姓名' }]}>
                        <Field placeholder='用于诊疗报告称呼' />
                    </Form.Item>
                </div>
            </Form>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8' }}>档案创建后将自动同步至医院 HIS 管理系统</p>
        </div>
      </Popup>
    </div>
  );
}
