type ToastProps = {
  message: string
  kind: 'success' | 'error'
  onDismiss: () => void
  /** When set with `fileName`, the name is shown as a control that opens the folder with this file selected. */
  filePath?: string
  fileName?: string
}

export default function Toast({ message, kind, onDismiss, filePath, fileName }: ToastProps) {
  const openFileLocation = () => {
    if (filePath) void window.api.showItemInFolder(filePath)
  }

  const showFileLink = kind === 'success' && filePath && fileName

  return (
    <div
      className={`toast toast--${kind}`}
      role="status"
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast-message">
        {showFileLink ? (
          <>
            {message}{' '}
            <button
              type="button"
              className="toast-file-link"
              onClick={openFileLocation}
              title="Show in folder"
            >
              {fileName}
            </button>
          </>
        ) : (
          message
        )}
      </span>
      <button type="button" className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
