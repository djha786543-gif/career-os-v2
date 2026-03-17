'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useProfile } from '../../context/ProfileContext'
import { api } from '../../config/api'
import { timeAgo, countryFlag, sourceBadgeLabel } from '../../utils/monitorHelpers'

type Sector = 'academia' | 'industry' | 'international' | 'india'
type Region = 'de' | 'ca' | 'sg';

const SECTOR_CONFIG: Record<Sector, { icon: string; label: string; color: string; desc: string }> = {
  academia: { icon: 'ðŸ“', label: 'Academia', color: '#2563eb', desc: 'University, Postdoc, Research Assistant positions' },
  industry: { icon: 'ðŸ°', label: 'Industry', color: '#059669', desc: 'Corporate research and development roles' },
  international: { icon: 'âš§ï¸', label: 'International Orgs', color: '#8b5cf6', desc: 'Positions at CERN, EMBO, NIH, etc.' },
  india: { icon: 'ðŸ‡®ðŸ‡³', label: 'India', color: '#ec4899', desc: 'Top 15 Indian research institutes' }
}

interface SectorStats {
  sector: Sector
  total_jobs: number
  new_jobs: number
  last_detected: string
}

interface GlobalStats {
  last_scan?: string | Date
  sectors: SectorStats[]
}

interface MonitorJob {
  id: string
  title: string
  org_name: string
  location: string
  country: string
  sector: Sector
  apply_url: string
  snippet: string
  posted_date: string
  detected_at: string;
  is_new: boolean;
  api_type?: string;
}


interface MonitorOrg {
  id: string
  name: string
  sector: Sector
  country: string
  total_jobs: number
  new_jobs: number
  last_scanned_at: string
}

