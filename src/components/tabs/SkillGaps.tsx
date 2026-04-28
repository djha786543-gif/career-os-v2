import React from 'react';
import { useProfile } from '../../context/ProfileContext';

export const SkillGaps: React.FC = () => {
  const { profile } = useProfile();
  const src = profile === 'dj'
    ? '/skill_gaps_ranked_2026.html'
    : '/skill_gaps_pooja_2026.html';

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: profile === 'dj' ? '#22d3ee' : '#f472b6' }}>
            Skill Gap Intelligence
          </h2>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0 0' }}>
            {profile === 'dj' ? 'DJ · IT Audit / Cloud Risk / GRC' : 'Pooja · Life Sciences / Cardiovascular Research'}
            &nbsp;&middot;&nbsp;Refreshes every Wednesday
          </p>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11, fontWeight: 700, padding: '6px 14px',
            background: 'rgba(0,0,0,0.04)', color: '#44403C',
            border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6,
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          Open full page ↗
        </a>
      </div>
      <iframe
        src={src}
        title="Skill Gap Intelligence"
        style={{
          flex: 1,
          width: '100%',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          background: '#fff',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default SkillGaps;
