/**
 * 개인 자산 관리 구글시트에서 수익률·환율만 읽어오는 모듈.
 * 절대 금액(구매가/평가금액/보유수량 등)은 절대 파싱·노출하지 않는다 — 공개 페이지이기 때문.
 */
import type { AssetBriefing, AssetReturnPoint, AssetTrendItem, ExchangeRateItem } from "@/lib/types";

function sheetId(): string | null {
  return process.env.ASSET_SHEET_ID || null;
}

function csvUrl(sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId()}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

/** 최소한의 CSV 파서 — 따옴표로 감싼 필드 안의 콤마/줄바꿈/이스케이프(""))를 처리한다. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function fetchSheetRows(sheetName: string): Promise<string[][]> {
  const id = sheetId();
  if (!id) throw new Error("ASSET_SHEET_ID 환경변수 없음");

  const res = await fetch(csvUrl(sheetName), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`시트 "${sheetName}" 조회 실패 (HTTP ${res.status}) — 링크 공유 설정을 확인하세요`);
  }
  const text = await res.text();
  return parseCsv(text);
}

function toPercent(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace("%", "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * "OOO 수익률" 형태의 헤더 컬럼만 찾아 종목별 수익률 추이로 변환한다.
 * 컬럼 위치가 아니라 헤더 텍스트로 매칭하므로 시트 구조(집중 관리/단가 추이)가
 * 서로 달라도 동일 로직으로 처리된다. 구매가·현재가·보유수량 등은 애초에 읽지 않는다.
 */
function parseTrendRows(rows: string[][]): AssetTrendItem[] {
  if (rows.length < 2) return [];
  const header = rows[0];

  const returnCols = header
    .map((h, idx) => ({ idx, label: h.trim().replace(/\s*수익률\s*$/, "") }))
    .filter((c) => /수익률\s*$/.test(header[c.idx].trim()) && c.label.length > 0);

  if (returnCols.length === 0) return [];

  const items: AssetTrendItem[] = [];
  for (const row of rows.slice(1)) {
    const name = (row[0] ?? "").trim();
    // 종목명이 빈 첫 행에서 종료 — 시트 하단에는 같은 열 범위를 재사용하는
    // 별개의 보조 표(비교/보유수량/일별종가 등)가 이어지므로 계속 읽으면 안 됨.
    if (!name) break;
    const code = (row[1] ?? "").trim();
    if (!code) continue;

    const returns: AssetReturnPoint[] = returnCols
      .map(({ idx, label }) => ({ label, value: toPercent(row[idx]) }))
      .filter((r): r is AssetReturnPoint => r.value !== null);

    if (returns.length > 0) items.push({ name, code, returns });
  }
  return items;
}

/**
 * "환율 대시보드" 탭에서 "오늘 환율" 행과 바로 위 헤더 행(통화명)만 사용한다.
 */
function parseExchangeRows(rows: string[][]): ExchangeRateItem[] {
  const todayRowIdx = rows.findIndex((r) => (r[0] ?? "").trim() === "오늘 환율");
  if (todayRowIdx <= 0) return [];

  const header = rows[todayRowIdx - 1];
  const values = rows[todayRowIdx];

  const items: ExchangeRateItem[] = [];
  for (let i = 0; i < header.length; i++) {
    const label = (header[i] ?? "").trim();
    const rate = toNumber(values[i]);
    if (label && rate !== null) items.push({ label, rate });
  }
  return items;
}

export async function fetchAssetBriefing(): Promise<AssetBriefing> {
  const [priceRows, focusRows, exchangeRows] = await Promise.all([
    fetchSheetRows("단가 추이"),
    fetchSheetRows("집중 관리"),
    fetchSheetRows("환율 대시보드"),
  ]);

  return {
    priceTrend: parseTrendRows(priceRows),
    focusTrend: parseTrendRows(focusRows),
    exchangeRates: parseExchangeRows(exchangeRows),
    generatedAt: new Date().toISOString(),
  };
}
