import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Mutation } from 'react-apollo'
import { css } from 'emotion'

import isEmail from 'validator/lib/isEmail'

import client, {
  LOCAL_USER,
  UPDATE_LOCAL_USER,
  UPDATE_DETAIL,
} from '~/client/apolloClient'

import {
  buttonClass,
  buttonFlatClass,
  inputClass,
  spinner,
  ErrorButton
} from './common'

export const userPropTypes = {
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    email: PropTypes.string.isRequired,
    loc: PropTypes.string,
    token: PropTypes.string.isRequired,
  })
}

export default class User extends PureComponent {
  static propTypes = userPropTypes
  logout = () => {
    client.mutate({ mutation: UPDATE_LOCAL_USER, variables: { token: this.props.user.token, logout: true } })
      .then(() => { window.location.reload() })
  }
  render() {
    const { name, email, loc } = this.props.user
    return (
      <div className="flex flex-column mx-auto" style={{ maxWidth: '40rem' }}>
        <h3>My details</h3>
        <UserField nameDisplay="Name" name="name" key={'name' + name} />
        <UserField nameDisplay="Email" name="email" key={'email' + email} />
        <UserField nameDisplay="Location" name="loc" key={'loc' + loc} />
        <button
          className={buttonClass}
          onClick={this.logout}
        >
          Log out
        </button>
      </div>
    )
  }
}

class UserField extends PureComponent {
  static propTypes = {
    nameDisplay: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }
  constructor(props) {
    super(props)
    this.user = client.readQuery({ query: LOCAL_USER }).localUser
    this.state = {
      editMode: false,
      value: this.user[this.props.name] || '',
      showError: true
    }
  }
  onChange = e => {
    this.setState({ value: e.currentTarget.value })
  }
  toggleEdit = () => {
    const editMode = !this.state.editMode
    this.setState({ editMode })
    if (editMode) setTimeout(() => {
      this.refInput.current.focus()
    }, 50)
    else if (this.state.value !== this.user[this.props.name]) this.setState({ value: this.user[this.props.name] || '' })
  }
  refInput = React.createRef()
  render() {
    const { nameDisplay, name } = this.props
    const { value, editMode } = this.state
    return (
      <div className="flex flex-column">
        <span className="mx1 px1 h5 italic">{nameDisplay}</span>
        <input
          value={value}
          className={inputClass + ' mx1 border-none ' + css({
            backgroundColor: '#fff0',
            borderBottom: '1px solid ' + (editMode ? '#aaa' : '#fff0'),
            cursor: editMode ? 'default' : 'pointer',
          })}
          ref={this.refInput}
          onChange={this.onChange}
          onClick={() => {
            this.setState({ editMode: true, showError: false })
          }}
        />
        <Mutation
          mutation={UPDATE_DETAIL}
        >
          {(mutate, { loading, error }) => {
            const trimmedValue = value.trim()
            return (
              <div className="flex items-start mb2">
                <button
                  onClick={this.toggleEdit}
                  className={buttonFlatClass + ' m1'}
                  disabled={loading}
                >
                  {editMode && 'Cancel'}
                </button>
                {editMode ?
                  error && this.state.showError ? ErrorButton({
                    onClick: () => { this.setState({ showError: false }) },
                    children: /email/i.test(error.message) ?
                      'The email is invalid or has been registered!' :
                      'Oops something went wrong!'
                  }) :
                  loading ? spinner : (
                    <button
                      className={buttonFlatClass + ' mt1 ml2 color1'}
                      disabled={!trimmedValue || trimmedValue === this.user[this.props.name] || (name === 'email' && !isEmail(trimmedValue))}
                      onClick={() => {
                        this.setState({ showError: true })
                        mutate({ variables: { key: name, value: trimmedValue, token: this.user.token } })
                          .then(() => {
                            const user = client.readQuery({ query: LOCAL_USER }).localUser
                            user[name] = trimmedValue
                            client.mutate({ mutation: UPDATE_LOCAL_USER, variables: user })
                          })
                      }}
                    >
                      Update
                    </button>
                  )
                 : null }
              </div>
            )
          }}
        </Mutation>
      </div>
    )
  }
}

