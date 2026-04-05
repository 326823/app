import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Space, Card, Tag, Search, Loading, NavBar, Empty, Divider } from 'react-vant';
import * as Icons from 'lucide-react';

const API_EMR = 'https://houduan-hlb1.onrender.com/medical_records';

export default function MedicalRecordsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
        setLoading(false);
        return;
    }

    // 查询关联了当前手机号的病历
    fetch(`${API_EMR}?ownerPhone=${phone}&_sort=createdAt&_order=desc`)
      .then(res => res.json())
      .then(data => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredRecords = records.filter(r => 
    r.petName?.includes(searchText) || r.assessment?.includes(searchText)
  );

  return (
    <div className="medical-records-page animate-fade-in" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <NavBar 
        title="我的诊疗报告" 
        onClickLeft={() => navigate('/')}
        leftText={<Icons.ChevronLeft size={24} />}
        placeholder
        fixed
      />

      <div style={{ padding: '16px', background: '#fff' }}>
        <Search 
          shape="round" 
          placeholder="搜索宠物名、诊断关键词" 
          value={searchText}
          onChange={setSearchText}
        />
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ padding: '100px 0', textAlign: 'center' }}><Loading type="spinner">正在加载病历...</Loading></div>
        ) : filteredRecords.length === 0 ? (
          <Empty description="暂无诊疗记录" />
        ) : (
          <Space direction="vertical" block gap={16}>
            {filteredRecords.map((record) => (
              <Card 
                key={record.id} 
                onClick={() => navigate(`/medical-record/${record.id}`)}
                round 
                style={{ border: '1px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: 0 }}
              >
                  {/* Header Area */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800 }}>{record.petName}</span>
                        <Tag type="primary" plain round size="medium" style={{ fontSize: '0.65rem' }}>第 {record.visitNo} 次就诊</Tag>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{new Date(record.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Body Area */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#1E293B', fontWeight: 700 }}>
                            诊断建议：{record.assessment || '见详细报告'}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                            治疗计划：{record.plan || '--'}
                        </p>
                    </div>
                  </div>

                  {/* Footer Area */}
                  <div style={{ textAlign: 'right', padding: '8px 16px', borderTop: '1px solid #F8FAFC' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6366F1', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        查看 SOAP 详情 <Icons.ChevronRight size={14} />
                    </span>
                  </div>
              </Card>
            ))}
          </Space>
        )}
      </div>
      
      <Divider style={{ margin: '40px 0', color: '#E2E8F0', padding: '0 24px' }}>由 宠爱之城 HIS 平台提供报告存储</Divider>
    </div>
  );
}
