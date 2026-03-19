import React, { useState } from 'react';
import { AppLayout, TabId } from '../src/components/AppLayout';
import { JobHub }               from '../src/components/tabs/JobHub';
import { PrepVault }            from '../src/components/tabs/PrepVault';
import { MarketHeatmap }        from '../src/components/tabs/MarketHeatmap';
import { SkillEngine }          from '../src/components/tabs/SkillEngine';
import { CertVault }            from '../src/components/tabs/CertVault';
import { TrendRadar }           from '../src/components/tabs/TrendRadar';
import { Tracker }              from '../src/components/tabs/Tracker';
import { LearningTracks }       from '../src/components/tabs/LearningTracks';
import { OpportunityMonitor }   from '../src/components/tabs/OpportunityMonitor';
import { OpportunityMonitorDJ } from '../src/components/tabs/OpportunityMonitorDJ';
import { useProfile }           from '../src/context/ProfileContext';

// Profile-aware wrapper: renders DJ or Pooja monitor based on active profile.
// Must be a component (not JSX in a static record) so useProfile hook works.
function MonitorTabWrapper() {
  const { profile } = useProfile();
  return profile === 'dj' ? <OpportunityMonitorDJ /> : <OpportunityMonitor />;
}

// Static tab views — everything except opportunity-monitor (handled by wrapper above)
const STATIC_TABS: Partial<Record<TabId, React.ReactElement>> = {
  'heatmap':         <MarketHeatmap />,
  'skill-engine':    <SkillEngine />,
  'cert-vault':      <CertVault />,
  'learning-tracks': <LearningTracks />,
  'trend-radar':     <TrendRadar />,
  'prep-vault':      <PrepVault />,
  'job-hub':         <JobHub />,
  'tracker':         <Tracker />,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('heatmap');
  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'opportunity-monitor'
        ? <MonitorTabWrapper />
        : (STATIC_TABS[activeTab] ?? null)}
    </AppLayout>
  );
}
