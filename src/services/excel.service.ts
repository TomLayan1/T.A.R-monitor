import type { Station } from '../types/station';
import type { WeeklyLog } from '../types/weekly-log';
import { fullName } from '../types/user';
import { formatMonth, weeksBetween } from '../utils/date';
import { calculateFinancialMonitor } from '../utils/calculations';
import type { MonthlyLog } from '../types/monthly-log';
import { buildFinancialMonitorRows, listMonthlyLogs } from './monthly-log.service';
import { getActor, getScope } from './access';
import { recordAudit } from './audit.service';
import { listReports } from './report.service';
import { bmNameMap, getSessionUsers } from './userService';

const NAIRA_FORMAT = '"₦"#,##0;-"₦"#,##0';
/** Same column order as the Weekly Logs table (the reporting week is the worksheet name). */
const HEADERS = [
  'STATION CODE',
  'STATION NAME',
  'CREDIT LIMIT',
  'AVAILABLE CREDIT',
  'TRADE BALANCE',
  'AVAILABLE STOCK',
  'CIT',
  'TOTAL STOCK',
  'TAR',
  'EXPOSURE',
  'RMA',
  'BM',
];
const MONEY_COLS = 8; // C..J

export interface WeekRow {
  station: Station;
  report: WeeklyLog | null;
  rma: string;
  bm: string;
}

/** Actual figures for one specific week (current version). Missing reports stay missing. */
export function buildWeekRows(stations: Station[], reports: WeeklyLog[], week: string): WeekRow[] {
  const users = getSessionUsers();
  const bmNames = bmNameMap();
  const nameOf = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? fullName(u) : id;
  };
  return [...stations]
    .sort((a, b) => (a.stationCode ?? '~').localeCompare(b.stationCode ?? '~') || a.stationName.localeCompare(b.stationName))
    .map((station) => {
      const versions = reports.filter((r) => r.stationId === station.id && r.reportingWeek === week);
      const report = versions.sort((a, b) => b.version - a.version)[0] ?? null;
      const rmaId = report?.rmaId ?? station.rmaId;
      const bmId = report ? report.bmId : users.find((u) => u.id === station.rmaId)?.bmId ?? null;
      return { station, report, rma: nameOf(rmaId), bm: bmId ? bmNames[bmId] ?? bmId : '—' };
    });
}

/**
 * Exports the weekly TAR workbook for the stations the actor may access (RMA: own stations; BM: assigned
 * stations; Head of Retail / Risk / Management: all). An optional stationId narrows it further, but can never widen it.
 */
