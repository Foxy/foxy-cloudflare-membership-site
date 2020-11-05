addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const template = {
  html: content => `
  <html>
    <body>
      ${content}
    </body>
  </html>`,
  restricted: content => `<div data-restricted >${content}</div>`,
  unrestricted: content => `<div >${content}</div>`,
  login: content => `<div data-login >${content}</div>`,
  customerPortal: content =>
    `<foxy-customer-portal endpoint="" >${content}</foxy-customer-portal>`
};

let routes = {
  basic: function() {
    return template.html(template.unrestricted("Foo"));
  },
  "customer-portal": function() {
    return template.html(template.login("Foo"));
  },
  restricted: function() {
    return template.html(
      [template.unrestricted("Foo"), template.restricted("Bar")].join("")
    );
  },
  restrictedWithLogin: function() {
    return template.html(
      [
        template.unrestricted(template.login("Foo")),
        template.restricted("Bar")
      ].join("")
    );
  }
};

async function handleRequest(request) {
  const pages = Object.keys(routes);
  const found = pages.find(e => request.url.endsWith(`/${e}`));
  let body;
  let statusCode;
  if (found) {
    statusCode = 200;
    body = routes[found]();
  } else {
    statusCode = 404;
    body = "Not found";
  }
  return new Response(body, {
    headers: [["Content-Type", "text/html; charset=UTF-8"]],
    status: 200
  });
}
