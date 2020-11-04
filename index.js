/* global HTMLRewriter, FX_REDIRECT, FX_JWT_SECRET */

const FX_CUSTOMER_JWT_COOKIE = "fx.customer.jwt";
const FX_CUSTOMER_DESTINATION_COOKIE = "fx.cf.guard.destination";

// Flag that indicates that there is a login form in this page so that the user
// is not redirected out of it.
let loginTag = false;

/** Cloudflare Worker method */
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Gets the cookie with given name from the request headers
 *
 * @param {Request} request incoming Request
 * @param {string} name of the cookie to get
 * @returns {string} the cookie value
 */
function getCookie(request, name) {
  let result = "";
  const cookieString = request.headers.get("Cookie");
  if (cookieString) {
    const cookies = cookieString.split(";");
    for (let c = 0; c < cookies.length; c += 1) {
      const cookie = cookies[c].split("=", 2);
      if (name === cookie[0].trim() && cookie.length === 2) {
        result = cookie[1];
        break;
      }
    }
  }
  return result;
}

/**
 * Verify JWT token
 *
 * Uses the stored shared secret to verify a JWT token
 *
 * @param {string} token to be verified
 */
async function verifySignature(token) {
  const encoder = new TextEncoder();
  const splitted = token.split(".");
  const b64data = [
      b64URL2b64(splitted[0]), 
      b64URL2b64(splitted[1])
    ].join(".");
  const algo = { name: "HMAC", hash: "SHA-256" };
  const data = encoder.encode(b64data);
  const b64sig = b64URL2b64(splitted[2]);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(FX_JWT_SECRET),
    algo,
    false,
    ["verify", "sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data)
  const correct = btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
  return correct == b64sig;
}

/**
 * Builds a cookie with Path set to /
 *
 * @param {string} key the cookie key.
 * @param {string} value the value the cookie will be set to.
 * @return {string} cookie to set
 **/
function buildCookie(key, value) {
  return `${key}=${value}; Path=/`;
}

/**
 * @param {string} key to be expired
 * @return {string} the expired cookie
 **/
function expireCookie(key) {
  return `${key}=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/ `;
}

/** A handler that removes any element it receives */
class OmitHandler {
  element(el) {
    el.remove();
  }
}

/** A handler that sets an attribute on itself 'login' to true if any
 * element is passed to it */
class LoginFormHandler {
  element(el) {
    if (el) loginTag = true;
  }
}

/**
 * Verify the request has a valid Customer Portal Foxy JWT
 *
 * @param {Request} request incoming Request
 * @returns {Promise<boolean>} true if valid
 */
async function verify(request) {
  const jwtString = getCookie(request, FX_CUSTOMER_JWT_COOKIE);
  if (!jwtString) return false;
  return verifySignature(jwtString);
}

/**
 * Simplifies a given URL string
 *
 * @param {string} dirtyURL to be fixed
 * @returns {string} fixed URL string
 */
function cleanURL(dirtyURL) {
  return dirtyURL
    .trim()
    .replace(/\/$/, "")
    .replace(/:\/\/+/, "://");
}

/**
 * Reverts the process of making Base64 compatible with URL
 *
 * @param {string} urlCompatible Base64 encoded string
 * @return {string} regular Base64 encoded string
 */
function b64URL2b64(urlCompatible) {
  // Replace non-url compatible chars with base64 standard chars
  let b64 = urlCompatible
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  // Pad out with standard base64 required padding characters
  const pad = b64.length % 4;
  if (pad) {
    if(pad === 1) throw new Error('InvalidLengthError');
    b64 += new Array(5-pad).join('=');
  }
  return b64;
}

/**
 * Handles the request
 *
 * @param {Request} request to be handled
 * @returns {Response|Promise<Response>} response
 */
async function handleRequest(request) {
  loginTag = false;
  const responsePromise = fetch(request);
  const session = await verify(request);
  if (session) {
    // User is authenticated
    const loginURL = new URL(FX_REDIRECT, request.url);
    if (cleanURL(request.url) === cleanURL(loginURL.toString())) {
      const destination = getCookie(request, FX_CUSTOMER_DESTINATION_COOKIE);
      if (destination) {
        // Remove destination cookie and redirect to destination
        return new Response(null, {
          headers: new Headers([
            ["location", destination],
            ["Set-Cookie", expireCookie(FX_CUSTOMER_DESTINATION_COOKIE)]
          ]),
          status: 303
        });
      }
    }
    return responsePromise;
  } else {
    const response = await responsePromise;
    const transformedResponse = new HTMLRewriter()
      .on("foxy-customer-portal", new LoginFormHandler())
      .on("[data-login]", new LoginFormHandler())
      .on("[data-restricted]", new OmitHandler())
      .transform(response);
    if (!loginTag && FX_REDIRECT) {
      const loginURL = new URL(FX_REDIRECT, request.url);
      const loginPage = loginURL.toString();
      if (cleanURL(request.url) !== cleanURL(loginPage)) {
        return new Response(null, {
          headers: new Headers([
            ["location", loginPage],
            [
              "Set-Cookie",
              buildCookie(FX_CUSTOMER_DESTINATION_COOKIE, cleanURL(request.url))
            ]
          ]),
          status: 302
        });
      } else {
        return transformedResponse;
      }
    } else {
      return transformedResponse;
    }
  }
}
