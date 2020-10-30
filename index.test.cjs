/* global HTMLRewriter, FX_REDIRECT, FX_OMIT, FX_JWT_SECRET, handleRequest */
const { expect } = require('chai');
const fs = require('fs');
const mockServer = require('./test/mock/server.cjs');
require('mocha');
const fetch = require("node-fetch");
const tunnel = require("tunnel");

const testURL = 'http://localhost';
const testPort = 8080;

mockServer.start(testPort);


describe('Protect restricted content', () => {
  it ('Redirects anonymous users to the login page.', async () => {
    const url = `${testURL}:8787/testando`;
    const response = await fetch(url, {
      method: 'GET', 
      cache: 'no-cache', 
      redirect: 'manual'
    });
    expect(response.status).to.equal(302);
    expect(response.headers.get('location')).to.match(/login\/?$/);
  });

  describe('Redirects users back after successful login.', () => {
    it ('Sets a cookie with the destination.', async () => {
      const url = `${testURL}:8787/testando`;
      const response = await fetch(url, {
        method: 'GET', 
        cache: 'no-cache', 
        redirect: 'manual'
      });
      const cookie = response.headers.get('set-cookie') ;
      expect(cookie).to.contain(url);
    });
  });

  it ('Does not redirect anonymous users away from the login page');
  it ('Does not redirect users that were already logged in.');
  it ('Removes tags identified as restricted if the user is anonymous');
});

after(() => {
  mockServer.end();
})
