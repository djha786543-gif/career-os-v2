"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMonitorScheduler = initMonitorScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const monitorEngine_1 = require("./monitorEngine");
const monitorEngineDJ_1 = require("./monitorEngineDJ");
async function initMonitorScheduler() {
    // Seed orgs on startup (Pooja + DJ)
    try {
        await (0, monitorEngine_1.seedOrgs)();
    }
    catch (err) {
        console.error('[Monitor] Pooja seed error:', err.message);
    }
    try {
        await (0, monitorEngineDJ_1.seedOrgsDJ)();
    }
    catch (err) {
        console.error('[MonitorDJ] DJ seed error:', err.message);
    }
    // Pooja: once daily at 08:00 UTC
    node_cron_1.default.schedule('0 8 * * *', async () => {
        console.log('[Monitor] Pooja cron triggered at', new Date().toISOString());
        try {
            await (0, monitorEngine_1.runFullScan)();
        }
        catch (err) {
            console.error('[Monitor] Pooja cron scan error:', err.message);
        }
    });
    // DJ: once daily at 08:30 UTC (offset to avoid API rate limits)
    node_cron_1.default.schedule('30 8 * * *', async () => {
        console.log('[MonitorDJ] DJ cron triggered at', new Date().toISOString());
        try {
            await (0, monitorEngineDJ_1.runFullScanDJ)();
        }
        catch (err) {
            console.error('[MonitorDJ] DJ cron scan error:', err.message);
        }
    });
    console.log('[Monitor] Scheduler ready — Pooja @ 08:00 UTC, DJ @ 08:30 UTC (daily)');
}
