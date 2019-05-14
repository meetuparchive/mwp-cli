# [9.0]

*   **Removed** unused 'e2e' tests that had a heavy dependency we don't need
    to maintain

# [8.6]

*   **New feature** `mope build report` - reads from the stats.json output of a
    webpack build and reports chunk sizes to DataDog. The reported metrics are

    *   `mwp.bundle.size` (total JS asset size)
    *   `mwp.bundle.chunk_size` (individual chunk size)

    Use the metric tags to filter by chunk name, application (e.g. mup-web or pro-web),
    and build number

# [8.5]

*   **New feature** `mope deploy time track` Sending deploy metrics to Datadog
    instead of New Relic Insights.

# [8.3]

*   **New feature** `mope deploy stop --versionId=...` to stop a specific deployed
    version in the cloud - this will free resources for deployments that are not
    expected to receive traffic

# [8.2]

*   **New feature** `--force` flag on `mope deploy create` will redeploy the build
    even if the instance is running. Should be used with caution.

# [8.1]

*   **New feature** `mope build trn` will now also write 'pickerLocale' modules
    that can be imported just like other TRN modules. The values can be passed
    as `datepickerOptions.locale` params to MWC `CalendarComponent` in order to
    localize the date picker.

    Import syntax aligns other TRN imports - be sure to key into the `pickerLocale`
    map using the appropriate `localeCode`

    ```jsx
    import pickerLocale from 'trns/date/pickerLocale';
    ...
    <CalendarComponent datepickerOptions={{ locale: pickerLocale[localeCode] }} />
    ```

# [8.0]

*   **BREAKING CHANGE** `mope deploy create` will no longer migrate traffic to the
    newly-created deployment. Instead, call `mope deploy migrate` as a separate
    command in order to migrate traffic.

    Separating these commands allows the deployment to be created before all testing
    (e.g. e2e testing) has completed, which allows it to be done in parallel with
    testing.

*   **BREAKING CHANGE** `mope build` will run any files matching `main.scss`
    through PostCSS. Inline loaders should no longer be used on `main.scss`.
    Expect warnings from PostCSS until we remove unneeded browser prefixes

    For example in `cssLinks.js`:
    this: `const baseCSSHref = require('file-loader?name=[name].[hash:7].css!extract-loader!css-loader!sass-loader!../assets/scss/main.scss');`
    becomes: `const baseCSSHref = require('../assets/scss/main.scss');`

*   **New feature** `mope deploy delete` to safely delete a version - useful for
    cleanup.

# [7.2]

*   **New feature** `mope build status` check the status of a Travis build, and
    optionally auto-cancel if a newer build was started recently

# [7.1]

*   **New feature** `mope build push` upload app bundle to cloud storage
*   **New feature** `mope build pull` download app bundles from cloud storage as
    they become available from a standalone build

# [7.0]

*   **BREAKING CHANGE** `mope deploy` is now `mope deploy create`
*   **New feature** `mope deploy clean` for safely stopping/removing old deployments

# [6.1]

*   **New feature** `time` - track start/stop times and send results to New Relic
    Insights. [Docs](docs/time.md)

# [6.0]

*   **Refactored** `build trn` and `run` will both bundle the app code so that a
    single bundle supports all languages _in development_ - this makes for a very
    large app bundle, but that should be fine in dev and it avoids having to
    hassle with running the app with `--locales` options

*   **New feature** `build [server|browser]` will now write a single bundle
    supporting all languages if the calling application specifies
    `config.combineLanguages: true` in its `package.json`.

# [5.0]

*   **Refactored** `build trn` now writes JSON as a map of
    `{ [localeCode]: messages }`. Consumer apps **must** upgrade `mwp-i18n` to
    version 12.1 or later in order for translations to continue working.

*   **New feature** `build trn` can also now write a single translation source
    module for each translated component that contains translations for all
    supported languages rather than writing separate source modules for each
    supported language. Set `config.combineLanguages` to `true` in your app's
    `package.json` to enable this build option.

# [4.0]

*   **Removed** `src/config` has been moved to `mwp-config` package managed by
    MWP repo

# [3.0]

*   Oauth values are no longer part of config - they are not used in MWP v10.2+

# [2.2]

*   Support for `webfont` alias, which will resolve to `src/assets/fonts` for all
    languages except Russian, which will resolve to `src/assets/fonts/ru-RU`. This
    alias is useful for referencing a separate Cyrillic-supporting webfont.

# [2.1]

*   Support arbitrary repo owner for `gh status` command - enables status in PRs
    from forked repos

# [2.0]

*   **Breaking change** - `file-loader!` and `raw-loader!` will no longer work inline.
    Webpack config will handle the them based on extension.

# [1.5]

*   **New feature** - `mope tx keys` displays list of resources and their keys

# [1.4]

*   **New feature** - eslint-loader removed from webpack compile.

# [1.3]

*   **New feature** - `mope tx status` to get list of transifex resources and
    their completion status.

# [1.2]

*   **New feature** - `mope gh status` to set PR status. Run `mope gh status -h`
    for more details.

# [1.1]

*   **Potentially breaking change** - Default `asset_server.path` updated from
    `/static` to `/mu_static`. Downstream consumers will need to update any code
    that assumes a particular `asset_server.path`
