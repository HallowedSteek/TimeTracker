/** Directory portion of a file path (supports / and \\). */
export function pathDir(filePath: string): string {
  const m = filePath.match(/^(.*)[/\\][^/\\]+$/)
  return m ? m[1] : ''
}

export function replaceFilenameInPath(filePath: string, newFileName: string): string {
  const d = pathDir(filePath)
  if (!d) return newFileName
  const sep = filePath.includes('\\') ? '\\' : '/'
  return d + sep + newFileName
}

export function defaultExportFileName(userName: string, year: number, month0: number): string {
  const safe = userName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'User'
  const mm = String(month0 + 1).padStart(2, '0')
  return `${safe}_${mm}-${year}.xlsx`
}

export function joinDirFile(dir: string, file: string): string {
  const d = dir.replace(/[/\\]+$/, '')
  const sep = dir.includes('\\') ? '\\' : '/'
  return `${d}${sep}${file}`
}
