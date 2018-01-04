# [4.0]

- **Removed** `src/config` has been moved to `mwp-config` package managed by
  MWP repo

# [3.0]

- Oauth values are no longer part of config - they are not used in MWP v10.2+

# [2.2]

- Support for `webfont` alias, which will resolve to `src/assets/fonts` for all
  languages except Russian, which will resolve to `src/assets/fonts/ru-RU`. This
  alias is useful for referencing a separate Cyrillic-supporting webfont.

# [2.1]

- Support arbitrary repo owner for `gh status` command - enables status in PRs
  from forked repos

# [2.0]

- **Breaking change** - `file-loader!` and `raw-loader!` will no longer work inline.
  Webpack config will handle the them based on extension.

# [1.5]

- **New feature** - `mope tx keys` displays list of resources and their keys

# [1.4]

- **New feature** - eslint-loader removed from webpack compile.

# [1.3]

- **New feature** - `mope tx status` to get list of transifex resources and
  their completion status.


# [1.2]

- **New feature** - `mope gh status` to set PR status. Run `mope gh status -h`
  for more details.

# [1.1]

- **Potentially breaking change** - Default `asset_server.path` updated from
  `/static` to `/mu_static`. Downstream consumers will need to update any code
  that assumes a particular `asset_server.path`
