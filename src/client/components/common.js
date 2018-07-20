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


export function ErrorButton(props) {
  return (
    <button
      className={buttonFlatClass + ' red icon-cancel'}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

ErrorButton.propTypes = {
  onClick: PropTypes.func,
  children: PropTypes.element
}
