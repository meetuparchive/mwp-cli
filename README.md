# Mope

The CLI for building apps with meetup-web-platform (internal).

## `mope`

### Synopsis

```
$ mope [--locales=<localeCodes>] <command> [<args>]
```

### Options

#### Supporting locales: `--locales=<localeCodes>`

Some commands build or run the application, and supporting multiple languages can make the build process slow, so only the default `en-US` locale will be loaded by default. To build/run more locales, there is a global `--locales` flag that can be used to specify additional supported locales. `en-US` will always be built because it is a hard-coded default and the application will behave in unexpected ways if it does not exist.

_Example_
```
$ mope build --locales=es,fr-FR,de-DR
```

### Commands

#### Build: `mope build`

We currently have 3 builds:

1. Browser renderer (React)
2. Server renderer (React)
3. App server (Node)

Each build varies between dev and production, e.g. the dev build supports hot module reloading, and the prod build is minified.

When building, the `/build` directory will be _completely removed_ before new files are created

##### Synopsis

```
$ mope build [browser|server|node]
```

1. No target (`mope build`): All bundles to the `/build` directory
2. Browser target: (`mope build browser`): Browser renderer to `/build/browser-app/*/app.js`
3. Server renderer target (`mope build server`): Server renderer to `/build/server-app/*/server-app.js`
4. App server target (`mope build node`): App server to `/build/app-server.js`

#### Run: `mope run`

(TBD - need to specify watch behavior)

### Dev vs Prod behavior

The best way to manage the dev/prod distinction is with the `NODE_ENV` environment variable - most Node tools assume that it is the single source of truth about dev vs prod, so no need to try to override it with a build script.

_Example_

```
$ NODE_ENV=production mope build
```
