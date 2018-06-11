### Build: `mope build [<target>|push|pull|status]`

We currently have 4 builds:

1. Browser renderer (React)
2. Server renderer (React)
3. Vendor lib bundle (DLL)
4. TRN module generation

Browser and server builds vary between dev and production, e.g. the dev
build supports hot module reloading, while the prod build is minified.

This script does not clean the target directories - that behavior must be
managed by the CLI consumer.

#### Synopsis (build targets)

```
$ mope build [browser|server|vendor|trn]
```

1. Browser target: (`mope build browser`): Browser renderer to
   `/build/browser-app/*/app.js`
2. Server renderer target (`mope build server`): Server renderer to
   `/build/server-app/*/server-app.js`
3. Vendor target (`mope build vendor`): Javascript DDL bundles to
   `/build/browser-app/*` and manifest files to `build/vendor`
4. Trn target (`mope build trn`): Generate trn content modules to
   `/src/trns/modules/`

[Browser and server targets also support specifying locales](locales.md)

#### Synopsis (build push|pull)

```
$ mope build push --versionId=12345 --tag=foo
```

Push the build artifacts for the supplied version to cloud storage.
Tag the archive.

```
$ mope build pull --versionId=12345 --tags foo bar baz
```

Pull the build artifacts with the supplied tags for the supplied version from
cloud storage. Unpack them into the current directory.

#### Synopsis (build status)

```
$ mope build status [--id=12345] [--auto-cancel] [--min-interval=5000] [--repo=meetup/mup-web] [--token=asdf]
```

Check the Travis build status for the specified build ID, and optionally cancel
the build if another one has started within the `min-interval`. Defaults for most
options come from standard Travis environment variables - `auto-cancel` defaults
to `false`.

# The build