export async function exportTarWorkbook(actorId: string, fromWeek: string, toWeek: string, stationId: string | null = null): Promise<string> {
  const actor = getActor(actorId);
  if (fromWeek > toWeek) throw new Error('The start week must not be after the end week.');
  const weeks = weeksBetween(fromWeek, toWeek); // chronological, oldest first
  if (weeks.length === 0) throw new Error('No reporting weeks in the selected period.');

  const scoped = getScope(actor).stations;
  if (stationId && !scoped.some((s) => s.id === stationId)) throw new Error('You do not have access to that station.');
  const stations = stationId ? scoped.filter((s) => s.id === stationId) : scoped;
  if (stations.length === 0) throw new Error('There are no stations in your scope to export.');
  const reports = listReports();
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RMA Weekly Monitoring Portal';

  const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, bgColor: { argb } });

  for (const week of weeks) {
    const ws = wb.addWorksheet(week); // sheet name = Sunday week-ending date (YYYY-MM-DD)
    ws.columns = HEADERS.map((header, i) => ({ header, key: `c${i}`, width: i === 1 ? 28 : i >= 10 ? 22 : 18 }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF013C1C' } };
    head.alignment = { vertical: 'middle' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const rows = buildWeekRows(stations, reports, week);
    const sums = new Array<number>(MONEY_COLS).fill(0);
    rows.forEach(({ station, report, rma, bm }) => {
      const nums: Array<number | string> = report
        ? [report.creditLimit ?? 'N/A', report.availableCredit ?? 'N/A', report.tradeBalance, report.availableStock, report.cit, report.totalStock, report.tar, report.exposure]
        : [station.creditLimit ?? 'N/A', ...new Array<string>(MONEY_COLS - 1).fill('NOT SUBMITTED')];
      const row = ws.addRow([station.stationCode ?? 'PENDING', station.stationName, ...nums, rma, bm]);
      nums.forEach((v, i) => {
        const cell = row.getCell(3 + i);
        if (typeof v === 'number') {
          cell.numFmt = NAIRA_FORMAT;
          sums[i] += v;
        } else {
          cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
          cell.alignment = { horizontal: 'right' };
        }
      });
    });

    const last = rows.length + 1;
    ws.autoFilter = { from: 'A1', to: `L${last}` };
    ws.addRow([]);
    const moneyCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const totals = ws.addRow(['TOTAL', '', ...moneyCols.map((col, i) => ({ formula: `SUBTOTAL(109,${col}2:${col}${last})`, result: sums[i] })), '', '']);
    totals.font = { bold: true };
    for (let c = 3; c <= 10; c++) totals.getCell(c).numFmt = NAIRA_FORMAT;

    // Conditional formatting for TAR (column I) and Exposure (column J); ISNUMBER keeps "NOT SUBMITTED" unhighlighted.
    for (const col of ['I', 'J']) {
      ws.addConditionalFormatting({
        ref: `${col}2:${col}${last}`,
        rules: [
          { type: 'expression', priority: 1, formulae: [`AND(ISNUMBER(${col}2),${col}2<0)`], style: { fill: fill('FFC6EFCE') } },
          { type: 'expression', priority: 2, formulae: [`AND(ISNUMBER(${col}2),${col}2>0)`], style: { fill: fill('FFFFC7CE') } },
        ],
      });
    }
  }

  const filename = `TAR_Monitoring_Report_${toWeek}.xlsx`;
  await downloadWorkbook(wb, filename);
  recordAudit(actor.id, 'REPORT_EXPORTED', 'workbook', filename, `${weeks.length} weekly sheet(s) ${fromWeek}..${toWeek}`);
  return filename;
}

async function downloadWorkbook(wb: import('exceljs').Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const FM_HEADERS = [
  'STATION CODE',
  'STATION NAME',
  'OPENING STOCK',
  'OPENING BALANCE',
  'TOTAL OPENING STOCK',
  'CLOSING STOCK',
  'CLOSING BALANCE',
  'TOTAL CLOSING STOCK',
  'CHANGE IN BALANCE',
  'CHANGE IN STOCK',
  'NET EFFECT',
  'REPORTING MONTH',
];

/**
 * Financial Monitor workbook for the actor's scope. month = 'latest' exports each station's most recent monthly log;
 * a YYYY-MM month exports that month. Figures are calculated from the monthly logs (the same source as the screen).
 */
export async function exportFinancialMonitorWorkbook(actorId: string, month: string | 'latest'): Promise<string> {
  const actor = getActor(actorId);
  const stations = getScope(actor).stations;
  if (stations.length === 0) throw new Error('There are no stations in your scope to export.');
  const rows = buildFinancialMonitorRows(stations, listMonthlyLogs(), month).sort((a, b) =>
    (a.station.stationCode ?? '~').localeCompare(b.station.stationCode ?? '~'),
  );
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RMA Weekly Monitoring Portal';
  const ws = wb.addWorksheet(month === 'latest' ? 'Latest month' : month);
  ws.columns = FM_HEADERS.map((header, i) => ({ header, key: `c${i}`, width: i === 1 ? 28 : 20 }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF013C1C' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const { station, log } of rows) {
    const f = log ? calculateFinancialMonitor(log as MonthlyLog) : null;
    const nums = f
      ? [f.openingStock, f.openingBalanceCit, f.totalOpeningStock, f.closingStock, f.closingBalanceCit, f.totalClosingStock, f.changeInBalance, f.changeInStock, f.netEffect]
      : new Array<string>(9).fill('NO MONTHLY LOG');
    const row = ws.addRow([station.stationCode ?? 'PENDING', station.stationName, ...nums, log ? formatMonth(log.reportingMonth) : '—']);
    nums.forEach((v, i) => {
      const cell = row.getCell(3 + i);
      if (typeof v === 'number') cell.numFmt = NAIRA_FORMAT;
      else cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
    });
  }
  const last = rows.length + 1;
  ws.addConditionalFormatting({
    ref: `K2:K${last}`,
    rules: [
      { type: 'expression', priority: 1, formulae: ['AND(ISNUMBER(K2),K2>0)'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } } } },
      { type: 'expression', priority: 2, formulae: ['AND(ISNUMBER(K2),K2<0)'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC6EFCE' } } } },
    ],
  });
  const filename = `Financial_Monitor_${month === 'latest' ? 'Latest' : month}.xlsx`;
  await downloadWorkbook(wb, filename);
  recordAudit(actor.id, 'REPORT_EXPORTED', 'workbook', filename, `Financial Monitor, ${rows.length} station(s), ${month}`);
  return filename;
}
