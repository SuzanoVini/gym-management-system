// Characterization tests pinning current behavior of the lib/csv table parsers
// before the ESLint burndown refactor. Outputs are compared as JSON strings.

const mockPapaParse = jest.fn();
jest.mock('papaparse', () => ({
  __esModule: true,
  default: { parse: (...args: unknown[]): unknown => mockPapaParse(...args) },
}));

import {
  type CsvRow,
  parseCancellationsCSV,
  parseHoldsCSV,
  parseIntrosCSV,
  parseSignupsCSV,
} from '@/lib/csv';
import { parseDate } from '@/lib/csv/normalize';

interface PapaConfig {
  header: boolean;
  transformHeader: (h: string) => string;
  complete: (results: { data: CsvRow[] }) => void;
  error: (error: unknown) => void;
}

type CsvParser<T> = (file: File, onComplete: (data: T[]) => void, year?: number) => void;

function runCsv<T>(parser: CsvParser<T>, rows: CsvRow[], year?: number): string {
  let config: PapaConfig | undefined;
  mockPapaParse.mockImplementationOnce((_file: unknown, cfg: PapaConfig) => {
    config = cfg;
  });
  let out: T[] = [];
  parser(
    {} as File,
    (data) => {
      out = data;
    },
    year
  );
  config?.complete({ data: rows });
  const { complete: _c, error: _e, transformHeader, ...rest } = config ?? ({} as PapaConfig);
  return JSON.stringify({ rest, header: transformHeader(' A b '), out });
}

const baseRows: CsvRow[] = [
  { NAME: 'Total' },
  { name: '  ' },
  null as unknown as CsvRow,
  { NAME: ' Ann ', MONTH: 'january', DATE: '5', TIME: '6pm', ATTENDED: 'TRUE', 'SIGNED UP': '0' },
  { Name: 'Bo', month: 'Sept', date: '3/4', staff: 'Z', Email: 'e@x', signed_up: 'yes' },
  { name: 'Cy', Month: 'Feb', Date: '12/25/2024', attended: 'maybe', CLASS: 'Kids' },
  { NAME: 'Di', MONTH: 'Mar', DATE: 'March 7, 2025', 'MEMBERSHIP DATE': '2/3' },
  { NAME: 'Ed', DATE: 'garbage', '1ST PAYMENT DATE': '7-8', 'SIGN-UP PACKAGE?': 'YES!' },
  { NAME: 'Fi', 'CANCELLATION DATE': '1.2', 'Age Group': 'Kid', REASON: 'r', notes: 'n' },
  { NAME: 'Gu', 'START DATE': '4/5/2023', end: '6/7', Fee: '$20', reason: '' },
];

