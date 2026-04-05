
import { useState, useMemo, useEffect } from 'react';
import { Sidebar, Tag, Search, Toast, SubmitBar, Popup, Button } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';

const CATEGORIES = [
  { id: 0, title: '推荐', icon: <Icons.Star size={14} color="#F59E0B" /> },
  { id: 1, title: '驱虫', icon: <Icons.Bug size={14} color="#6366F1" /> },
  { id: 2, title: '处方', icon: <Icons.Stethoscope size={14} color="#10B981" /> },
  { id: 3, title: '粮/营养', icon: <Icons.Bone size={14} color="#EC4899" /> },
];

const ALL_DRUGS = [
  { id: 1, catId: 0, name: '海乐妙 (Milbemax)', spec: '12.5mg/片 (猫/小型犬适用)', price: 8500, img: '💊', tag: '体内强效', isRX: false },
  { id: 2, catId: 1, name: '大宠爱 (Revolution)', spec: '6mg (幼猫/幼犬适用)', price: 7200, img: '💧', tag: '内外双驱', isRX: false },
  { id: 3, catId: 1, name: '博来恩 (Broadline)', spec: '猫用体内外全谱驱虫', price: 15800, img: '🐈', tag: '经典全谱', isRX: false },
  { id: 4, catId: 2, name: '阿莫西林克拉维酸钾', spec: '消炎药 · 250mg*10片', price: 4500, img: '🔬', tag: '广谱抗菌', isRX: true },
  { id: 5, catId: 2, name: '速诺 (Synulox)', spec: '口服混悬液 · 指南力荐', price: 11000, img: '🧪', tag: '急重感染', isRX: true },
  { id: 6, catId: 3, name: '希尔思i/d处方粮', spec: '胃肠道保护 · 2kg装', price: 28500, img: '🥣', tag: '肠道修复', isRX: true },
  { id: 7, catId: 3, name: 'MAG高级营养膏', spec: '快速恢复 · 高密度补给', price: 8200, img: '🍯', tag: '术后恢复', isRX: false },
];

const PAY_METHODS = [
  { id: 'wechat',    icon: '💬', label: '微信支付',   color: '#07C160', desc: '推荐使用，快速到账' },
  { id: 'alipay',   icon: '🔷', label: '支付宝',     color: '#1677FF', desc: '余额/花呗支付' },
  { id: 'balance',  icon: '💳', label: '账户余额',   color: '#6366F1', desc: '' }, // desc filled dynamically
  { id: 'unionpay', icon: '⚡', label: '云闪付',     color: '#EF4444', desc: '银联快捷通道' },
  { id: 'bankcard', icon: '🏦', label: '银行卡',     color: '#0EA5E9', desc: '储蓄卡/借记卡' },
  { id: 'credit',   icon: '💎', label: '信用卡',     color: '#8B5CF6', desc: '支持分期付款' },
];

const LEVEL_CONFIG = [
  { name: '普通级', discount: 1, color: '#94A3B8', minExp: 0 },
  { name: '白银会员', discount: 0.95, color: '#64748B', minExp: 500 },
  { name: '黄金会员', discount: 0.90, color: '#D97706', minExp: 2000 },
  { name: '钻石VIP', discount: 0.85, color: '#6366F1', minExp: 5000 },
];

const COUPONS = [
  { id: 0, title: '不使用优惠券', value: 0, minSpend: 0 },
  { id: 1, title: '满100减10', value: 10, minSpend: 100 },
  { id: 2, title: '满300减40', value: 40, minSpend: 300 },
  { id: 3, title: '新客无门槛5元', value: 5, minSpend: 0 },
];

