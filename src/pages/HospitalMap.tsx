import { useState } from 'react';
import { Search, Cell, List, Tag, Toast, NavBar, Space } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';

const HOSPITALS = [
  { id: 1, name: '深圳中心院 (总院)', address: '深圳市南山区科技路 88 号', distance: '1.2km', tags: ['24H', '医保'], status: '推荐' },
  { id: 2, name: '福田区分院', address: '深圳市福田区深南大道 1002 号', distance: '5.6km', tags: ['猫专科'], status: '' },
  { id: 3, name: '龙岗大运分院', address: '深圳市龙岗区大运中心路', distance: '18.2km', tags: ['犬专科', '手术中心'], status: '' },
  { id: 4, name: '宝安中心分院', address: '深圳市宝安区创业一路', distance: '22.0km', tags: ['24H'], status: '' },
];

export default function HospitalMapPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  
  const handleSelect = (name: string) => {
    localStorage.setItem('selectedHospital', name);
    Toast.success(`已切换至：${name}`);
    setTimeout(() => navigate('/'), 800);
  };

  return (
    <div className="hospital-map-page animate-fade-in" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <NavBar 
        title="选择就诊院区" 
        onClickLeft={() => navigate('/')}
        leftText={<Icons.ChevronLeft size={24} />}
        placeholder
        fixed
      />

      <div style={{ padding: '16px', background: '#fff' }}>
          <Search 
            shape="round" 
            placeholder="搜索院区名称或关键字" 
            value={searchText}
            onChange={setSearchText}
          />
      </div>

      {/* 🗺️ 地图示意图 (Mock Map View) - 对应高精地图接入的前置逻辑 */}
      <div style={{ position: 'relative', height: '220px', background: '#E2E8F0', overflow: 'hidden' }}>
          {/* 这里可以使用真实的百度/高德静态地图 API，或者自定义 CSS 模拟地图 */}
          <div style={{ width: '100%', height: '100%', backgroundSize: 'cover', backgroundImage: 'url("https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1000")' }}>
              {/* Map Pins (Simulated) */}
              <div style={{ position: 'absolute', top: '40%', left: '30%', color: '#6366F1' }}><Icons.MapPin fill="#6366F1" color="#fff" size={32} /></div>
              <div style={{ position: 'absolute', top: '60%', left: '70%', color: '#94A3B8' }}><Icons.MapPin fill="#94A3B8" color="#fff" size={24} /></div>
          </div>
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
              实时定位：南山区科技园
          </div>
      </div>

      <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '16px' }}>附近院区</h3>
          
          <Space direction='vertical' gap={16} block>
            {HOSPITALS.map((h) => (
                <div 
                    key={h.id} 
                    onClick={() => handleSelect(h.name)}
                    style={{ 
                        background: '#fff', 
                        borderRadius: '20px', 
                        padding: '16px', 
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{h.name}</h4>
                        <span style={{ fontSize: '0.85rem', color: '#6366F1', fontWeight: 600 }}>{h.distance}</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94A3B8' }}>{h.address}</p>
                    <Space gap={8}>
                        {h.tags.map((t, idx) => <Tag size='medium' round key={idx} plain type='primary' style={{ fontSize: '0.65rem' }}>{t}</Tag>)}
                        {h.status && <Tag size='medium' round type='danger' style={{ fontSize: '0.65rem' }}>{h.status}</Tag>}
                    </Space>
                </div>
            ))}
          </Space>
      </div>
    </div>
  );
}