describe('csv parsers', () => {
  let alertSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    mockPapaParse.mockReset();
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('maps intros', () => {
    expect(runCsv(parseIntrosCSV, baseRows, 2026)).toMatchInlineSnapshot(
      `"{"rest":{"header":true,"dynamicTyping":false,"skipEmptyLines":true,"delimitersToGuess":[",","\\t","|",";"]},"header":"A b","out":[{"month":"Jan","date":"2026-01-05","year":2026,"time":"6pm","class":null,"name":"Ann","email":null,"phone":null,"staff":null,"attended":"Yes","signed_up":"No","status":"Active"},{"month":"Sept","date":"2026-03-04","year":2026,"time":null,"class":null,"name":"Bo","email":"e@x","phone":null,"staff":"Z","attended":"","signed_up":"Yes","status":"Active"},{"month":"Feb","date":"2024-12-25","year":2026,"time":null,"class":"Kids","name":"Cy","email":null,"phone":null,"staff":null,"attended":"","signed_up":"","status":"Active"},{"month":"Mar","date":"2025-03-07","year":2026,"time":null,"class":null,"name":"Di","email":null,"phone":null,"staff":null,"attended":"","signed_up":"","status":"Active"},{"month":"","year":2026,"time":null,"class":null,"name":"Ed","email":null,"phone":null,"staff":null,"attended":"","signed_up":"","status":"Active"},{"month":"","year":2026,"time":null,"class":null,"name":"Fi","email":null,"phone":null,"staff":null,"attended":"","signed_up":"","status":"Active"},{"month":"","year":2026,"time":null,"class":null,"name":"Gu","email":null,"phone":null,"staff":null,"attended":"","signed_up":"","status":"Active"}]}"`
    );
  });

  it('maps signups, cancellations and holds', () => {
    expect(runCsv(parseSignupsCSV, baseRows, 2026)).toMatchInlineSnapshot(
      `"{"rest":{"header":true,"dynamicTyping":false,"skipEmptyLines":true,"delimitersToGuess":[",","\\t","|",";"]},"header":"A b","out":[{"month":"Jan","name":"Ann","membership":"","membership_date":"2026-01-05","signup_package":false,"notes":"","year":2026},{"month":"Sept","name":"Bo","membership":"","membership_date":"2026-03-04","signup_package":false,"notes":"","year":2026},{"month":"Feb","name":"Cy","membership":"","signup_package":false,"notes":"","year":2026},{"month":"Mar","name":"Di","membership":"","membership_date":"2025-03-07","signup_package":false,"notes":"","year":2026},{"month":"","name":"Ed","membership":"","first_payment_date":"2026-07-08","signup_package":true,"notes":"","year":2026},{"month":"","name":"Fi","membership":"","signup_package":false,"notes":"n","year":2026},{"month":"","name":"Gu","membership":"","signup_package":false,"notes":"","year":2026}]}"`
    );
    expect(runCsv(parseCancellationsCSV, baseRows, 2026)).toMatchInlineSnapshot(
      `"{"rest":{"header":true,"dynamicTyping":false,"skipEmptyLines":true,"delimitersToGuess":[",","\\t","|",";"]},"header":"A b","out":[{"month":"Jan","name":"Ann","date":"2026-01-05","reason":null,"age_group":null,"notes":null,"year":2026},{"month":"Sept","name":"Bo","date":"2026-03-04","reason":null,"age_group":null,"notes":null,"year":2026},{"month":"Feb","name":"Cy","reason":null,"age_group":null,"notes":null,"year":2026},{"month":"Mar","name":"Di","date":"2025-03-07","reason":null,"age_group":null,"notes":null,"year":2026},{"month":"","name":"Ed","reason":null,"age_group":null,"notes":null,"year":2026},{"month":"","name":"Fi","date":"2026-01-02","reason":"r","age_group":"Kid","notes":"n","year":2026},{"month":"","name":"Gu","reason":null,"age_group":null,"notes":null,"year":2026}]}"`
    );
    expect(runCsv(parseHoldsCSV, baseRows, 2026)).toMatchInlineSnapshot(
      `"{"rest":{"header":true,"dynamicTyping":false,"skipEmptyLines":true,"delimitersToGuess":[",","\\t","|",";"]},"header":"A b","out":[{"month":"Jan","name":"Ann","reason":null,"fee":null,"year":2026},{"month":"Sept","name":"Bo","reason":null,"fee":null,"year":2026},{"month":"Feb","name":"Cy","reason":null,"fee":null,"year":2026},{"month":"Mar","name":"Di","reason":null,"fee":null,"year":2026},{"month":"","name":"Ed","reason":null,"fee":null,"year":2026},{"month":"","name":"Fi","reason":"r","fee":null,"year":2026},{"month":"","name":"Gu","start":"2023-04-05","end":"2026-06-07","reason":null,"fee":"$20","year":2026}]}"`
    );
  });

  it('reports parse and processing errors', () => {
    const parsers = [parseIntrosCSV, parseSignupsCSV, parseCancellationsCSV, parseHoldsCSV];
    for (const parser of parsers as CsvParser<unknown>[]) {
      let config: PapaConfig | undefined;
      mockPapaParse.mockImplementation((_file: unknown, cfg: PapaConfig) => {
        config = cfg;
      });
      parser({} as File, () => {
        throw new Error('consumer boom');
      });
      config?.complete({ data: [{ NAME: 'x' }] });
      config?.error('bad file');
    }
    const calls = [errorSpy.mock.calls, alertSpy.mock.calls];
    expect(
      JSON.stringify(calls, (_k, v: unknown) => (v instanceof Error ? v.message : v))
    ).toMatchInlineSnapshot(
      `"[[["Error processing CSV data:","consumer boom"],["CSV parsing error:","bad file"],["Error processing CSV data:","consumer boom"],["CSV parsing error:","bad file"],["Error processing CSV data:","consumer boom"],["CSV parsing error:","bad file"],["Error processing CSV data:","consumer boom"],["CSV parsing error:","bad file"]],[["Error processing CSV file. Please check the file format."],["Error parsing CSV file. Please check the file format."],["Error processing CSV file. Please check the file format."],["Error parsing CSV file. Please check the file format."],["Error processing CSV file. Please check the file format."],["Error parsing CSV file. Please check the file format."],["Error processing CSV file. Please check the file format."],["Error parsing CSV file. Please check the file format."]]]"`
    );
  });
});

describe('parseDate bare day numbers', () => {
  it('returns undefined instead of guessing a month and year', () => {
    expect(parseDate('5', 2026)).toBeUndefined();
    expect(parseDate('31')).toBeUndefined();
  });

  it('still parses full and month/day dates', () => {
    expect(parseDate('2026-03-07')).toBe('2026-03-07');
    expect(parseDate('3/4', 2026)).toBe('2026-03-04');
    expect(parseDate('03/07/2025')).toBe('2025-03-07');
  });
});
