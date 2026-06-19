import { useState, useRef } from 'react'

const ACCEPTED_EXTENSIONS = ['.csv', '.txt']

function getExtension(filename) {
  const idx = filename.lastIndexOf('.')
  if (idx === -1) return ''
  return filename.slice(idx).toLowerCase()
}

export function Dropzone({ onFile, disabled, label, helpText, selectedFileName }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localError, setLocalError] = useState(null)
  const inputRef = useRef(null)

  function validate(files) {
    if (!files || files.length === 0) return null
    if (files.length > 1) return 'Un seul fichier est accepté.'
    const file = files[0]
    if (!ACCEPTED_EXTENSIONS.includes(getExtension(file.name))) {
      return 'Format non supporté. Veuillez déposer un fichier .csv ou .txt.'
    }
    if (file.size === 0) return 'Le fichier est vide.'
    return null
  }

  function handleFiles(files) {
    const err = validate(files)
    if (err) { setLocalError(err); return }
    setLocalError(null)
    onFile(files[0])
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragOver(true) }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
    if (disabled) return
    handleFiles(Array.from(e.dataTransfer.files))
  }
  function handleInputChange(e) {
    handleFiles(Array.from(e.target.files))
    e.target.value = ''
  }
  function handleClick() { if (!disabled) inputRef.current?.click() }
  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); inputRef.current?.click() }
  }

  const hasError = !!localError
  const containerStyle = {
    width: '100%',
    border: '2px dashed',
    borderRadius: '12px',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    borderColor: hasError ? '#E53935' : isDragOver ? '#B1DCE2' : selectedFileName ? '#31B700' : '#E2E8F0',
    backgroundColor: hasError ? '#FFF5F5' : isDragOver ? '#E3F2F5' : selectedFileName ? '#E8F5E0' : '#FAFAFA',
    opacity: disabled ? 0.6 : 1,
  }

  return (
    <div style={{ width: '100%' }}>
      <div
        style={containerStyle}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
      >
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1A202C', textAlign: 'center' }}>
          {selectedFileName ? `✓ ${selectedFileName}` : label}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#718096', textAlign: 'center' }}>
          Glissez-déposez un fichier ou cliquez pour sélectionner
        </p>
        {helpText && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#A0AEC0', textAlign: 'center' }}>{helpText}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {localError && (
        <div role="alert" aria-live="polite" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#C53030' }}>
          <span aria-hidden="true">⚠️</span>
          {localError}
        </div>
      )}
    </div>
  )
}

export default Dropzone
