const http = require('http');

const template = {
  html: (content) => `
  <html>
    <body>
      ${content}
    </body>
  </html>`,
  restricted: (content) => `<div data-restricted >${content}</div>`,
  unrestricted: (content) => `<div >${content}</div>`,
  login: (content) => `<div data-login >${content}</div>`,
}

let routes = {
  basic: function() {
    return template.html(
      template.unrestricted("Foo")
    );
  },
  restricted: function() {
    return template.html(
      [
        template.unrestricted("Foo"),
        template.restricted("Bar")
      ].join("")
    );
  },
  restrictedWithLogin: function() {
    return template.html(
      [
        template.unrestricted("Foo"),
        template.restricted(
          template.login("Bar")
        ),
      ].join("")
    );
  }
}

const server = http.createServer((request, response) => {
  const pages = Object.keys(routes);
  const found = pages.find( e => `/${e}` === request.url)
  if (found) {
    const headers = {
      'Content-Type': 'text/html; charset=UTF-8',
    };
    let statusCode = 200;
    let body = routes[found]();
    response.writeHead(statusCode, headers);
    response.end(body);
  } else {
    let statusCode = 404;
    response.writeHead(statusCode, {});
    response.end('Not found');
  }
});

module.exports = {
  start: function(PORT, customRoutes) {
    routes = { ...routes, ...customRoutes};
    server.listen(PORT, () => {
      console.log(`Server listening on port :${PORT} 🚀`);
    });
  },
  paths: Object.keys(routes),
  end: function() {
    server.close();
  }
}
