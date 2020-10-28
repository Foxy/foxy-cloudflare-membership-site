# Foxy.io Customer Portal Authentication Guard

### Overview

Cloudflare Workers sit on the "edge" between the Frontend and the Backend.

You can set a Cloudflare Worker to your domain, regardless of where your server lives.

It works even if your server is operated by a third party.

The Foxy.io Customer Portal Authentication Guard is a Cloudflare Worker that takes advantage of the fact that your customer is already logged in with Foxy Customer Portal to give you the ability to restrict access to certain pages or certain sections of your pages only to authenticated users.

This means you can provide a restricted area even if you are working with a JAMStack application such as 11ty.js, a purely static HTML page or a website running in a third party server.

Here's how it works:

1. You create an account at Foxy.io
1. You create an account at Cloudflare
1. You configure your Domain to use Cloudflare's nameservers
1. At this step you get enhanced protection and performance for free from Cloudflare up until 100.000 requests per month
1. You set up your Customer Portal from Foxy.io. Now your customers will have a dynamic portal to check their purchases and other details inside your application, wherever it is hosted.
1. You configure this guard. Now you can configure restricted pages or even restricted sections within a page.


## Deploy to Cloudflare Workers

Simply click the button bellow to go deploy. If you need them, instructions on filling the necessary information are bellow the button.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ndvo/foxy-customer-portal-guard)


1. Authorize Cloudflare to access your GitHub account
1. Connect to your Cloudflare account
    - Log in to your Cloudflare account, go to your profile page and grab your *Client ID* and *API Token*:
        - **Client ID**: To get your Client ID, click the "Menu" next to Cloudflare's logo and, under "Products", click Workers. Your Client ID will be on the right sidebar.
        - **API Token**: Click the "API Tokens" tab. Select an appropriate token or create a new one.
            - If you'll use an existing, on the rightmost menu choose "Roll" and copy the token.
            - If you prefer to create a new one, click the "Create Token" button an select the template "Edit Workers".
1. Fork the repository: to create your own version of this worker.
1. Activate GitHub actions


A template for creating a Cloudflare Worker that will act as a guard to restrict access only to pages only for users authenticated at the Customer Portal.

**This Cloudflare Worker is meant to be used with Foxy Customer Portal** : https://github.com/Foxy/foxy-customer-portal

You may use this worker as is or customize it on your own risk.


### Configuring your worker

On your worker's page, under the `Settings` tab you can edit the variables used by this worker.

You may also configure them using the `wrangler.toml` file.

Look for the line `[vars]` and edit the values your variables:

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `FX_REDIRECT` | The URL an unauthenticated user must be redirected to. This is should be the URL where you have the `<foxy-customer-portal>` tag. | '/login' |
| `FX_OMIT` | If you wish the worker to remove any tags with the attribute `data-restricted` if the user is not authenticated.| "true" any other value is considered false |

### Configure your Domain

If your domain is not yet using Cloudflare's services, log in to your Cloudflare's account, click the "Add site" button and follow the instructions.

Please note that to use this service you will need to configure your domain to use Cloudflare's nameservers.

When your domain is active, access your domain configuration page by clicking its box in your Cloudflare panel, then click the "Workers" button and finally click the "Add route" button.

This interface will allow you to choose to which pages in your site the worker will be active.

**This worker should be active in all pages you wish to restrict access.**

Example:

Use `customer/*` to protect pages such as `customer/members-only-products` and `customer/reach-out`.

Be careful with trailing slashes when setting your routes. [Learn more about matching behaviour of routes](https://developers.cloudflare.com/workers/platform/routes#matching-behavior)


#### Setting your JWT Shared Secret

You need to use the `wrangler` tool to set up your secret:

Installation instructions are provided here: https://developers.cloudflare.com/workers/cli-wrangler/install-update

Further documentation for Wrangler can be found [here](https://developers.cloudflare.com/workers/tooling/wrangler).

After installation, authenticate to Cloudflare.

You can do this in one of two ways: with `wrangler login` or `wrangler config`.

- Authenticate with `wrangler login`. It will open a browser for you to authenticate and then ask you to authorize `wrangler`.

```bash
wrangler login
```

- Authenticate with `wrangler config`. First grab your token from your Cloudflare Workers account

```bash
wrangler config
```

Next, set your secret:

```bash
wrangler secret put FX_JWT_SECRET
```

The tool will ask you for your secret. This is the secret you created when setting your Customer Portal.
Please, refer to [How to configure my Customer Portal] bellow if you need to configure your Customer Portal.


#### How to configure my Customer Portal

This document does not aim to explain how to use your Customer Portal.

We're outlining here the basic steps you need to go through to use you Customer Portal in order to help those who are not using that feature yet.

Documentation for the Customer Portal Settings can be found here:

- `https://docs.foxycart.com/v/2.0/customer_portal`
- `https://api.foxycart.com/rels/customer_portal_settings`


You will be using the [Foxy API](https://api.foxycart.com/docs) in order to create your Customer Portal.
You will find it's documentation here:

- https://api.foxycart.com/docs

You can create your Customer Portal following these API links:


`API Home` » `fx:store` » `fx:customer_portal_settings`

Use a PUT or PATCH request to configure your Customer Portal.

In order to use the Customer Portal Authentication Guard you'll need to provide the Guard the `jwtSharedSecret`.

You set this value when configuring the Customer Portal. Please, note that the secret must not be public and must not be shared.
The following OpenSSL command can be used to generate a secret.

```bash
openssl rand -base64 60
```

Set `SSO` to true.

Notice you can check your existing customers using this API path:

`API Home` » `fx:store` » `fx:customers`

You can POST to `fx:customers` to create a new customer to test the Guard.

# Development


You'll need `wrangler` to run your worker in a development environment. 
You'll need `cloudflared` to view logs from production, if you need it. [View instructions to install it.](https://developers.cloudflare.com/argo-tunnel/downloads)



