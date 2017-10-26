# [1.2]

- **New feature** - `mope gh status` to set PR status. Run `mope gh status -h`
  for more details.

# [1.1]

- **Potentially breaking change** - Default `asset_server.path` updated from
  `/static` to `/mu_static`. Downstream consumers will need to update any code
  that assumes a particular `asset_server.path`