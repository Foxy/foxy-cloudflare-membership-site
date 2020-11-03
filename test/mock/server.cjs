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
  login: function() {
    return template.html(
      template.login("Foo")
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
        template.unrestricted(
          template.login("Foo")
        ),
        template.restricted(
          "Bar"
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

const PORT = 80;

server.listen(PORT, () => {
  console.log(`Server listening on port :${PORT} 🚀`);
});

