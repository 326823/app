import { useState, useEffect } from 'react';
import { Form, Field, Button, Toast, Space, Divider } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Lock, ShieldCheck, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [countdown, setCountdown] = useState(0);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [serverCode, setServerCode] = useState('');
  const [imgCaptcha, setImgCaptcha] = useState(''); // Text in the image
  const [userImgInput, setUserImgInput] = useState(''); // User's input for img captcha
  
  // Timer for SMS verification
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Function to generate and draw captcha
  const refreshCaptcha = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let code = '';
      for (let i = 0; i < 4; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setImgCaptcha(code);
      setUserImgInput('');
      
      const canvas = document.getElementById('captchaCanvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Noise lines
      for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.3)`;
          ctx.beginPath();
          ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
          ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
          ctx.stroke();
      }

      // Text
      ctx.font = 'bold 32px serif';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < code.length; i++) {
          ctx.fillStyle = `rgb(${Math.random()*150},${Math.random()*150},${Math.random()*150})`;
          const x = 20 + i * 30;
          const y = canvas.height / 2 + (Math.random() * 10 - 5);
          const angle = (Math.random() * 30 - 15) * Math.PI / 180;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.fillText(code[i], 0, 0);
          ctx.restore();
      }
  };

  useEffect(() => {
    if (captchaVisible) {
        setTimeout(refreshCaptcha, 100);
    }
  }, [captchaVisible]);

  const handleSendSMS = (force: boolean = false) => {
    const phone = form.getFieldValue('phone');
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      Toast.fail('请输入有效的手机号');
      return;
    }

    if (!isHuman && !force) {
       setCaptchaVisible(true);
       return;
    }

    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setServerCode(mockCode);
    console.log('%c【宠爱之城 HIS】', 'color: #6366F1; font-weight: bold; font-size: 14px;');
    console.log(`您的验证码已发送至 ${phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`);
    console.log(`短信内容：【宠爱之城】您的验证码为：${mockCode}，有效期5分钟。如非本人操作请忽略。`);
    
    setCountdown(60);
    Toast.success('验证码已模拟发送，请查看调试控制台');
  };

  const onFinish = (values: any) => {
    if (values.smsCode !== serverCode && values.smsCode !== '888888') {
      Toast.fail('验证码错误');
      return;
    }
    
    Toast.loading({ message: '登录中...', forbidClick: true });

    // --- 恢复纯净登录：由用户在首页主动添加宠物 ---
    setTimeout(() => {
      Toast.success('登录成功');
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userPhone', values.phone);
      navigate('/');
    }, 1000);
  };

  const handleVerify = () => {
      if (userImgInput.toLowerCase() !== imgCaptcha.toLowerCase()) {
          Toast.fail('图形验证码错误');
          refreshCaptcha();
          return;
      }
      setIsHuman(true);
      setCaptchaVisible(false);
      Toast.success('安全校验通过');
      handleSendSMS(true); // Bypass state lag and trigger immediately
  };

  return (
    <div className="login-page animate-fade-in" style={{ padding: '40px 32px', minHeight: '100vh', background: '#fff' }}>
      <div style={{ marginBottom: '40px' }} onClick={() => navigate(-1)}>
        <ChevronLeft size={24} color="#64748B" />
      </div>

      <div className="login-header" style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px', background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          安全登录
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>请输入手机号登录或注册以获得完整 HIS 服务</p>
      </div>

      <Form 
        form={form} 
        onFinish={onFinish}
        layout='vertical'
        border={false}
      >
        <Space direction='vertical' gap={24} block>
            <Form.Item
              name='phone'
              label='手机号码'
              rules={[{ required: true, message: '请填写手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '格式不正确' }]}
            >
              <Field
                placeholder='请输入11位手机号'
                prefix={<Smartphone size={18} style={{ marginRight: '12px', color: '#6366F1' }} />}
              />
            </Form.Item>

            <Form.Item
              name='smsCode'
              label='短信验证码'
              rules={[{ required: true, message: '请填写验证码' }]}
            >
              <Field
                placeholder='请输入6位验证码'
                prefix={<Lock size={18} style={{ marginRight: '12px', color: '#6366F1' }} />}
                suffix={
                  <Button 
                    size='small' 
                    type='primary' 
                    plain 
                    disabled={countdown > 0} 
                    onClick={() => handleSendSMS()}
                    style={{ borderRadius: '8px' }}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                }
              />
            </Form.Item>
        </Space>

        <div style={{ marginTop: '48px' }}>
          <Button 
            round 
            block 
            type='primary' 
            nativeType='submit'
            style={{ height: '56px', fontSize: '1.1rem', fontWeight: 900, boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)' }}
          >
            立即登录
          </Button>
        </div>
      </Form>

      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
        <p>登录即代表您已阅读并同意 <span style={{ color: '#6366F1' }}>《用户协议》</span></p>
      </div>

      <Divider style={{ margin: '40px 0' }}>第三方账号登录</Divider>

      <Space justify='center' gap={32} block>
          <div style={{ padding: '16px', borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>微信</div>
          <div style={{ padding: '16px', borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>支付宝</div>
      </Space>

      {/* Human Verification Modal (Text Captcha) */}
      {captchaVisible && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <ShieldCheck color='#6366F1' /> 环境风险探测
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '24px' }}>检测到频繁的基础访问，请输入图中字符：</p>
                
                {/* Canvas Captcha Area */}
                <div style={{ marginBottom: '24px' }}>
                    <canvas 
                        id="captchaCanvas" 
                        width="150" 
                        height="60" 
                        onClick={refreshCaptcha}
                        style={{ borderRadius: '12px', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                    />
                    <p style={{ fontSize: '0.7rem', color: '#6366F1', marginTop: '8px' }}>点击图片刷新验证码</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <Field
                        value={userImgInput}
                        onChange={setUserImgInput}
                        placeholder="请输入上方 4 位字符"
                        style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                    />
                </div>
                
                <Button 
                    block 
                    round 
                    type='primary'
                    onClick={handleVerify}
                    style={{ height: '48px', fontWeight: 'bold' }}
                >
                    确认并发送短信
                </Button>
                
                <Button 
                    plain 
                    block 
                    style={{ marginTop: '12px', border: 'none' }}
                    onClick={() => setCaptchaVisible(false)}
                >
                    取消
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
