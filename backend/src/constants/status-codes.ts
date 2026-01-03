export const STATUS_CODES = {
  // Reception statuses
  TOTAL_RECEIVED: '100000',
  CARRYOVER: '102000', // Previously received (旧受)
  NEW_RECEIVED: '103000', // Newly received (新受)

  // Processing statuses
  TOTAL_PROCESSED: '300000',
  GRANTED: '301000', // Approved
  DENIED: '302000', // Rejected
  OTHER: '305000', // Other outcomes

  // Pending
  PENDING: '400000', // Not yet processed
} as const;

export type StatusCode = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];

export const STATUS_LABELS: Record<string, string> = {
  '100000': 'Total Received',
  '102000': 'Carryover',
  '103000': 'New Received',
  '300000': 'Total Processed',
  '301000': 'Granted',
  '302000': 'Denied',
  '305000': 'Other',
  '400000': 'Pending',
};
