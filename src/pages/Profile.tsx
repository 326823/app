
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Toast, Popup } from 'react-vant';
import * as Icons from 'lucide-react';

interface Medicine {
  id: number;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  status: string;
}

interface UserProfile {
  name: string;
  avatar: string;
  phone: string;
  balance: number;
}

type ActiveView = 'main' | 'edit' | 'redeem' | 'topup' | 'redeemHistory';

const LEVEL_CONFIG = [
  { name: '普通', color: '#94A3B8', bgColor: '#F1F5F9', minExp: 0 },
  { name: '白银', color: '#64748B', bgColor: '#E2E8F0', minExp: 500 },
  { name: '黄金', color: '#D97706', bgColor: '#FEF3C7', minExp: 2000 },
  { name: '钻石', color: '#6366F1', bgColor: '#EEF2FF', minExp: 5000 },
];

// 1000积分 = ¥50，所以 pointsRequired = price * 20
const getPriceInPoints = (price: number) => price * 20;

export default function ProfilePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ActiveView>('main');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [realSpent, setRealSpent] = useState(0);      // 真实消费（不含兑换），决定成长值
  const [pointsSpent, setPointsSpent] = useState(0);  // 积分兑换已消耗的积分
  const [redeemHistory, setRedeemHistory] = useState<any[]>([]); // 兑换记录
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState('wechat');
  const [isTopupPayOpen, setIsTopupPayOpen] = useState(false);
  const [isGrowthShow, setIsGrowthShow] = useState(false);
  const [isPrivilegeShow, setIsPrivilegeShow] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<Medicine | null>(null);

  const TOPUP_METHODS = [
    { id: 'wechat',    icon: '💬', label: '微信支付',  color: '#07C160' },
    { id: 'alipay',   icon: '🔷', label: '支付宝',    color: '#1677FF' },
    { id: 'unionpay', icon: '⚡', label: '云闪付',    color: '#EF4444' },
    { id: 'bankcard', icon: '🏦', label: '银行卡',    color: '#0EA5E9' },
    { id: 'credit',   icon: '💎', label: '信用卡',    color: '#8B5CF6' },
  ];

  const [profile, setProfile] = useState<UserProfile>(() => ({
    name: localStorage.getItem('profile_name') || '宠物主人',
    avatar: localStorage.getItem('profile_avatar') || '😺',
    phone: localStorage.getItem('userPhone') || '155****7167',
    balance: parseFloat(localStorage.getItem('profile_balance') || '380'),
  }));

  const [editForm, setEditForm] = useState({ name: profile.name, phone: profile.phone });

  const phone = localStorage.getItem('userPhone');
  // 成长值 = 真实消费金额（排除积分兑换记录）
  const exp = Math.floor(realSpent);
  // 积分 = 真实消费所得积分 - 已兑换消耗的积分
  const points = Math.max(0, Math.floor(realSpent) - pointsSpent);

  const currentLevel = [...LEVEL_CONFIG].reverse().find(l => exp >= l.minExp) || LEVEL_CONFIG[0];
  const nextLevel = LEVEL_CONFIG[LEVEL_CONFIG.indexOf(currentLevel) + 1];
  const expProgress = nextLevel
    ? Math.min(100, ((exp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100)
    : 100;

  const fetchData = useCallback(async () => {
    try {
      const url = phone
        ? `https://houduan-hlb1.onrender.com/payments?ownerPhone=${phone}`
        : `https://houduan-hlb1.onrender.com/payments`;
      const [paymentsRes, medsRes] = await Promise.all([
        fetch(url),
        fetch('https://houduan-hlb1.onrender.com/medicines'),
      ]);
      const payments = await paymentsRes.json();
      const meds = await medsRes.json();
      if (Array.isArray(payments)) {
        // 真实消费：已结算 且 不是积分兑换的记录，且金额为正
        const real = payments
          .filter((p: any) => p.status === 'settled' && p.billType !== 'redemption')
          .reduce((sum: number, p: any) => sum + Math.max(0, Number(p.total || p.amount || 0)), 0);
        setRealSpent(real);
        
        // 积分兑换记录（用于扣减积分）
        const redemptions = payments.filter((p: any) => p.billType === 'redemption');
        // 每条兑换记录 total 为负值（如 -1700 表示消耗1700积分），取绝对值求和
        const spent = redemptions.reduce((sum: number, p: any) => sum + Math.abs(Number(p.total || 0)), 0);
        setPointsSpent(spent);
        setRedeemHistory(redemptions.sort((a: any, b: any) => b.createdAt?.localeCompare(a.createdAt || '') || 0));
      }
      if (Array.isArray(meds)) setMedicines(meds);
    } catch (e) {
      console.error(e);
    }
  }, [phone]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveProfile = () => {
    const updated = { ...profile, name: editForm.name, phone: editForm.phone };
    setProfile(updated);
    localStorage.setItem('profile_name', updated.name);
    localStorage.setItem('profile_balance', String(updated.balance));
    setView('main');
    Toast.success('资料已更新 ✅');
  };

  const handleTopupClick = () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) return Toast.fail('请输入有效金额');
    setIsTopupPayOpen(true);
  };

  const handleTopupConfirm = () => {
    const amt = parseFloat(topupAmount);
    const newBalance = parseFloat((profile.balance + amt).toFixed(2));
    const updated = { ...profile, balance: newBalance };
    setProfile(updated);
    localStorage.setItem('profile_balance', String(newBalance));
    setTopupAmount('');
    setIsTopupPayOpen(false);
    setView('main');
    Toast.success(`使用${TOPUP_METHODS.find(m=>m.id===topupMethod)?.label}成功充值 ¥${amt.toFixed(2)}`);
  };

  const handleRedeem = (med: Medicine) => {
    const required = getPriceInPoints(med.price);
    if (points < required) {
      Toast.fail(`积分不足，还需 ${required - points} 积分`);
      return;
    }
    Dialog.confirm({
      title: '确认兑换',
      message: `使用 ${required} 积分兑换【${med.name}】x1 ${med.unit}？`,
      confirmButtonText: '确定兑换',
      cancelButtonText: '再想想',
      onConfirm: async () => {
        try {
          // Deduct stock from server
          await fetch(`https://houduan-hlb1.onrender.com/medicines/${med.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: Math.max(0, med.stock - 1) }),
          });
          // Record a settled "redemption" payment so points deduct on next load
          await fetch(`https://houduan-hlb1.onrender.com/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `REDEEM-${Date.now()}`,
              petName: profile.name,
              ownerName: profile.name,
              ownerPhone: phone || '未知',
              items: [{ name: med.name, price: med.price, amount: 1, unit: med.unit }],
              total: -(getPriceInPoints(med.price)), // 负值扣积分（以-积分换算）
              date: new Date().toISOString().split('T')[0],
              createdAt: new Date().toISOString(),
              status: 'settled',
              billType: 'redemption',
              paymentMethod: 'points',
            }),
          });
          setRedeemSuccess(med);
          fetchData();
        } catch {
          Toast.fail('兑换失败，请稍后重试');
        }
      }
    });
  };

  const handleLogout = () => {
    Dialog.confirm({
      title: '退出登录',
      message: '确定要退出当前账户吗？',
      confirmButtonText: '确定退出',
      cancelButtonText: '取消',
      onConfirm: () => {
        localStorage.removeItem('isLoggedIn');
        Toast.success('已安全退出');
        navigate('/login');
      }
    });
  };

  // ─── Sub-views ──────────────────────────────────────────────────────────────

  if (view === 'edit') return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button onClick={() => setView('main')} style={{ border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '12px', background: '#fff' }}><Icons.ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>编辑个人资料</h2>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '12px' }}>{profile.avatar}</div>
        <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: '0 0 16px 0' }}>选择你的头像</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {['😺','🐶','🐰','🐻','🦊','🐼','🐨','🦁','🐯','🐸'].map(emoji => (
            <div key={emoji} onClick={() => { const u = {...profile, avatar: emoji}; setProfile(u); localStorage.setItem('profile_avatar', emoji); }}
              style={{ fontSize: '1.8rem', padding: '10px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
                background: profile.avatar === emoji ? '#EEF2FF' : '#fff',
                border: `2px solid ${profile.avatar === emoji ? '#6366F1' : '#F1F5F9'}`,
                boxShadow: profile.avatar === emoji ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none'
              }}>{emoji}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: '昵称', key: 'name', placeholder: '请输入昵称' },
          { label: '手机号', key: 'phone', placeholder: '请输入手机号' }
        ].map(field => (
          <div key={field.key}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>{field.label}</label>
            <input
              value={editForm[field.key as keyof typeof editForm]}
              onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #F1F5F9', fontSize: '1rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      <button onClick={saveProfile} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff', border: 'none', borderRadius: '18px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer' }}>
        保存资料
      </button>
    </div>
  );

  if (view === 'topup') return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button onClick={() => setView('main')} style={{ background: '#fff', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '12px' }}><Icons.ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>账户充值</h2>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1E293B, #334155)', borderRadius: '28px', padding: '32px', color: '#fff', textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ margin: '0 0 8px 0', opacity: 0.7, fontSize: '0.9rem' }}>当前账户余额</p>
        <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 950 }}>¥ {profile.balance.toFixed(2)}</h1>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>充值金额</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {[50, 100, 200, 500, 1000, 2000].map(amt => (
            <button key={amt} onClick={() => setTopupAmount(String(amt))} style={{ padding: '14px', borderRadius: '16px', border: `2px solid ${topupAmount === String(amt) ? '#6366F1' : '#E2E8F0'}`, background: topupAmount === String(amt) ? '#EEF2FF' : '#fff', color: topupAmount === String(amt) ? '#6366F1' : '#1E293B', fontWeight: 800, cursor: 'pointer' }}>
              ¥{amt}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="或输入自定义金额"
          value={topupAmount}
          onChange={e => setTopupAmount(e.target.value)}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '1rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <button onClick={handleTopupClick} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '18px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', marginTop: '20px' }}>
        下一步：选择支付方式
      </button>

      {/* 充值支付方式弹窗 */}
      <Popup visible={isTopupPayOpen} onClose={() => setIsTopupPayOpen(false)} position="bottom" round style={{ background: '#F8FAFC' }}>
        <div style={{ padding: '28px 20px 40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>需支付</p>
            <h1 style={{ margin: '6px 0 0 0', fontSize: '2.8rem', fontWeight: 950, color: '#1E293B' }}>
              ¥ {topupAmount ? parseFloat(topupAmount).toFixed(2) : '0.00'}
            </h1>
          </div>

          <p style={{ fontWeight: 900, color: '#1E293B', margin: '0 0 12px 0', fontSize: '0.9rem' }}>选择支付方式</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {TOPUP_METHODS.map(m => (
              <div key={m.id} onClick={() => setTopupMethod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '18px', background: '#fff', border: `2px solid ${topupMethod === m.id ? m.color : '#F1F5F9'}`, boxShadow: topupMethod === m.id ? `0 0 0 3px ${m.color}20` : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: topupMethod === m.id ? m.color : '#1E293B' }}>{m.label}</span>
                {topupMethod === m.id && <span style={{ marginLeft: 'auto', color: m.color, fontSize: '1rem' }}><Icons.CheckCircle2 size={22} fill={m.color} color="#fff" /></span>}
              </div>
            ))}
          </div>

          <button onClick={handleTopupConfirm} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff', border: 'none', borderRadius: '18px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer' }}>
            确认支付 ¥{topupAmount}
          </button>
        </div>
      </Popup>
    </div>
  );

  if (view === 'redeem') return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '60px' }}>
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <button onClick={() => setView('main')} style={{ background: '#fff', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '12px' }}><Icons.ArrowLeft size={20} /></button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>积分商城</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>1000积分 = ¥50 药品 | 消费 ¥1 = 积分1分</p>
        </div>
      </div>

      <div style={{ margin: '0 24px 24px 24px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', borderRadius: '20px', padding: '20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>我的积分</p>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '2rem', fontWeight: 950 }}>{points.toLocaleString()}</h2>
        </div>
        <Icons.Coins size={40} color="rgba(255,255,255,0.3)" />
      </div>

      {redeemSuccess && (
        <div style={{ margin: '0 24px 24px 24px', background: '#DCFCE7', border: '2px solid #10B981', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2rem' }}>🎁</span>
          <div>
            <p style={{ margin: 0, fontWeight: 900, color: '#065F46' }}>兑换成功！</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#059669' }}>【{redeemSuccess.name}】x1 已加入您的药品库</p>
          </div>
          <button onClick={() => setRedeemSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}><Icons.X size={18} /></button>
        </div>
      )}

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {medicines.map(med => {
          const required = getPriceInPoints(med.price);
          const canRedeem = points >= required && med.stock >= 1;
          return (
            <div key={med.id} style={{ background: '#fff', borderRadius: '24px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
                {med.category === '驱虫药' ? '🦟' : med.category === '处方药' ? '💊' : med.category === '营养补给' ? '🦴' : med.category === '处方粮' ? '🍖' : med.category === '关节健康' ? '🦿' : med.category === '口腔护理' ? '🦷' : med.category === '五官护理' ? '👁️' : med.category === '肠胃用药' ? '🧪' : '💝'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px 0', fontWeight: 900, color: '#1E293B', fontSize: '0.95rem' }}>{med.name}</p>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#94A3B8' }}>{med.category} · 库存 {med.stock}{med.unit}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#EEF2FF', color: '#6366F1', fontWeight: 800, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px' }}>
                    {required.toLocaleString()} 积分
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>市价 ¥{med.price}</span>
                </div>
              </div>
              <button
                onClick={() => handleRedeem(med)}
                disabled={!canRedeem}
                style={{
                  padding: '10px 16px', borderRadius: '14px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: canRedeem ? 'pointer' : 'not-allowed',
                  background: canRedeem ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : '#F1F5F9',
                  color: canRedeem ? '#fff' : '#94A3B8',
                  transition: 'all 0.2s'
                }}
              >
                {canRedeem ? '立即兑' : med.stock < 1 ? '缺货' : '不足'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Main View ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>

      {/* 👑 黑金会员卡 */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #3730A3 100%)', padding: '32px 24px 40px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-30px', top: '-30px', opacity: 0.08 }}><Icons.Crown size={200} /></div>
        <div style={{ position: 'absolute', left: '-20px', bottom: '-40px', opacity: 0.05 }}><Icons.Heart size={180} /></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <div onClick={() => setView('edit')} style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', cursor: 'pointer', position: 'relative' }}>
            {profile.avatar}
            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#6366F1', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Camera size={11} color="#fff" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, color: '#fff' }}>{profile.name}</h3>
              <span onClick={() => setIsPrivilegeShow(true)} style={{ background: currentLevel.bgColor, color: currentLevel.color, fontWeight: 900, fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.Award size={12} /> {currentLevel.name} VIP <Icons.ChevronRight size={12} />
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{profile.phone}</p>
          </div>
          <button onClick={() => setView('edit')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: '#fff' }}>
            <Icons.Settings size={18} />
          </button>
        </div>

        {/* 成长值进度 */}
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 700 }}>成长值 {exp.toLocaleString()}</span>
            <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 800 }}>
              {nextLevel ? `距 ${nextLevel.name} 还差 ${(nextLevel.minExp - exp).toLocaleString()}` : '🏆 最高等级'}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${expProgress}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', height: '100%', borderRadius: '99px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* 资产三格 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '20px', marginTop: '-16px' }}>
        {[
          { label: '账户余额', value: `¥${profile.balance.toFixed(2)}`, icon: '💳', action: () => setView('topup'), color: '#10B981' },
          { label: '我的积分', value: points.toLocaleString(), icon: '⭐', action: () => setView('redeem'), color: '#F59E0B' },
          { label: '成长总值', value: exp.toLocaleString(), icon: '📈', action: () => setIsGrowthShow(true), color: '#6366F1' },
        ].map((item, i) => (
          <div key={i} onClick={item.action} style={{ background: '#fff', borderRadius: '22px', padding: '18px 12px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', cursor: 'pointer', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{item.icon}</div>
            <div style={{ fontWeight: 950, color: item.color, fontSize: '0.85rem', marginBottom: '4px' }}>{item.value}</div>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 会员权益 */}
      <div style={{ margin: '0 20px 20px 20px', background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Icons.ShieldCheck size={18} color="#F59E0B" />
          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1E293B' }}>会员专属特权</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: currentLevel.color, fontWeight: 800 }}>{currentLevel.name}会员</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { icon: '🛍️', label: '购药专属折扣', desc: '每单最高 9 折' },
            { icon: '⚡', label: '优先挂号通道', desc: '免等 5 分钟' },
            { icon: '🎁', label: '积分兑换好礼', desc: '1000分兑¥50药品' },
            { icon: '🩺', label: '月度免费体检', desc: '每月可用 1 次' },
          ].map((p, i) => (
            <div key={i} style={{ background: '#F8FAFC', borderRadius: '16px', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{p.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.8rem', color: '#1E293B' }}>{p.label}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#94A3B8' }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 功能菜单 */}
      <div style={{ margin: '0 20px 20px 20px', background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        {[
          { icon: <Icons.Star size={18} color="#F59E0B" />, label: '积分商城兑换', badge: `${points}分`, action: () => setView('redeem') },
          { icon: <Icons.Wallet size={18} color="#10B981" />, label: '账户余额充值', badge: `¥${profile.balance.toFixed(2)}`, action: () => setView('topup') },
          { icon: <Icons.ClipboardList size={18} color="#6366F1" />, label: '待付款账单', badge: '', action: () => navigate('/appointment', { state: { tab: 'payment' } }) },
          { icon: <Icons.Clock size={18} color="#64748B" />, label: '历史消费记录', badge: `¥${realSpent.toFixed(0)}`, action: () => navigate('/appointment', { state: { tab: 'history' } }) },
          { icon: <Icons.Settings size={18} color="#94A3B8" />, label: '个人资料设置', badge: '', action: () => setView('edit') },
        ].map((item, i, arr) => (
          <div key={i} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer' }}>
            <div style={{ width: '36px', height: '36px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.icon}
            </div>
            <span style={{ flex: 1, fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>{item.label}</span>
            {item.badge && <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>{item.badge}</span>}
            <Icons.ChevronRight size={16} color="#CBD5E1" />
          </div>
        ))}
      </div>

      {/* 📈 成长值说明弹窗 */}
      <Popup visible={isGrowthShow} onClose={() => setIsGrowthShow(false)} round position="bottom" style={{ background: '#F8FAFC' }}>
        <div style={{ padding: '32px 24px 40px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
             <Icons.TrendingUp size={48} color="#6366F1" style={{ marginBottom: '12px' }} />
             <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 900, color: '#1E293B' }}>成长值明细</h2>
             <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>成长值决定了您的会员等级</p>
          </div>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                <span style={{ fontWeight: 800, color: '#1E293B' }}>获取规则</span>
                <span style={{ fontSize: '0.8rem', color: '#6366F1', fontWeight: 800, background: '#EEF2FF', padding: '4px 10px', borderRadius: '12px' }}>¥1 = 1点</span>
             </div>
             <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748B', lineHeight: '1.6' }}>• 在院内进行的所有有效消费（挂号、药品、诊疗）均自动转化为成长值。<br/>• 积分兑换、退款订单不计算成长值。<br/>• 成长值永久有效，不会随着年份清零退级。</p>
          </div>
          <button onClick={() => setIsGrowthShow(false)} style={{ width: '100%', padding: '16px', background: '#1E293B', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>我知道了</button>
        </div>
      </Popup>

      {/* 👑 VIP 特权展示弹窗 */}
      <Popup visible={isPrivilegeShow} onClose={() => setIsPrivilegeShow(false)} round position="bottom" style={{ background: '#1E293B', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '32px 24px 24px 24px', flex: 1, overflowY: 'auto' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 950, color: '#fff' }}>会员专属特权</h2>
                  <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem' }}>解锁更优质的医疗服务体验</p>
               </div>
               <div onClick={() => setIsPrivilegeShow(false)} style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                  <Icons.X color="#fff" size={20} />
               </div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {LEVEL_CONFIG.map((vl, idx) => (
                 <div key={vl.name} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${vl.color}40`, borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1, fontSize: '100px' }}>{['🌱','🥈','🥇','💎'][idx]}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                       <span style={{ background: vl.bgColor, color: vl.color, padding: '4px 12px', borderRadius: '12px', fontWeight: 900, fontSize: '0.8rem' }}>{vl.name} VIP</span>
                       <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700 }}>{idx === 0 ? '注册即享' : `需 ${vl.minExp} 成长值`}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#E2E8F0', fontSize: '0.85rem', lineHeight: '2' }}>
                       {idx === 0 && <li>基础预约挂号服务</li>}
                       {idx === 0 && <li>在线商城选购资格</li>}
                       {idx === 1 && <li>全场药品 <strong style={{ color: vl.color }}>9.5 折</strong> 优惠</li>}
                       {idx === 1 && <li>每月 1 次免费常规体检查体</li>}
                       {idx === 2 && <li>全场诊疗及药品 <strong style={{ color: vl.color }}>9.0 折</strong></li>}
                       {idx === 2 && <li>专属客服 / 免费专家号预约权</li>}
                       {idx === 3 && <li>全场项目底价 <strong style={{ color: vl.color }}>8.5 折</strong> 结算</li>}
                       {idx === 3 && <li>绿色通道 / 顶级专家亲自首接诊</li>}
                    </ul>
                 </div>
              ))}
           </div>
        </div>
      </Popup>

      <div style={{ padding: '0 20px' }}>
        <button onClick={handleLogout} style={{ width: '100%', padding: '18px', background: '#fff', border: '2px solid #FEE2E2', borderRadius: '18px', color: '#EF4444', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>
          退出当前账户
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#CBD5E1', marginTop: '16px', fontWeight: 600 }}>PET-HIS Mobile · v3.1 Pro</p>
      </div>
    </div>
  );
}