export default function PharmacyPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('wechat');
  const [isPaying, setIsPaying] = useState(false);
  const [realSpent, setRealSpent] = useState(0);
  const [selectedCouponId, setSelectedCouponId] = useState(-1);
  const [deliveryType, setDeliveryType] = useState<'delivery'|'pickup'>('delivery');

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
      fetch(`https://houduan-hlb1.onrender.com/payments?ownerPhone=${phone}&status=settled`)
        .then(res => res.json())
        .then((data: any[]) => {
          let rs = 0;
          data.forEach(p => { if (p.billType !== 'redemption') rs += Number(p.total); });
          setRealSpent(rs);
        }).catch(() => {});
    }
  }, []);

  const [cart, setCart] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('pet_pharmacy_cart');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
      for (const key in parsed) {
        if (typeof parsed[key] !== 'number') {
          return {}; // Any corruption completely resets the cart
        }
      }
      return parsed;
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('pet_pharmacy_cart', JSON.stringify(cart));
  }, [cart]);

  const balance = parseFloat(localStorage.getItem('profile_balance') || '0');

  const cartInfo = useMemo(() => {
    let total = 0, count = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const drug = ALL_DRUGS.find(d => d.id === Number(id));
      if (drug) { total += drug.price * qty; count += qty; }
    });
    return { total, count };
  }, [cart]);

  const totalYuan = cartInfo.total / 100;
  const packageFee = deliveryType === 'delivery' ? 5 : 0; // 外卖打包费

  // 1. 会员权益折扣 (按原价打折)
  const currentLevel = LEVEL_CONFIG.slice().reverse().find(l => realSpent >= l.minExp) || LEVEL_CONFIG[0];
  const afterDiscount = totalYuan * currentLevel.discount;
  const savedByVIP = totalYuan - afterDiscount;

  // 2. 优惠券选择
  const availableCoupons = COUPONS.filter(c => afterDiscount >= c.minSpend);
  let activeCoupon;
  if (selectedCouponId === -1 && availableCoupons.length > 1) {
    // 首次自动派发面额最大的券
    activeCoupon = [...availableCoupons].sort((a,b)=>b.value - a.value)[0];
  } else {
    activeCoupon = availableCoupons.find(c => c.id === selectedCouponId) || COUPONS[0];
  }

  const finalYuan = Math.max(0, afterDiscount - activeCoupon.value) + packageFee;

  const addToCart = (id: number) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    Toast.success({ message: '已加入购物车', duration: 800 });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) {
        newCart[id] -= 1;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  const handleCheckout = () => {
    if (cartInfo.count === 0) return;
    setIsPayOpen(true);
  };

  const confirmPay = async () => {
    if (payMethod === 'balance') {
      if (balance < finalYuan) {
        Toast.fail(`余额不足，当前余额 ¥${balance.toFixed(2)}，请充值后再试`);
        return;
      }
    }

    setIsPaying(true);
    Toast.loading({ message: '正在结算中...', forbidClick: true });

    const phone = localStorage.getItem('userPhone');
    const paymentItems = Object.entries(cart).map(([id, qty]) => {
      const drug = ALL_DRUGS.find(d => d.id === Number(id));
      return { name: drug?.name || '', price: (drug?.price || 0) / 100, amount: qty, unit: '件' };
    });

    const paymentData = {
      id: `DRUG-${Date.now()}`,
      ownerPhone: phone,
      total: finalYuan,
      status: payMethod === 'balance' ? 'settled' : 'pending',
      type: '药品采购',
      billType: 'pharmacy',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      items: paymentItems,
      paymentMethod: payMethod,
    };

    try {
      // 扣减库存
      for (const [id, count] of Object.entries(cart)) {
        const medRes = await fetch(`https://houduan-hlb1.onrender.com/medicines/${id}`);
        const medData = await medRes.json();
        const newStock = Math.max(0, Number(medData.stock) - Number(count));
        await fetch(`https://houduan-hlb1.onrender.com/medicines/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: newStock, status: newStock < 5 ? '紧缺' : newStock < 15 ? '少量' : '充足' })
        });
      }

      // 生成账单
      await fetch('https://houduan-hlb1.onrender.com/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      // 余额支付：直接扣减本地余额
      if (payMethod === 'balance') {
        const newBal = parseFloat((balance - finalYuan).toFixed(2));
        localStorage.setItem('profile_balance', String(newBal));
      }

      localStorage.removeItem('pet_pharmacy_cart');
      setCart({});
      Toast.clear();
      setIsPayOpen(false);
      setIsPaying(false);

      if (payMethod === 'balance') {
        Toast.success('余额支付成功！已自动结算');
        navigate('/appointment', { state: { tab: 'history' } });
      } else {
        Toast.success('下单成功！请在缴费页完成支付');
        navigate('/appointment', { state: { tab: 'payment' } });
      }
    } catch {
      Toast.fail('结算系统超时，请稍后重试');
      setIsPaying(false);
    }
  };

  const currentProducts = active === 0 ? ALL_DRUGS.slice(0, 4) : ALL_DRUGS.filter(d => d.catId === active);

  return (
    <div className="pharmacy-pro-layout" style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: '#fff' }}>

      <div style={{ padding: '12px 16px', background: '#fff' }}>
        <Search placeholder="搜索常用药、处方粮..." shape="round" background="#F8FAFC" />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: '85px', background: '#F8FAFC', paddingBottom: '100px' }}>
          <Sidebar
            value={active}
            onChange={(v) => setActive(Number(v))}
            style={{ width: '100%', '--rv-sidebar-selected-border-color': '#6366F1', '--rv-sidebar-background-color': 'transparent' }}
          >
            {CATEGORIES.map(cat => (
              <Sidebar.Item key={cat.id} title={
                <div style={{ fontSize: '0.75rem', textAlign: 'center', fontWeight: active === cat.id ? 900 : 500, color: active === cat.id ? '#1E293B' : '#94A3B8' }}>
                  <div style={{ marginBottom: '4px', opacity: active === cat.id ? 1 : 0.6 }}>{cat.icon}</div>
                  {cat.title}
                </div>
              } />
            ))}
          </Sidebar>
        </div>

        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {currentProducts.map(p => (
              <div key={p.id} style={{ width: 'calc(50% - 4px)', background: '#fff', borderRadius: '24px', padding: '12px', border: '1px solid #F1F5F9', marginBottom: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative' }}>
                <div style={{ height: '80px', background: '#F8FAFC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', marginBottom: '10px' }}>
                  {p.img}
                  {p.isRX && <Tag type="danger" size="mini" style={{ position: 'absolute', top: 4, right: 4, borderRadius: '4px' }}>处方</Tag>}
                </div>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', fontWeight: 800, color: '#334155', height: '2.6em', overflow: 'hidden', lineHeight: 1.3 }}>{p.name}</h5>
                <p style={{ fontSize: '0.65rem', color: '#94A3B8', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.spec}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: '#EF4444' }}>¥{(p.price / 100).toFixed(2)}</span>
                  
                  {cart[p.id] ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div onClick={() => removeFromCart(p.id)} style={{ background: '#F1F5F9', width: '24px', height: '24px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer' }}>
                        <Icons.Minus size={14} strokeWidth={3} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', width: '16px', textAlign: 'center' }}>{cart[p.id]}</span>
                      <div onClick={() => addToCart(p.id)} style={{ background: '#6366F1', width: '24px', height: '24px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                        <Icons.Plus size={14} strokeWidth={3} />
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => addToCart(p.id)} style={{ background: '#6366F1', width: '24px', height: '24px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                      <Icons.Plus size={16} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 100 }}>
        <SubmitBar
          price={finalYuan * 100}
          buttonText={`去结算 (${cartInfo.count})`}
          onSubmit={handleCheckout}
          style={{ borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 30px rgba(0,0,0,0.05)', padding: '0 10px' }}
        />
      </div>

      {/* 💳 仿外卖式确认订单弹窗 */}
      <Popup visible={isPayOpen} onClose={() => setIsPayOpen(false)} position="bottom" round style={{ height: '90vh', background: '#F5F5F5', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', padding: '4px', cursor: 'pointer' }} onClick={() => setIsPayOpen(false)}>
            <Icons.ArrowLeft size={24} color="#1E293B" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1E293B' }}>确认订单</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {/* 到家/自取 Tab */}
          <div style={{ display: 'flex', background: '#fff', borderRadius: '16px', padding: '4px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div onClick={() => setDeliveryType('delivery')} style={{ flex: 1, textAlign: 'center', padding: '14px', background: deliveryType === 'delivery' ? '#1E293B' : 'transparent', color: deliveryType === 'delivery' ? '#fff' : '#64748B', borderRadius: '12px', fontWeight: 900, transition: 'all 0.2s', fontSize: '1rem' }}>外卖到家</div>
            <div onClick={() => setDeliveryType('pickup')} style={{ flex: 1, textAlign: 'center', padding: '14px', background: deliveryType === 'pickup' ? '#1E293B' : 'transparent', color: deliveryType === 'pickup' ? '#fff' : '#64748B', borderRadius: '12px', fontWeight: 900, transition: 'all 0.2s', fontSize: '1rem' }}>到店自取</div>
          </div>

          {/* 地址卡片 */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 950, marginBottom: '8px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {deliveryType === 'delivery' ? '河北科技学院图书馆9楼东' : '宠爱之城动物医院 (高新总店)'} <Icons.ChevronRight size={18} color="#94A3B8" />
            </div>
            {deliveryType === 'delivery' && (
              <div style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 500 }}>
                {localStorage.getItem('profile_name') || '用户'} · {localStorage.getItem('userPhone') || '155****0000'}
              </div>
            )}
          </div>

          {/* 订单明细卡片 */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Store size={16} color="#64748B" /> {deliveryType === 'pickup' ? '到店自取明细' : '宠爱大药房配送订单'}
            </h3>
            
            {Object.entries(cart).map(([id, qty]) => {
              const drug = ALL_DRUGS.find(d => d.id === Number(id));
              if (!drug) return null;
              return (
                <div key={id} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '64px', height: '64px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>{drug.img}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B' }}>{drug.name}</div>
                    <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '6px' }}>规格: {drug.spec} x {qty}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1E293B' }}>¥{((drug.price * qty) / 100).toFixed(2)}</div>
                </div>
              );
            })}

            {/* 费用列项 */}
            {deliveryType === 'delivery' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#64748B', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>打包及配送费 <Icons.HelpCircle size={12} /></span>
                <span style={{ fontWeight: 800, color: '#1E293B' }}>¥{packageFee.toFixed(2)}</span>
              </div>
            )}
            
            {currentLevel.discount < 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag color={currentLevel.color} plain style={{ fontWeight: 800 }}>{currentLevel.name}专享 {(currentLevel.discount * 10).toFixed(1)}折</Tag>
                </span>
                <span style={{ color: '#EF4444', fontWeight: 800 }}>- ¥{savedByVIP.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #E2E8F0', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ color: '#64748B', fontSize: '0.9rem' }}>平台红包券</span>
              {availableCoupons.length > 1 ? (
                <select 
                  value={activeCoupon.id} 
                  onChange={e => setSelectedCouponId(Number(e.target.value))}
                  style={{ border: 'none', background: '#FEF2F2', color: '#EF4444', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, outline: 'none', appearance: 'none', textAlign: 'right' }}
                >
                  {availableCoupons.map(c => (
                    <option key={c.id} value={c.id}>{c.title} {c.value > 0 ? `-¥${c.value}` : ''}</option>
                  ))}
                </select>
              ) : (
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>暂无可用券</span>
              )}
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#64748B' }}>
              共需支付 <span style={{ fontSize: '1.35rem', fontWeight: 950, color: '#1E293B', marginLeft: '4px' }}>¥{finalYuan.toFixed(2)}</span>
            </div>
          </div>

          <p style={{ fontWeight: 900, color: '#1E293B', margin: '0 0 12px 4px', fontSize: '0.95rem' }}>选择支付方式</p>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '8px 16px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            {PAY_METHODS.map((m, idx) => {
              const isBalance = m.id === 'balance';
              const balanceEnough = balance >= finalYuan;
              const disabled = isBalance && !balanceEnough;
              const desc = isBalance ? `余额 ¥${balance.toFixed(2)}${!balanceEnough ? ' (不足)' : ''}` : m.desc;

              return (
                <div
                  key={m.id}
                  onClick={() => !disabled && setPayMethod(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0',
                    borderBottom: idx === PAY_METHODS.length - 1 ? 'none' : '1px solid #F1F5F9',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {m.icon === '💬' ? <Icons.MessageCircle size={22} color={m.color} /> : 
                   m.icon === '🔷' ? <Icons.ShieldCheck size={22} color={m.color} /> :
                   m.icon === '💳' ? <Icons.Wallet size={22} color={m.color} /> :
                   m.icon === '⚡' ? <Icons.Zap size={22} color={m.color} /> :
                   m.icon === '🏦' ? <Icons.Landmark size={22} color={m.color} /> :
                   <Icons.CreditCard size={22} color={m.color} />}
                  
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: disabled ? '#94A3B8' : '#1E293B' }}>{m.label}</p>
                    {desc && <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>{desc}</p>}
                  </div>
                  
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: payMethod === m.id && !disabled ? 'none' : '2px solid #E2E8F0', background: payMethod === m.id && !disabled ? '#FF6B00' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {payMethod === m.id && !disabled && <Icons.Check size={14} color="#fff" strokeWidth={4} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部悬浮算账栏 */}
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
             <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>合计</span>
             <span style={{ fontSize: '1.4rem', color: '#FF6B00', fontWeight: 950 }}>¥{finalYuan.toFixed(2)}</span>
             {(savedByVIP + activeCoupon.value) > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#EF4444', marginLeft: '6px', fontWeight: 800 }}>
                  已优惠 ¥{(savedByVIP + activeCoupon.value).toFixed(2)}
                </span>
             )}
           </div>
           <Button round loading={isPaying} style={{ height: '44px', width: '130px', fontSize: '1rem', fontWeight: 900, background: '#FF6B00', color: '#fff', border: 'none' }} onClick={confirmPay}>
             立即支付
           </Button>
        </div>
      </Popup>
    </div>
  );
}
