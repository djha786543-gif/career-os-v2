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
        setStats(res);
        const rawDate = res?.lastScan || res?.last_scan;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            setLastUpdated(timeAgo(d.toISOString()));
          } else {
            setLastUpdated('Just now');
          }
        } else {
          setLastUpdated('Never');
        }
      })
  }, [])
 
  const [totalJobs, setTotalJobs] = useState<number>(0);
    useEffect(() => {
@@ -358,7 +358,7 @@
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
-          <h1 style={styles.title}>Hey, Opportunity Monitor</h1>
+          <h1 style={styles.title}>Yo, Opportunity Monitor</h1>
             <p style={styles.subtitle}>Real-time job alerts</p>
           </div>
           <div style={styles.headerActions}>