export function OpportunityMonitor() {
  const { profile } = useProfile()
  const [activeSector, setActiveSector] = useState<Sector>('academia')
  const [activeRegion, setActiveRegion] = useState<Region>('de')
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [orgs, setOrgs] = useState<MonitorOrg[]>([])
   const [jobs, setJobs] = useState<Record<Sector, Record<Region, MonitorJob[]>>>({
    academia: { de: [], ca: [], sg: [] },
    industry: { de: [], ca: [], sg: [] },
    international: { de: [], ca: [], sg: [] },
    india: { de: [], ca: [], sg: [] }
  });
  const [loading, setLoading] = useState<Record<Sector, Record<Region, boolean>>>({
    academia: { de: true, ca: true, sg: true },
    industry: { de: true, ca: true, sg: true },
    international: { de: true, ca: true, sg: true },
    india: { de: true, ca: true, sg: true }
  });
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newOnly, setNewOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'org'>('newest')
  const [search, setSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [scanInitiated, setScanInitiated] = useState<boolean>(false);
  const fetchData = useCallback(async (silent = false) => {
    const regions: Region[] = ['de', 'ca', 'sg'];
    const sector = activeSector

    if (!silent) {
      setLoading(prev => ({
        ...prev,
        [sector]: { de: true, ca: true, sg: true }
      }));
    }

    try {
  
      const jobsData = await api.get(`/api/monitor/jobs?sectors=${sector}`); // Backend returns jobs for all regions

      setJobs(prev => ({
        ...prev,
        [sector]: {
          de: jobsData[sector]?.de,
          ca: jobsData[sector]?.ca,
          sg: jobsData[sector]?.sg
        }
      }));
   
      setError(null);
    } catch (err) {
      setError('Failed to load monitor data');
    } finally {
      if (!silent) {
        setLoading(prev => ({
          ...prev,
          [sector]: { de: false, ca: false, sg: false }
        }));
      }

    }
  }, [activeSector]);
 
   const filteredJobs = (jobsList: any): MonitorJob[] => {
    console.log('jobsList', jobsList)
    const safeJobs = Array.isArray(jobsList) ? jobsList : [];
    return safeJobs.filter((j: any) => j && (!newOnly || j.is_new))
      .filter((j:any) => j && (!selectedOrg || j.org_name === selectedOrg))
      .filter((j:any) =>
        j && ((j.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (j.org_name || '').toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a:any, b:any) => {
        if (sortBy === 'newest') return (new Date(b?.detected_at || 0)).getTime() - (new Date(a?.detected_at || 0)).getTime()
        if (sortBy === 'oldest') return (new Date(a?.detected_at || 0)).getTime() - (new Date(b?.detected_at || 0)).getTime()
        if (sortBy === 'org') return (a?.org_name || '').localeCompare(b?.org_name || '')
      })
  };
 

  
  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    api.get('/api/monitor/stats')
      .then(res => {
        setStats(res)
     if (res?.last_scan) {
          setLastUpdated(timeAgo(new Date(res.last_scan).toISOString()));
        } else {
          setLastUpdated('Never');
        }

      })
  }, [])

 const [totalJobs, setTotalJobs] = useState<number>(0);
   useEffect(() => {
     const fetchInitialData = async () => {
       try {
         const [orgsResponse, statsResponse] = await Promise.all([
           api.get('/api/monitor/orgs'),
           api.get('/api/monitor/stats')
         ]);
 
         // Setting organizations data
         setOrgs(Array.isArray(orgsResponse) ? orgsResponse : orgsResponse.data || []);
 
         // Calculating and setting total jobs from stats
         const sectors = statsResponse.sectors || [];
         setTotalJobs(sectors.reduce((acc: number, sector: SectorStats) => acc + sector.total_jobs, 0));
       } catch (error) {
         console.error("Error fetching initial data:", error);
       }
     };
 
     fetchInitialData();
   }, []);
 
 
 
 
   if (error) return <div>Error: {error}</div>
 
   const styles = {
     container: {
       padding: '20px',
     },
     header: {
       display: 'flex',
       justifyContent: 'space-between',
       alignItems: 'center',
       marginBottom: '20px',
     },
     title: {
       fontSize: '24px',
       fontWeight: 'bold',
       marginBottom: '5px',
     },
     subtitle: {
       fontSize: '16px',
       color: '#666',
     },
     headerActions: {
       display: 'flex',
       gap: '10px',
       alignItems: 'center'
     },
     updatedBadge: {
       fontSize: '12px',
       color: '#888',
       padding: '5px 10px',
       borderRadius: '5px',
       backgroundColor: '#eee',
     },
     scanButton: {
       backgroundColor: '#4CAF50',
       color: 'white',
       padding: '10px 15px',
       border: 'none',
       borderRadius: '5px',
       cursor: 'pointer',
     },
     sectorTabs: {
       display: 'flex',
       marginBottom: '20px',
     },
     sectorTab: {
       padding: '10px 15px',
       border: '1px solid #ccc',
       cursor: 'pointer',
       backgroundColor: '#f9f9f9',
     },
     activeSectorTab: {
       backgroundColor: '#4CAF50',
       color: 'white',
     },
     regionTabs: {
       display: 'flex',
       marginBottom: '20px',
     },
     regionTab: {
       padding: '10px 15px',
       border: '1px solid #ccc',
       cursor: 'pointer',
       backgroundColor: '#f9f9f9',
     },
     activeRegionTab: {
       backgroundColor: '#4CAF50',
       color: 'white',
     },
     filters: {
       display: 'flex',
       gap: '10px',
       marginBottom: '20px',
       alignItems: 'center'
     },
     jobList: {
       listStyle: 'none',
       padding: 0,
     },
     jobItem: {
       border: '1px solid #ccc',
       borderRadius: '5px',
       padding: '10px',
       marginBottom: '10px',
     },
    }
 
   return (
     <div style={styles.container}>
       <header style={styles.header}>
         <div>
          <h1 style={styles.title}>What's up, Opportunity Monitor</h1>
           <p style={styles.subtitle}>Real-time job alerts</p>
         </div>
         <div style={styles.headerActions}>
           {lastUpdated && <span style={styles.updatedBadge}>Updated {lastUpdated}</span>}
         {scanInitiated && <span style={styles.updatedBadge}>{'Scan initiated for 77 organizations...'}</span>}
          <button style={styles.scanButton} onClick={() => {
   setScanning(true);
   setScanInitiated(true);
            api.post('/api/monitor/scan')
              .then(() => {
                fetchData()
                api.get('/api/monitor/stats')
                  .then(res => {
                    setStats(res)
  
                    setLastUpdated(timeAgo(new Date(res?.last_scan).toISOString()))
                  })
       
                setScanning(false)
       setScanInitiated(false);
              })
      
          }} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
  
        </div>
      </header>

      <div style={styles.sectorTabs}>
  {Object.entries(SECTOR_CONFIG).map(([key, sector]) => (
          <div
            key={key}
   style={{ ...styles.sectorTab, ...(activeSector === key ? styles.activeSectorTab : {}) }}
            onClick={() => setActiveSector(key as Sector)}

          >
            {sector.label}
          </div>
        ))}
       </div>


      <div style={styles.regionTabs}>
        {['de', 'ca', 'sg'].map(region => (
          <div
            key={region}
            style={{ ...styles.regionTab, ...(activeRegion === region ? styles.activeRegionTab : {}) }}

            onClick={() => setActiveRegion(region as Region)}

          >
            {region.toUpperCase()}
          </div>
        ))}
       </div>
  


      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Filter by title or organization"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
    
        <select value={selectedOrg || ''} onChange={(e) => setSelectedOrg(e.target.value === '' ? null : e.target.value)}>
         <option value="">All Organizations</option>
          {Array.isArray(orgs) ? orgs.map(org => (
            <option key={org.id} value={org.name}>{org.name}</option>

          )) : null}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        <label>
          <input type="checkbox" checked={newOnly} onChange={e => setNewOnly(e.target.checked)} />
          New Only
        </label>
      </div>

      <h2>{SECTOR_CONFIG[activeSector].label} ({SECTOR_CONFIG[activeSector].desc})</h2>
      <ul style={styles.jobList}>
           {/* Show 'No jobs found' message if no jobs are available */}
        {loading[activeSector][activeRegion] ? (
          <li>Loading jobs...</li>
        ) : (
          filteredJobs(jobs[activeSector][activeRegion] || []).map(job => (
            <li key={job.id} style={styles.jobItem}>
              <h3>{job.title}</h3>
              <p>{job.org_name} - {job.location} ({countryFlag(job.country)})</p>
              <p>{job.snippet}</p>
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">Apply Here</a>
              <p>Date detected: {timeAgo(job.detected_at)}</p>
              {job.api_type && <p>Source: {sourceBadgeLabel(job.api_type)}</p>}
            </li>
          ))
        )}
      </ul>

   {/* Show 'No jobs found' message if no jobs are available */}
        {filteredJobs(jobs[activeSector][activeRegion] || []).length === 0 && !loading[activeSector][activeRegion] && (
          <li>No jobs found. Try clicking Scan to fetch the latest research roles from Adzuna.</li>
        )}
    
}
     </div>
   );
};

export default OpportunityMonitor;
