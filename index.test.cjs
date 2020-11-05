/* global HTMLRewriter, FX_REDIRECT, FX_OMIT, FX_JWT_SECRET, handleRequest */
const { expect } = require('chai');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('mocha');

const fetch = require("node-fetch");

const options = {
  method: 'GET', 
  cache: 'no-cache', 
  redirect: 'manual'
}

const cases = {
  basic: new URL('http://localhost:8787/basic'),
  restricted: new URL('http://localhost:8787/restricted.html'),
  login: new URL('http://localhost:8787/customer-portal/'),
}

describe('Protect restricted content', () => {
  it ('Redirects anonymous users to the login page.', async () => {
    const restrictedURL = cases.restricted;
    const response = await fetch(restrictedURL.toString(), options);
    expect(response.status).to.equal(302);
    const location = response.headers.get('location');
    expect(location).to.exist;
  });

  describe('Redirects users back after successful login.', () => {
    it ('Sets a cookie with the destination.', async () => {
      const response = await fetch(cases.restricted.toString(), options);
      const cookie = response.headers.get('set-cookie') ;
      expect(cookie).to.exist;
      expect(cookie).to.contain(cases.restricted.pathname);
    });

    it ('Does not redirect anonymous users away from the login page', async () => {
      const response = await fetch(cases.login.toString(), options);
      expect(response.status).not.to.equal(302);
      const cookie = response.headers.get('set-cookie') ;
      if (cookie) {
        expect(cookie).not.to.contain('fx.cf.guard.destination');
      }
    });
  });

  it ('Does not redirect users that were already logged in.', async () => {
    const token = jwt.sign({ foo: 'bar' }, 'foobar'); // The FX_JWT_SECRET for the dev environment is set in the wrangler.toml file.
    const headers = { cookie: `fx.customer.jwt=${token}` }
    const loggedIn = { ...options, headers }
    const response = await fetch(cases.basic.toString(), loggedIn);
    expect(response.status).not.to.equal(302);
    const location = response.headers.get('location');
    expect(location).not.to.exist;
    const cookie = response.headers.get('set-cookie') ;
    if (cookie) {
      expect(cookie).not.to.contain('fx.cf.guard.destination');
    }
  });

  it ('Removes tags identified as restricted if the user is anonymous', async () => {
    const response = await fetch(cases.login.toString(), options);
    const fullBody = await response.text();
    expect(fullBody).not.to.contain('data-restricted');
  });
});