We are using [Webpack](https://webpack.js.org) to bundle our static assets.

The configuration for the Webpack builds are created by node-runnable scripts
in the `scripts/webpack/` directory. The configuration modules export functions
that take a `localeCode` and produce a corresponding Webpack configuration
object.

## Overview

The application comprises 4 basic components:

1. The browser-executed React rendering bundle (Browser-Render)
2. The server-executed React rendering bundle (Server-Render)
3. The application server bundle (App-Server)
4. The asset file server (Asset-Server)

The isomorphic/universal codebase is part of 1 and 2, but each bundle includes
some wrapping logic to package it for the target execution environment.

## Dev vs Prod behavior

The best way to manage the dev/prod distinction is with the `NODE_ENV`
environment variable - most Node tools assume that it is the single source of
truth about dev vs prod, so no need to try to override it with a build script.

## Production

In production, we need to build artifacts - on-disk JavaScript files that can be
run/served by Node. We also need to version the Browser-Render filename to
enable long-term browser caching.

Other static assets are generated as a side-effect of the Browser-Render build.

### Browser vs Server Render bundle

The browser-executed React bundle runs entirely inside a `<div>` provided by the
server-rendered HTML, while the server-executed React bundle must produce a
complete HTML document, from `<!DOCTYPE html>` to `</body>`. The server-executed
React bundle therefore includes the `<script>` tag that loads the browser-
executed bundle (so meta!), as well as `<link>` tags for any CSS assets produced
by the browser build.

### Bundling

The bundles have a linear runtime dependency chain:

Server (3) <- Server-Render (2) <- Browser-Render (1)

We use custom Node-executable scripts to coordinate the Webpack build rather
than using the Webpack CLI directly, primarily to generate language-specific
bundles that can be defined programmatically (more info below).

At a high level, the build routine does the following:

1. Build a Browser-Render bundle for a single language
2. Pass the resulting bundle filename to step 3
3. Build a Server-Render bundle that injects the Browser-Render filename into
   the built files so that they will render the corresponding `<script>`/
   `<link>` tags.
4. (in parallel with 1) Build the server, which will consume the Server-Render
   bundles from an import path defined as a constant before the build.

Steps 1-3 are run multiple times in parallel child processes - once for each
supported language.

Each build step has a corresponding Node script in `scripts/`, although because
of the current build-time dependency, only the Server-Render script
(`build-server-app`) and the App-Server script (`build-server`) are directly
executable - the Server-Render script manages the Browser-Render dependency
internally.

#### Possible optimizations

1. Consolidate the separate language-specific build processes into a single
   process that still produces separate bundles, but can leverage in-process
   build caching to improve overall performance while (potentially) simplifying
   the build script, which would no longer have to coordinate spawned child
   processes. [WP-364](https://meetup.atlassian.net/browse/WP-364)

### Bundling translated message modules

We have 2 primary requirements for bundling translated message content:

1. Only load translated messages for the current `localeCode`.
2. Only load translated messages that the currently-loaded app code can render,
   i.e. avoid loading translations for components that are not available.

The first challenge is defining the translated message import path in a way that
is localeCode-aware.

A naive approach would simply require the modules based on a runtime localeCode
variable, e.g.:

```js
// naive import (bad)
const messages = require(`trns/${localeCode}/path/to/messages`);
```

However, since this dependency path can't be resolved at build time, Webpack
will bundle all potentially-matching modules into the same chunk to guarantee
that they will be available at runtime. This means that the translations for all
languages would be put together into a single chunk, violating goal 2.

We therefore have to use a static module path, e.g.

```js
// static import (good)
import messages from 'trns/path/to/messages';
```

There are 3 strategies for bundling in a way that allows the correct language to
be imported using this 'static' import syntax;

1. Build the application once for each language, and use a different
`resolve.alias` rule for each build, bundling the language dependencies into the
app code.
2. Build language-specific 'external' bundles that each export the same global
`'trns/path/to/messages'` variable, tell Webpack to look for
`'trns/path/to/messages'` imports in the global namespace, and ensure that only
the relevant language bundle has been loaded.
3. Build app-independent language bundles, but import them all dynamically using
async `import()` calls.

We are using **option 1**, using `resolve.alias` to resolve the language-
specific modules for each build.

`resolve.alias` allows us to correctly resolve the language imports at build
time and have them automatically honor code-split points defined by dynamic
`import()` calls at the cost of requiring multiple build passes on the full app,
most of which doesn't change based on `localeCode`. An integrated build routine
that still produced multiple bundles from a single compile process might improve
the build time, but would not affect the output bundle content.

Option 2, using `externals`, has a couple of major disadvantages - first, it
doesn't work very well in Node, where you can't easily swap out globals on a
per-request basis, and second, the language bundles don't have any awareness of
code split points within the application because they are bundled independently
of the application.

Option 3, using dynamic `import()` might technically work, but would require a
request-per-trn'ed-component in the browser, which result in dozens of separate
calls, and would require some pretty sophisticated (read: complex) async
rendering throughout the application.

### More considerations:

There are three ways to build translated message modules:

1. **Standalone trns module** - assume that all existing translated messages in
   all languages can be bundle together into a single chunk

    **Problem: huge bundle** - tens of thousands of translated messages per
    chunk

2. **Standalone language-specific module bundle** - assume all translated
   messages for each language can be bundled together into language-specific
   chunks

    **Problem: large bundle** - thousands of translated messages per chunk

3. **Bundle trn modules with app code** - split translated messages by language
   and follow application-defined code split points

    **Problem: must bundle the app once-per-language** in order to correctly
      bundle the chunks

We are bundling trn modules with the app code (option 3), which again is slower
than 1 or 2, but produces the optimal chunk contents.

## Dev

In dev, we typically don't need a complete build of the application, e.g. we
don't need versioned static assets, multiple language builds, and minification.

We can also activate some dev-friendly features like Hot Module Reloading (HMR)
and rebuilding/restarting the app server when files change. These features are
all bundled into a single `yarn` command:

```
yarn start:dev
```

This command clears the `build/` directory, and starts the dev servers, logging
all output to a single terminal window. Killing the process also stops the
servers.

![Dev build diagram](https://cloud.githubusercontent.com/assets/1885153/25740567/2e720834-31db-11e7-9370-923211cf1459.png)

### Description

The complete application requires 3 bundles:

A. Browser application
B. Server application (mostly the same as A)
C. Node app server

Each of these bundles has its own configuration, and both (A) and (B) can be
split into multiple independent languages bundles that resolve TRN
dependencies independently.

In dev, each bundle is compiled by Webpack in 'watch mode', meaning that the
`entry` script and its dependencies will be watched for changes, and the
bundle will be rebuilt immediately.

In addition to bundling, the bundles must be _served_.

The Browser application (A) is compiled, watched, and served by the Webpack
Dev Server. The Server application and Node app server are bundled by
separate compilers, and then served by a process that can be restarted when
a new bundle is created.

This script manages all aspects of the dev server:

1. Start the Webpack Dev Server for the Browser application bundle (A)\*
2. Start the Webpack watch-mode compiler for the Server application (B)
3. Start the Webpack watch-mode compiler for the Node app server (C)
4. Start the Node app server when (B) is built\*
5. Start the Node app server when (C) is built\*
6. _Re_-start the Node app server when (B) is _re_-built
7. _Re_-start the Node app server when (C) is _re_-built

_\*: **Child process**_

### Assumptions

1. You only want to build a single language (This could probably be enabled)
2. The bundle filenames are not hashed (This might be allowable if we work out
   ManifestPlugin)
3. You will not be adding new translations (not relevant to the starter kit, but
   we'll need to account for it in mup-web - shouldn't be too difficult)
4. You don't want to build the service worker script (fine for now, and
   relatively easy to enable in the future)

### References

- Webpack Node API for compiling in watch mode: https://webpack.js.org/api/node/#watching
- Configuring watch mode behavior: https://webpack.js.org/configuration/watch/#watchoptions
- Webpack Dev Server: https://webpack.js.org/configuration/dev-server/

## Analyzing the bundle

Webpack is configured to write its
[build stats](https://webpack.js.org/api/node/#stats-object) to a file
alongside each bundle. These stats JSON files can be analyzed with
various tools.

### References

- Webpack stats config docs: https://webpack.js.org/api/cli/#common-options
- Summary of webpack build analyzers:
  https://survivejs.com/webpack/optimizing/analyzing-build-statistics/
