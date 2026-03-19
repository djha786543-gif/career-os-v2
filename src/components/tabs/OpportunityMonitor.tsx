import React, { useState, useEffect } from 'react';

export const OpportunityMonitor = () => {
  const [activeSector, setActiveSector] = useState('academia');
  const [activeRegion, setActiveRegion] = useState(null); // Null = Show all for sector
  const [jobs, setJobs] = useState([]);
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    try {
      // Step 1: Fetch all jobs for the sector
      const res = await fetch(`http://localhost:8080/api/monitor/jobs?sector=${activeSector}`);
      const data = await res.json();
      
      let allJobs = Array.isArray(data) ? data : [];

      // Step 2: Apply Region Filter ONLY if one is selected
      if (activeRegion) {
        allJobs = allJobs.filter(job => 
          job.location?.toUpperCase().includes(activeRegion) || 
          job.organization_name?.toUpperCase().includes(activeRegion)
        );
      }
      
      setJobs(allJobs);
    } catch (err) { console.error("Fetch Error:", err); }
  };

  useEffect(() => { fetchData(); }, [activeSector, activeRegion]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch('http://localhost:8080/api/monitor/scan', { method: 'POST' });
      await fetchData();
    } catch (err) { console.error("Scan Error:", err); }
    setScanning(false);
  };

  return (
    <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0f172a', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Sup, Opportunity Monitor</h1>
        <button onClick={handleScan} disabled={scanning} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {scanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {/* Sectors */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
        {['academia', 'industry', 'international', 'india'].map(s => (
          <button key={s} onClick={() => {setActiveSector(s); setActiveRegion(null);}} style={{ padding: '10px 20px', background: activeSector === s ? '#334155' : '#1e293b', border: '1px solid #334155', color: 'white', cursor: 'pointer', textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Regions (Optional) */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '30px' }}>
        <button onClick={() => setActiveRegion(null)} style={{ padding: '10px 20px', background: !activeRegion ? '#22c55e' : '#1e293b', border: '1px solid #334155', color: 'white', cursor: 'pointer' }}>ALL</button>
        {['DE', 'CA', 'SG'].map(r => (
          <button key={r} onClick={() => setActiveRegion(r)} style={{ padding: '10px 20px', background: activeRegion === r ? '#22c55e' : '#1e293b', border: '1px solid #334155', color: 'white', cursor: 'pointer' }}>
            {r}
          </button>
        ))}
      </div>

      {/* Results Section */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {jobs.length > 0 ? jobs.map((job, idx) => (
          <div key={idx} style={{ padding: '20px', background: '#1e293b', borderRadius: '12px', borderLeft: '4px solid #22c55e' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>{job.title}</h3>
            <p style={{ margin: 0, color: '#94a3b8' }}>{job.organization_name} • <span style={{ color: '#22c55e' }}>{job.location}</span></p>
          </div>
        )) : (
          <div style={{ padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
            No jobs found for {activeSector} {activeRegion ? `in ${activeRegion}` : ''}. <br/>
            <span style={{ fontSize: '12px' }}>Try selecting "ALL" or clicking "Run Scan".</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityMonitor;
