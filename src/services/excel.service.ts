import type { Station } from '../types/station';
import type { WeeklyLog } from '../types/weekly-log';
import { fullName } from '../types/user';
import { weeksBetween } from '../utils/date';
import { getActor, getScope } from './access';
import { recordAudit } from './audit.service';
import { listReports } from './report.service';
import { bmNameMap, getSessionUsers } from './userService';

const NAIRA_FORMAT = '"₦"#,##0;-"₦"#,##0';
const HEADERS = [
  'STATION CODE',
  'STATION NAME',
  'CREDIT LIMIT',
  'AVAILABLE CREDIT',
  'TOTAL EXPOSURE',
  'AVAILABLE STOCK',
  'TAR EXPOSURE/DEBT',
  'RMA',
  'BM',
];

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
 * Exports the weekly T.A.R/Debt workbook for the stations the actor may access (RMA: own stations; BM: assigned
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
    ws.columns = HEADERS.map((header, i) => ({ header, key: `c${i}`, width: i === 1 ? 28 : i >= 7 ? 22 : 20 }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF013C1C' } };
    head.alignment = { vertical: 'middle' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const rows = buildWeekRows(stations, reports, week);
    const sums = [0, 0, 0, 0, 0];
    rows.forEach(({ station, report, rma, bm }) => {
      const nums = report
        ? [station.creditLimit ?? 'N/A', report.availableCredit ?? 'N/A', report.totalExposure, report.availableStock, report.tarDebt]
        : [station.creditLimit ?? 'N/A', 'NOT SUBMITTED', 'NOT SUBMITTED', 'NOT SUBMITTED', 'NOT SUBMITTED'];
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
    ws.autoFilter = { from: 'A1', to: `I${last}` };
    ws.addRow([]);
    const totals = ws.addRow(['TOTAL', '', ...['C', 'D', 'E', 'F', 'G'].map((col, i) => ({ formula: `SUBTOTAL(109,${col}2:${col}${last})`, result: sums[i] })), '', '']);
    totals.font = { bold: true };
    for (let c = 3; c <= 7; c++) totals.getCell(c).numFmt = NAIRA_FORMAT;

    // Conditional formatting for T.A.R/Debt (column G); ISNUMBER keeps "NOT SUBMITTED" unhighlighted.
    ws.addConditionalFormatting({
      ref: `G2:G${last}`,
      rules: [
        { type: 'expression', priority: 1, formulae: ['AND(ISNUMBER(G2),G2<0)'], style: { fill: fill('FFC6EFCE') } },
        { type: 'expression', priority: 2, formulae: ['AND(ISNUMBER(G2),G2>0)'], style: { fill: fill('FFFFC7CE') } },
      ],
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `TAR_Monitoring_Report_${toWeek}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  recordAudit(actor.id, 'REPORT_EXPORTED', 'workbook', filename, `${weeks.length} weekly sheet(s) ${fromWeek}..${toWeek}`);
  return filename;
}
