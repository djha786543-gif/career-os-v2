import cron from 'node-cron'
import { runFullScan, seedOrgs } from './monitorEngine'
import { runFullScanDJ, seedOrgsDJ } from './monitorEngineDJ'

export async function initMonitorScheduler(): Promise<void> {
  // Seed orgs on startup (Pooja + DJ)
  try {
    await seedOrgs()
  } catch (err) {
    console.error('[Monitor] Pooja seed error:', (err as Error).message)
  }

  try {
    await seedOrgsDJ()
  } catch (err) {
    console.error('[MonitorDJ] DJ seed error:', (err as Error).message)
  }

  // Pooja: once daily at 08:00 UTC
  cron.schedule('0 8 * * *', async () => {
    console.log('[Monitor] Pooja cron triggered at', new Date().toISOString())
    try {
      await runFullScan()
    } catch (err) {
      console.error('[Monitor] Pooja cron scan error:', (err as Error).message)
    }
  })

  // DJ: once daily at 08:30 UTC (offset to avoid API rate limits)
  cron.schedule('30 8 * * *', async () => {
    console.log('[MonitorDJ] DJ cron triggered at', new Date().toISOString())
    try {
      await runFullScanDJ()
    } catch (err) {
      console.error('[MonitorDJ] DJ cron scan error:', (err as Error).message)
    }
  })

  console.log('[Monitor] Scheduler ready — Pooja @ 08:00 UTC, DJ @ 08:30 UTC (daily)')
}
