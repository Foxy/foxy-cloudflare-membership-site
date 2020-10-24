# `worker-template` Foxy.io Customer Portal Authentication Guard

A template for creating a Cloudflare Worker that will act as a guard to restrict access only to pages only for users authenticated at the Customer Portal.

** This Cloudflare Worker is meant to be used with Foxy Customer Portal ** : https://github.com/Foxy/foxy-customer-portal

You may use this worker as is or customize it on your own risk.

## How to use this repository


#### Configuring your worker

On your worker's page, under the `Settings` tab you can edit the variables used by this worker.

You may also configure them using the `wrangler.toml` file.

Look for the line `[vars]` and edit the values your variables:

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `FX_REDIRECT` | The URL an unauthenticated user must be redirected to. This is should be the URL where you have the `<foxy-customer-portal>` tag. | '/login' |
| `FX_OMIT` | If you wish the worker to remove any tags with the attribute `data-restricted` if the user is not authenticated.| "true" any other value is considered false |


##### Setting your JWT Shared Secret

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

The tool will ask you for your secret. You can then visit 
