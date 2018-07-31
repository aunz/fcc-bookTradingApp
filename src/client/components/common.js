import React from 'react'
import PropTypes from 'prop-types'
import { css } from 'emotion'

export const inputClass = 'p1 outline-none '

const buttonDisabledClass = css({
  transition: 'opacity 0.3s ease',
  ':hover': {
    opacity: 0.5
  },
  ':disabled': {
    color: '#ccc',
    cursor: 'not-allowed'
  }
}) + ' '
export const buttonClass = 'p1 self-center bg-transparent outline-none pointer border rounded border-color1 ' + buttonDisabledClass

export const buttonFlatClass = ' bg-transparent outline-none border-none pointer ' + buttonDisabledClass

export const spinner = <i className="self-center icon-spin6 animate-spin color1" />


export function EL({ loading, error, showError, onClick, children }) { // show Error or Loading
  if (loading) return <span className="m1">{spinner}</span>
  if (error && showError) return (
    <button
      className={buttonFlatClass + ' red icon-cancel'}
      onClick={onClick}
      type="button"
    >
      {children || 'Oops something went wrong!'}
    </button>
  )
  return null
}

EL.propTypes = {
  onClick: PropTypes.func,
  children: PropTypes.node,
  loading: PropTypes.bool,
  error: PropTypes.object, // eslint-disable-line
  showError: PropTypes.bool,
}
