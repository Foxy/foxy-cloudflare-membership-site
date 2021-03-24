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
      .on("foxy-customer-portal", new ReloadOnLoginHandler())
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
 * Verify JWT token
 *
 * Uses the stored shared secret to verify a JWT token.
 * Verification is done using the Cloudflare Crypto Library. It's interface is
 * similar to the webworkers subtle crypto library.
 *
 * @param {string} token to be verified
 */
async function verifySignature(token) {
  const encoder = new TextEncoder();
  // Prepares the signed data to be verified.
  const parts = token.split(".");
  const data = encoder.encode([parts[0], parts[1]].join('.'));
  // Prepares the signature.
   const signature = new Uint8Array(
     Array.from(
       atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'))
     ).map(c => c.charCodeAt(0)));
  // Build the key.
  let key;
  try {
    key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(FX_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch (e) {
    if (e.name === "ReferenceError") {
      console.error(e);
      return false;
    } else {
      throw e;
    }
  }
  const result = await crypto.subtle.verify("HMAC", key, signature, data);
  return result;
}

/**
 * @param {string} key to be expired
 * @return {string} the expired cookie
 **/
function expireCookie(key) {
  return `${key}=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/ `;
}

/** A handler that sets an attribute on itself 'login' to true if any
 * element is passed to it */
class LoginFormHandler {
  element(el) {
    if (el) loginTag = true;
  }
}

/** A handler that removes any element it receives */
class OmitHandler {
  element(el) {
    el.remove();
  }
}

/** Adds a script to reload on signout and signin events */
class ReloadOnLoginHandler {
  element (el) {
    el.after(`
<script>
  var els = document.getElementsByTagName("${el.tagName}");
  var reloadable = els[els.length -1];
  if (reloadable) {
    reloadable.addEventListener("signout", () => window.location.reload());
    reloadable.addEventListener("signin", () => window.location.reload());
  }
</script>`,  { html: true}
    );
  }
}

