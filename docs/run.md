## Run: `mope run`

_Only available in development._

This command spawns separate processes for the asset server (Webpack Dev Server)
and app server (Node - Hapi), and watches the consumer repo for code changes
that will hot-reload and restart the server as needed during development.

### Options

#### `--log-static`

Enable request logging for the Webpack Dev Server. This can be useful to see
what static asset requests are made be the app and how they are handled by WDS.
This logging is disabled by default because the logs are a little noisy and
interleaved with app server logs.
