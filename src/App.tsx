import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Tabbar, NavBar, ConfigProvider } from 'react-vant';
import * as Icons from 'lucide-react';

// Pages
import HomePage from './pages/Home';
import AppointmentPage from './pages/Appointment';
import PharmacyPage from './pages/Pharmacy';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import DiscoveryPage from './pages/Discovery';
import HospitalMapPage from './pages/HospitalMap';
import MedicalRecordsPage from './pages/MedicalRecords';
import RecordDetailPage from './pages/RecordDetail';

// Components
import AuthGuard from './components/AuthGuard';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  
  useEffect(() => {
    setActive(location.pathname);
  }, [location.pathname]);

  const isLoginPage = location.pathname === '/login';

  // 核心底部 Tab，这些不显示独立返回键（除买药外，按照用户习惯放开）
  const noBackBtnPages = ['/', '/profile', '/search', '/appointment'];
  const showBack = !noBackBtnPages.includes(location.pathname);

  const getTitle = () => {
    const titles: Record<string, string> = {
      '/': '首页看板',
      '/login': '用户登录',
      '/search': '发现宠爱',
      '/appointment': '预约挂号',
      '/pharmacy': '宠爱药房',
      '/profile': '个人中心'
    };
    return titles[location.pathname] || '宠爱之城';
  };

  return (
    <div className="mobile-container">
      {!isLoginPage && (
        <NavBar 
          title={getTitle()} 
          fixed 
          placeholder 
          border={false}
          leftArrow={false}
          leftText={showBack ? <Icons.ChevronLeft size={24} color="#1E293B" /> : ''}
          onClickLeft={() => showBack && navigate(-1)}
          className="custom-nav"
        />
      )}
      
      <main className="main-scroll" style={{ paddingBottom: isLoginPage ? 0 : '80px' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
          <Route path="/search" element={<AuthGuard><DiscoveryPage /></AuthGuard>} />
          <Route path="/appointment" element={<AuthGuard><AppointmentPage /></AuthGuard>} />
          <Route path="/pharmacy" element={<AuthGuard><PharmacyPage /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
          <Route path="/hospital-map" element={<AuthGuard><HospitalMapPage /></AuthGuard>} />
          <Route path="/medical-records" element={<AuthGuard><MedicalRecordsPage /></AuthGuard>} />
          <Route path="/medical-record/:id" element={<AuthGuard><RecordDetailPage /></AuthGuard>} />
        </Routes>
      </main>

      {!isLoginPage && (
        <Tabbar 
          value={active} 
          onChange={v => navigate(v as string)}
          fixed
          placeholder
          className="custom-tabbar"
        >
          <Tabbar.Item name="/" icon={<Icons.Home size={20} />}>首页</Tabbar.Item>
          <Tabbar.Item name="/search" icon={<Icons.Search size={20} />}>发现</Tabbar.Item>
          <Tabbar.Item name="/pharmacy" icon={<Icons.Pill size={20} />}>购药</Tabbar.Item>
          <Tabbar.Item name="/appointment" icon={<Icons.Calendar size={20} />}>预约</Tabbar.Item>
          <Tabbar.Item name="/profile" icon={<Icons.User size={20} />}>我的</Tabbar.Item>
        </Tabbar>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider themeVars={{ primaryColor: '#6366F1' }}>
      <Router>
        <AppLayout />
      </Router>
    </ConfigProvider>
  );
}
