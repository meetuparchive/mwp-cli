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
