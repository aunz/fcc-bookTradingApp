import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Mutation } from 'react-apollo'

import isEmail from 'validator/lib/isEmail'

import client, {
  LOGIN,
  SIGNUP,
  UPDATE_LOCAL_USER
} from '~/client/apolloClient'

import {
  inputClass,
  buttonClass,
  EL
} from './common'

const inputClass2 = inputClass + 'm1'
const buttonClass2 = buttonClass + ' m1  bold'
const orSpan = <span className="m1 self-center silver">or</span>
const linkClass = 'self-center decoration-none '

export default class extends Component {
  state = {
    email: '',
    pw: '',
    showError: true,
  }
  inputRef = React.createRef()
  input = ({ currentTarget }) => {
    this.setState({ [currentTarget.name]: currentTarget.value })
  }
  onKeyUp = e => {
    if (e.key !== 'Enter') return
    this.inputRef.current && this.inputRef.current.click()
  }
  render() {
    const { email, pw, showError } = this.state
    return (
      <div
        className="flex flex-column mx-auto"
        style={{ maxWidth: '20rem' }}
      >
        <input
          type="email"
          placeholder="Email"
          className={inputClass2}
          onChange={this.input}
          name="email"
        />
        <input
          type="password"
          placeholder="Password"
          className={inputClass2}
          onChange={this.input}
          name="pw"
          onKeyUp={this.onKeyUp}
        />
        <Mutation
          mutation={LOGIN}
          onCompleted={({ login }) => {
            client.mutate({
              mutation: UPDATE_LOCAL_USER,
              variables: login
            })
          }}
        >
          {(mutate, { loading, error }) => {
            if (loading || (error && showError)) return (
              <EL
                error={error}
                loading={loading}
                showError={showError}
                onClick={() => { this.setState({ showError: false }) }}
              >
                {/unauthori/i.test((error || '').message) && 'The email and/or password combination is incorrect.'}
              </EL>
            )
            const disabled = !isEmail(email) || pw.length < 3 || (error && showError)
            return (
              <input
                type="submit"
                value="Login"
                className={buttonClass2}
                disabled={disabled}
                onClick={() => {
                  mutate({ variables: { email, pw } })
                  this.setState({ showError: true })
                }}
                ref={this.inputRef}
              />
            )
          }}
        </Mutation>
        {orSpan}
        <Link
          to="/signup"
          className={linkClass}
        >
          Sign up
        </Link>
      </div>
    )
  }
}


export class Signup extends Component {
  state = {
    name: '',
    email: '',
    loc: '', // location
    pw1: '',
    pw2: '',
    showError: false
  }
  input = e => {
    this.setState({ [e.currentTarget.name]: e.currentTarget.value, showError: false })
  }
  signup = () => {}
  render() {
    return (
      <div
        className="flex flex-column mx-auto"
        style={{ maxWidth: '20rem' }}
      >
        <input
          type="text"
          placeholder="Name"
          className={inputClass2}
          onChange={this.input}
          name="name"
        />
        <input
          type="email"
          placeholder="Email"
          className={inputClass2}
          onChange={this.input}
          name="email"
        />
        <input
          type="text"
          placeholder="Location"
          className={inputClass2}
          onChange={this.input}
          name="loc"
        />
        <input
          type="password"
          placeholder="Password"
          className={inputClass2}
          onChange={this.input}
          name="pw1"
        />
        <input
          type="password"
          placeholder="Re-enter Password"
          className={inputClass2}
          onChange={this.input}
          name="pw2"
        />
        <Mutation
          mutation={SIGNUP}
          onCompleted={({ signup }) => {
            client.mutate({
              mutation: UPDATE_LOCAL_USER,
              variables: signup
            })
          }}
        >
          {(mutate, { loading, error }) => {
            const { name, email, loc, pw1, pw2, showError } = this.state
            if (loading || (error && showError)) return (
              <EL
                error={error}
                loading={loading}
                showError={showError}
                onClick={() => { this.setState({ showError: false }) }}
              />
            )
            return (
              <input
                type="submit"
                value="Sign up"
                className={buttonClass2}
                disabled={!isEmail(email) || !name || !loc || pw1.length < 3 || pw1 !== pw2}
                onClick={() => {
                  mutate({
                    variables: { name, email, loc, pw: pw1 }
                  })
                  this.setState({ showError: true })
                }}
              />
            )
          }}
        </Mutation>
        {orSpan}
        <Link
          to="/login"
          className={linkClass}
        >
          Login
        </Link>
      </div>
    )
  }
}
