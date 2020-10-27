# Foxy.io Customer Portal Authentication Guard


## Deploy to Cloudflare Workers

Simply click the button bellow to go deploy. If you need them, instructions on filling the necessary information are bellow the button.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ndvo/foxy-customer-portal-guard)


1. Authorize Cloudflare to access your GitHub account
1. Connect to your Cloudflare account
    - Log in to your Cloudflare account, go to your profile page
    - Client ID: To get your Client ID, click the "Menu" next to Cloudflare's logo and, under "Products", click Workers. Your Client ID will be on the right sidebar.
    - API Token: Click the "API Tokens" tab. Select an appropriate token or create a new one. If you'll use an existing, on the rightmost menu choose "Roll" and copy the token. If you prefer to create a new one, click the "Create Token" button an select the template "Edit Workers".
1. Fork the repository: to create your own version of this worker.
1. Activate GitHub actions




A template for creating a Cloudflare Worker that will act as a guard to restrict access only to pages only for users authenticated at the Customer Portal.

**This Cloudflare Worker is meant to be used with Foxy Customer Portal** : https://github.com/Foxy/foxy-customer-portal

You may use this worker as is or customize it on your own risk.

## How to use this repository


### Configuring your worker

On your worker's page, under the `Settings` tab you can edit the variables used by this worker.

You may also configure them using the `wrangler.toml` file.

Look for the line `[vars]` and edit the values your variables:

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `FX_REDIRECT` | The URL an unauthenticated user must be redirected to. This is should be the URL where you have the `<foxy-customer-portal>` tag. | '/login' |
| `FX_OMIT` | If you wish the worker to remove any tags with the attribute `data-restricted` if the user is not authenticated.| "true" any other value is considered false |


#### Setting your JWT Shared Secret

You need to use the `wrangler` tool to set up your secret:

Installation instructions are provided here: https://developers.cloudflare.com/workers/cli-wrangler/install-update

Further documentation for Wrangler can be found [here](https://developers.cloudflare.com/workers/tooling/wrangler).

After installation, log in to Cloudflare:

```bash
wrangler login
```

It will open a browser for you to authenticate and then ask you to authorize `wrangler`.

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






