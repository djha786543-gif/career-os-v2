import React from 'react';
import Link from 'next/link';
import { useProfile, ProfileId } from '../context/ProfileContext';

export type TabId =
  | 'heatmap'
  | 'skill-engine'
  | 'cert-vault'
  | 'learning-tracks'
  | 'trend-radar'
  | 'prep-vault'
  | 'job-hub'
  | 'tracker'
  | 'opportunity-monitor'
  | 'skill-gaps';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'heatmap',         icon: '📡', label: 'Market Heatmap'  },
  { id: 'skill-engine',    icon: '🤖', label: 'AI Skill Engine' },
  { id: 'cert-vault',      icon: '🏆', label: 'Cert Vault'      },
  { id: 'learning-tracks', icon: '📚', label: 'Learning Tracks' },
  { id: 'trend-radar',     icon: '📈', label: 'Trend Radar'     },
  { id: 'prep-vault',      icon: '📖', label: 'Prep Vault'      },
  { id: 'job-hub',         icon: '💼', label: 'Job Hub'         },
  { id: 'tracker',         icon: '📋', label: 'Tracker'         },
  { id: 'opportunity-monitor', icon: '🔬', label: 'Opportunity Monitor' },
  { id: 'skill-gaps',          icon: '🧠', label: 'Skill Gaps'          },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export function AppLayout({ activeTab, onTabChange, children }: Props) {
  const { profile: activeProfile, setProfile, metadata } = useProfile();

  return (
    <div className={`app-root ${activeProfile === 'dj' ? 'theme-dj' : 'theme-pooja'}`}>
      <div className="amb">
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
      </div>

      <header className="app-header">
        {/* Top row: brand + profile switch + avatar */}
        <div className="header-top">
          <div style={styles.brand}>CareerOS</div>

          <div style={styles.profileSwitch}>
            <button
              onClick={() => setProfile('dj')}
              style={{
                ...styles.psw,
                background: activeProfile === 'dj' ? '#FDE68A' : 'transparent',
                color: activeProfile === 'dj' ? '#92400E' : '#78716C',
                border: '1px solid ' + (activeProfile === 'dj' ? '#D97706' : 'rgba(0,0,0,0.1)'),
                fontWeight: activeProfile === 'dj' ? 900 : 700,
              }}
            >⚡ DJ</button>
            <button
              onClick={() => setProfile('pooja')}
              style={{
                ...styles.psw,
                background: activeProfile === 'pooja' ? '#FCE7F3' : 'transparent',
                color: activeProfile === 'pooja' ? '#9D174D' : '#78716C',
                border: '1px solid ' + (activeProfile === 'pooja' ? '#DB2777' : 'rgba(0,0,0,0.1)'),
                fontWeight: activeProfile === 'pooja' ? 900 : 700,
              }}
            >🔬 POOJA</button>
          </div>

          <div className="user-pill-desktop">
            <div style={{ ...styles.avatar, background: metadata.color, color: '#000' }}>
              {metadata.initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={styles.userName}>{metadata.name}</div>
              <div style={styles.userTitle}>{metadata.role}</div>
            </div>
          </div>
        </div>

        {/* Tab strip — horizontally scrollable on mobile */}
        <nav className="tab-strip">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab-btn${activeTab === tab.id ? ' tab-active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          <Link href="/india-portal" className="tab-btn">
            <span>🇮🇳</span><span>India PhD Portal</span>
          </Link>
        </nav>
      </header>

      <main className="app-main">
        <div className="app-wrap">
          {children}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  brand: {
    fontSize:      15,
    fontWeight:    900,
    letterSpacing: '0.08em',
    color:         '#1C1917',
    flexShrink:    0,
    whiteSpace:    'nowrap',
  },
  profileSwitch: {
    display:    'flex',
    gap:        6,
    background: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding:    3,
    border:     '1px solid rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  psw: {
    padding:      '5px 12px',
    borderRadius: 7,
    fontSize:     11,
    fontWeight:   800,
    transition:   'all 0.2s ease',
    cursor:       'pointer',
    whiteSpace:   'nowrap',
  },
  avatar: {
    width:          30,
    height:         30,
    borderRadius:   '50%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       11,
    fontWeight:     800,
    flexShrink:     0,
  },
  userName:  { fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: '#1C1917' },
  userTitle: { fontSize: 10, color: '#78716C', whiteSpace: 'nowrap' },
};
