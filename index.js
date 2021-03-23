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
    if (el) {
      loginTag = true;
      el.after(reloadScript, {html: true} );
    }
  }
}

/** A handler that removes any element it receives */
class OmitHandler {
  element(el) {
    el.remove();
  }
}

/**
 * This script makes foxy-customer-portal login reload on successful login.
 *
 * It should be added after the foxy-customer-portal tag.
 */
const reloadScript = `<script>
    (function () {
        var authenticated;
        var activeSubs;
        var activeSubCodes = [];
        var transactionCodes = [];
        var useLatestTransactionOnly = true;
        var customerFirstName;
        var protectedPath = "/members";
        var loginOrSignupPath = "/";
        var portal = document.getElementsByTagName("foxy-customer-portal")[0];

        // Allow overriding of class names.
        var classIfAuthenticated = "foxy-show-if-authenticated";
        var classIfAnonymous = "foxy-show-if-anonymous";
        var classIfSubscriber = "foxy-show-if-subscriber";
        var classIfNotSubscriber = "foxy-show-if-not-subscriber";
        var classIfSubscriberByCode = "foxy-show-if-subscribed-to-"; // subscription code is appended to the end of this class
        var classIfTransactionByCode = "foxy-show-if-transaction-with-"; // transaction code is appended to the end of this class
        var classCustomerFirstName = "foxy-customer-first-name";

        var removeElements = function (className) {
            Array.prototype.slice
                .call(document.querySelectorAll("." + className))
                .forEach(e => {
                    e.remove();
                });
        };

        var updatePage = function () {
            authenticated
                ? removeElements(classIfAnonymous)
                : removeElements(classIfAuthenticated);
            (authenticated && activeSubs)
                ? removeElements(classIfNotSubscriber)
                : removeElements(classIfSubscriber);

            var subCodeClasses = activeSubCodes.map(code => {
                return classIfSubscriberByCode + code;
            });
            Array.prototype.slice
                .call(document.querySelectorAll('[class*="' + classIfSubscriberByCode + '"]'))
                .forEach(el => {
                    var codeClass = el.className.match(new RegExp(classIfSubscriberByCode + "([^ ]+)"));
                    if (!codeClass || !subCodeClasses.includes(codeClass[0])) {
                        el.remove();
                    }
                });

            var transactionCodeClasses = transactionCodes.map(code => {
                return classIfTransactionByCode + code;
            });
            Array.prototype.slice
                .call(document.querySelectorAll('[class*="' + classIfTransactionByCode + '"]'))
                .forEach(el => {
                    var codeClass = el.className.match(new RegExp(classIfTransactionByCode + "([^ ]+)"));
                    if (!codeClass || !transactionCodeClasses.includes(codeClass[0])) {
                        el.remove();
                    }
                });

            if (customerFirstName) {
                Array.prototype.slice
                    .call(document.querySelectorAll('.' + classCustomerFirstName))
                    .forEach(el => {
                        el.innerHTML = customerFirstName;
                    });
            }

            if (
                window.location.pathname.match(new RegExp("^" + protectedPath))
                && (!authenticated || !activeSubs)
            ) {
                window.location.assign(window.location.origin + loginOrSignupPath);
            }
        };

        var init = function () {
            try {
                authenticated = document.cookie.match(/fx\.customer=([^;]+)/)[1];
                subData = document.cookie.match(/fx\.customer\.subs=([^;]+)/)[1];
                activeSubs = subData.split("|")[0];
                if (subData.indexOf("|") > -1) {
                    activeSubCodes = subData.substring(subData.indexOf('|') + 1).split("|");
                }
                transactionCodes = document.cookie.match(/fx\.customer\.transactions=([^;]+)/)[1].split("|");
                customerFirstName = document.cookie.match(/fx\.customer\.firstName=([^;]+)/)[1];
            } catch { }
            if (!authenticated) clearCustomCookies();
            updatePage();
        };

        var clearCustomCookies = function () {
            document.cookie = "fx.customer.subs=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "fx.customer.transactions=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "fx.customer.firstName=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
            activeSubs = 0;
            activeSubCodes = [];
            transactionCodes = [];
            customerFirstName = false;
        }

        if (portal) {
            portal.addEventListener("signout", function (e) {
                clearCustomCookies();
                window.location.reload();
            });
            portal.addEventListener("signin", function (e) {
                portal.addEventListener("update", function (e) {
                    var subs = [];
                    var transactions = [];
                    var active = 0;
                    var sCodes = [];
                    var tCodes = [];
                    if (e.detail._embedded && e.detail._embedded["fx:subscriptions"]) {
                        subs = e.detail._embedded["fx:subscriptions"];
                    }
                    for (var i = 0; i < subs.length; i++) {
                        var sub = subs[i];
                        if (sub.is_active) {
                            active += 1;
                            var items = sub._embedded["fx:transaction_template"]._embedded["fx:items"];
                            for (let o = 0; o < items.length; o++) {
                                if (items[o].code != "") {
                                    sCodes.push(items[o].code);
                                }
                            }
                        }
                    }
                    if (active > 0) {
                        var data = active;
                        if (sCodes.length > 0) {
                            data += "|" + sCodes.join("|")
                        }
                        document.cookie = "fx.customer.subs=" + data + ";path=/;secure;samesite=strict";
                    } else {
                        document.cookie = "fx.customer.subs=0;path=/;secure;samesite=strict";
                    }

                    if (e.detail._embedded && e.detail._embedded["fx:transactions"]) {
                        transactions = e.detail._embedded["fx:transactions"];
                    }
                    for (var i = 0; i < transactions.length; i++) {
                        var items = transactions[i]._embedded["fx:items"];
                        for (let o = 0; o < items.length; o++) {
                            if (items[o].code != "") {
                                tCodes.push(items[o].code);
                            }
                        }

                        if (useLatestTransactionOnly && i == 0) break;
                    }

                    if (tCodes.length > 0) {
                        document.cookie = "fx.customer.transactions=" + tCodes.join("|") + ";path=/;secure;samesite=strict";
                    }

                    document.cookie = "fx.customer.firstName=" + e.detail.first_name + ";path=/;secure;samesite=strict";
                    window.location.reload();
                });
            });
        }

        init();
    })();
</script>`;
