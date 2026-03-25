/** Typical contractual range (days per month). */
export const MIN_DAYS_PER_MONTH = 20
export const MAX_DAYS_PER_MONTH = 25
export const EUR_PER_DAY = 180

/** Keys in `settings.json` (AppData). */
export const SETTINGS = {
  exportDir: 'exportDir',
  exportRememberPath: 'exportRememberPath',
  userDisplayName: 'userDisplayName',
  payRateEUR: 'payRateEUR',
  startDate: 'startDate'
} as const
