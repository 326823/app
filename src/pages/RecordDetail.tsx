import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Space, Tag, Loading, NavBar, Empty, Divider, Typography } from 'react-vant';
import * as Icons from 'lucide-react';

const API_EMR = 'http://localhost:5000/medical_records';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_EMR}/${id}`)
      .then(res => res.json())
      .then(data => {
        setRecord(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '100px 0', textAlign: 'center' }}><Loading type="spinner" vertical>诊疗细节加载中...</Loading></div>;
  if (!record) return <Empty description="未找到诊疗详细信息" />;

  return (
    <div className="medical-record-detail animate-fade-in" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <NavBar 
        title={`诊疗报告详情`} 
        onClickLeft={() => navigate(-1)}
        leftText={<Icons.ChevronLeft size={24} />}
        placeholder
        border={false}
        fixed
      />

      {/* 📊 基本摘要 */}
      <div style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', padding: '32px 24px', color: '#fff' }}>
          <Space align='center' gap={16}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🐶</div>
              <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{record.petName}</h2>
                  <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.85rem' }}>{new Date(record.createdAt).toLocaleString()} · 第 {record.visitNo} 次就诊</p>
              </div>
          </Space>
      </div>

      <div style={{ padding: '24px 16px' }}>
          <Space direction='vertical' gap={24} block>
              {/* 标准 SOAP 板块 */}
              <div className="soap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {[
                  { key: 'S', title: '主观叙述 (Subjective)', content: record.subjective || '暂无描述', icon: <Icons.FileText color="#6366F1" />, bg: '#EEF2FF', border: '#C7D2FE' },
                  { key: 'O', title: '客观检查 (Objective)', content: record.objective || '暂无描述', icon: <Icons.Activity color="#10B981" />, bg: '#F0FDF4', border: '#BBF7D0' },
                  { key: 'A', title: '诊断结果 (Assessment)', content: record.assessment || '见化验单', icon: <Icons.Stethoscope color="#F59E0B" />, bg: '#FFFBEB', border: '#FEF3C7' },
                  { key: 'P', title: '治疗方案 (Plan)', content: record.plan || '暂无治疗计划', icon: <Icons.Syringe color="#EF4444" />, bg: '#FEF2F2', border: '#FECACA' }
                ].map(item => (
                  <div key={item.key} style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: `1px solid ${item.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: item.bg, padding: '10px', borderRadius: '14px' }}>{item.icon}</div>
                      <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#1E293B' }}>{item.title}</h4>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, paddingLeft: '4px', whiteSpace: 'pre-wrap' }}>
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* 💊 处方清单 (如果有) */}
              {record.prescriptions?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #E2E8F0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '14px' }}><Icons.Pill color="#4338CA" /></div>
                    <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#1E293B' }}>用药处方 (Prescription)</h4>
                   </div>
                   {record.prescriptions.map((p: any) => (
                     <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div>
                           <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{p.med.name}</p>
                           <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>{p.med.category}</p>
                        </div>
                        <span style={{ fontWeight: 800, color: '#6366F1' }}>× {p.amount} {p.med.unit}</span>
                     </div>
                   ))}
                </div>
              )}
          </Space>
      </div>

      <Divider style={{ margin: '40px 0', color: '#E2E8F0', padding: '0 24px', fontSize: '0.75rem' }}>报告由深圳中心院主诊医师审核发布</Divider>
    </div>
  );
}
