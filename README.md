# Foxy.io Customer Membership Site

**This Cloudflare Worker is meant to be used with Foxy Customer Portal** : https://github.com/Foxy/foxy-customer-portal

## Overview

[Cloudflare Workers](https://workers.cloudflare.com) sit on the "edge" between the Frontend and the Backend.

You can set a Cloudflare Worker to your domain, regardless of where your server lives.

This worker uses [Foxy.io Customer Portal Authentication](https://github.com/Foxy/foxy-customer-portal) to give you the ability to restrict access to certain pages or certain sections of your pages only to authenticated users.

This means you can provide a restricted area even if you are working with a JAMStack application such as 11ty.js, a purely static HTML page or a website running in a third party server.

### Restrict access to pages

- set the `FX_REDIRECT` variable to the Customer Portal page.
- set the routes to be protected in the Workers tab of your domain administration in Cloudflare
  - Go to your domain settings
  - click on the Workers button
  - click "Add route" and set the worker to use and the routes it should be active on
- the Customer Portal Page must also be a protected route.

### Restrict access to tags

If you wish to restrict certain tags within a page add a `data-restricted` attribute to the tags you want to restrict.

You may set an empty value to `FX_REDIRECT` if you don't want the user to be redirected.

Example:

```html
<header>
  ...
  <div data-restricted>Welcome back</div>
</header>
<main>
  <foxy-customer-portal endpoint="..."></foxy-customer-portal>
</main>
```

# How to set up

#### Setup Overview

1. Fork this repository
1. Set up GitHub secrets in your forked repository
1. Set up Cloudflare for your domain, set to proxy.
1. Deploy to Cloudflare Workers using the provided GitHub action

## Fork this repository

Click the "fork" button on the top right of this page. Give your repository a proper name.

This step allows you to use this worker without the need to create a development environment and use `wrangler`.
If you are familiar with `wrangler` you can simply use `wrangler secret` and `wrangler publish` without the need to use GitHub Actions.

## Set up GitHub secrets

In you forked repository, click the "**Settings**" tab, then the "**Secrets**" tab.

Using the "New secret" button create the following secrets:

| Secret              | Description                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CF_ACCOUNT_ID`     | This is your Cloudflare Id. To get your ID, click the "Menu" next to Cloudflare's logo and, under "Products", click Workers. Your Client ID will be on the right sidebar. [How to get my Cloudflare Id](https://developers.cloudflare.com/workers/learning/getting-started#6a-obtaining-your-account-id-and-zone-id)                           |
| `CF_API_TOKEN`      | This is your API token. Click the "API Tokens" tab. Select an appropriate token or create a new one. If you'll use an existing, on the rightmost menu choose "Roll" and copy the token. [How to get my Cloudflare API token](https://developers.cloudflare.com/workers/learning/getting-started#option-1-obtaining-your-api-token-recommended) |
| `JWT_SHARED_SECRET` | This is the Shared Secret. If you have already configured your Customer Portal, use the same Shared Secret Key. [How to configure my Customer Portal](#how-to-configure-my-customer-portal).                                                                                                                                                   |

If your are using `wrangler` you can configure `JWT_SHARED_SECRET` using `wrangler secret` and use `wrangler config` or `wrangler login` to configure the Cloudflare authentication variables.

## Set up Cloudflare for your domain and DNS

This step is far beyond the scope of this readme, but Cloudflare's docs are good. Note that you must be using Cloudflare's DNS set to "proxy" (the orange cloud next to the record) for this whole thing to work. Some systems (like [Webflow](https://webflow.com/)) might instruct you not to do this, but it is _usually_ fine.

For safety, we do recommend making sure Cloudflare's Rocket Loader is _disabled_. This piece has been known to cause problems, especially with ecommerce sites.

## Configuring your worker

On your worker's page, under the `Settings` tab you can edit the variables used by this worker.

You may also configure them using the `wrangler.toml` file.

Look for the line `vars = { ... }` and edit the values your variables:

| Variable      | Description                                                                                                                       | Example  | Default            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| `FX_REDIRECT` | The URL an unauthenticated user must be redirected to. This is should be the URL where you have the `<foxy-customer-portal>` tag. | '/login' | '/customer-portal' |

### Deploy your worker

- Access the "Actions" tab in your GitHub repository.
- Click the "Deploy to Cloudflare Workers" tab.
- Click the "Run workflow" button.

If you wish to deploy to Cloudflare after each push, edit the `.github/workflows/deploy.yml` file, and add these lines bellow the second line:

```
  push:
    branches:
      - main
```

### Configure your Domain

If your domain is not yet using Cloudflare's services, log in to your Cloudflare's account, click the "Add site" button and follow the instructions.

Please note that to use this service you will need to configure your domain to use Cloudflare's nameservers.

When your domain is active, access your domain configuration page by clicking its box in your Cloudflare panel, then click the "Workers" button and finally click the "Add route" button.

This interface will allow you to choose to which pages in your site the worker will be active.

**This worker should be active in all pages you wish to restrict access.**

**This worker should be also active in the FX_REDIRECT URL.** That is, the URL where the `<foxy<foxy-customer-portal>` tag lives.

Example:

Use `customer/*` to protect pages such as `customer/members-only-products` and `customer/reach-out`.

**Be careful with trailing slashes when setting your routes**. [Learn more about matching behaviour of routes](https://developers.cloudflare.com/workers/platform/routes#matching-behavior)

You can also use the `routes` variable within `wrangler.toml` file to set the target routes.

Example:

```toml
routes = ["restricted/*", "restricted", "dashboard" ]
```

# Development

If you wish to customize this Worker, the instructions bellow may be helpful setting up your development environment.

## How to configure my Customer Portal

This document does not aim to explain how to use your Customer Portal.

We're outlining here the basic steps you need to go through to use you Customer Portal in order to help those who are not using that feature yet.

Documentation for the Customer Portal Settings can be found here:

- `https://docs.foxycart.com/v/2.0/customer_portal`
- `https://api.foxycart.com/rels/customer_portal_settings`

You will be using the [Foxy API](https://api.foxycart.com/docs) in order to create your Customer Portal.
You will find it's documentation here:

- https://api.foxycart.com/docs

### Creating the Customer Portal

You can use Postman or similar tool to create your Customer Portal.

- if you are unfamiliar with this check out this video about exploring FoxyAPI with Postman: https://www.youtube.com/watch?v=Merz57p9Fcc

You can create your Customer Portal following these API links:

- `API Home` » `fx:store` » `fx:customer_portal_settings`

### Configuring your Customer Portal

You will need to configure your Customer Portal providing:

- a `jwtSharedSecret`, which should be also provided as a secret to the worker.
- the `allowedOrigins`
- the `SSO` option

#### Shared Secret
Use a PUT or PATCH request to configure your Customer Portal.

The `jwtSharedSecret` value must be the same in both the Customer Portal and this worker.

You set this value when configuring the Customer Portal.
Please, note that the secret **must not be public and must not be shared**.

#### Allowed Origins

You need to add these cloudflare domains to the allowed origins:

- https://cloudflareworkers.com
- https://dash.cloudflare.com

#### SSO option
Set `SSO` to true.

### Using the API to list and create customers

You can check your existing customers using this API path:

`API Home` » `fx:store` » `fx:customers`

You can POST to `fx:customers` to create a new customer to test this Worker.

### How to create a secure secret

The following OpenSSL command can be used to generate a new secret, if you need it.

```bash
openssl rand -base64 60
```

## Development environment

You'll need `wrangler` to run your worker in a development environment. [View instructions to install it.](https://developers.cloudflare.com/workers/cli-wrangler/install-update)
You'll need `cloudflared` to view logs from production, if you need it. [View instructions to install it.](https://developers.cloudflare.com/argo-tunnel/downloads)

Installation instructions are provided here: https://developers.cloudflare.com/workers/cli-wrangler/install-update

Further documentation for Wrangler can be found [here](https://developers.cloudflare.com/workers/tooling/wrangler).

After installation, authenticate to Cloudflare.

You can do this in one of two ways: with `wrangler login` or `wrangler config`.

- Authenticate with `wrangler login`. It will open a browser for you to authenticate and then ask you to authorize `wrangler`.

```bash
wrangler login
```

- Authenticate with `wrangler config`. First grab your token from your Cloudflare Workers account (you can find a link on the sidebar at the Workers page in your account).

```bash
wrangler config
```

### Run a development environment

```bash
wrangler preview --watch
```

### View logs from production (real time)

```bash
wrangler tail --env production
```

You can use [jq](https://stedolan.github.io/jq/) to display a nicely formatted JSON.

```bash
wrangler tail --env production | jq
```

### Setting your JWT Shared Secret with wrangler

You need to use the `wrangler` tool to set up your secret:

Next, set your secret:

```bash
wrangler secret put FX_JWT_SECRET
```

The tool will ask you for your secret. This is the secret you created when setting your Customer Portal.

### Automated tests

This repository includes a second worker in the `mock` directory that is used in automated tests.

Tests are executed against a live server because tests are executed "on the edge", that is, in Cloudflare's servers.

To overcome this difficulty a very simple server is provided for tests. Upon running `npm run test:start-worker` a Cloudflare Worker will be published in your account to service a mock website against which the tests will run.

Please note that you will need to remove this mock worker manually from your account.
