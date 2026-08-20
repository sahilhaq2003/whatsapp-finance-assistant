export interface ReportPeriodResult {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface TrendGranularity {
  type: 'day' | 'week' | 'month';
}
