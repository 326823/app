import { Search, MapPin, Tag, Flame } from 'lucide-react';
import { Badge, Tag as VantTag, Search as VantSearch, Divider } from 'react-vant';

export default function DiscoveryPage() {
  return (
    <div className="page-content animate-fade-in" style={{ padding: '16px' }}>
      <div className="discovery-header" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '16px' }}>发现宠爱</h2>
          <VantSearch shape="round" placeholder="搜索附近的宠物店、医院或服务" />
      </div>

      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 900, marginBottom: '16px' }}>
          <Flame size={20} color="#EF4444" /> 热门推荐
      </div>

      <div className="discovery-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
              { title: '春季驱虫全攻略', tag: '百科', img: '🦗' },
              { title: '金毛洗护优惠券', tag: '活动', img: '🎫' },
              { title: '附近医生在线坐诊', tag: '服务', img: '🩺' },
              { title: '如何挑选优质猫粮', tag: '知识', img: '🐱' },
          ].map((item, i) => (
              <div key={i} style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{item.img}</div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>{item.title}</h4>
                  <VantTag plain type='primary' size='medium'>{item.tag}</VantTag>
              </div>
          ))}
      </div>

      <Divider style={{ margin: '40px 0' }}>更多精彩内容由 宠爱之城 提供</Divider>
    </div>
  );
}
