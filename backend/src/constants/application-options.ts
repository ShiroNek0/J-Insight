export interface ApplicationOption {
  value: string;
  label: string;
  short: string;
}

export const APPLICATION_OPTIONS: ApplicationOption[] = [
  { value: 'all', label: 'All Types', short: 'ALL' },
  { value: '10', label: 'Status Acquisition', short: '取得' },
  { value: '20', label: 'Period Extension', short: '更新' },
  { value: '30', label: 'Status Change', short: '変更' },
  { value: '40', label: 'Extra-Status Activities', short: '資格外' },
  { value: '50', label: 'Re-entry', short: '再入国' },
  { value: '60', label: 'Permanent Residence', short: '永住' },
];
