## Deploy `mope deploy`

This is the production application deployment command for MWP apps. It automates
the process of connecting a previously-uploaded Docker container to the cloud
host (currently Google App Engine).

### Env requirements

Deployed apps require secrets stored as env variables, and these values are
sourced from the environment that runs the `deploy` command.

The deployment currently requires the following environment variables to be set
to their production values:

- `COOKIE_ENCRYPT_SECRET` (any random 32-character string)
- `CSRF_SECRET` (any random 32-character string)
- `PHOTO_SCALER_SALT` (defined by the photo scaler)
- `NEW_RELIC_APP_NAME` (from New Relic config)
- `NEW_RELIC_LICENSE_KEY` (from New Relic config)
- `CI_BUILD_NUMBER` (optional - will be used to set the 'version ID' of the
  deployment)

### Options

#### `--version`

The version ID to deploy. Defaults to `CI_BUILD_NUMBER`

#### `--servicesId`

The GAE service name

#### `--incrementWait`

The delay between migration increments, in ms

#### `--incrementPercentage`

The percentage of traffic to migrate in each increment

#### `--maxInstances`

The maximum number of available instances in a GAE deployment - must be manually
set to the `IN_USE_ADDRESSES` quota value shown in GAE

#### `--deployCount`
The number of parallel versions to deploy. Helpful for scaling beyond the
maximum `maxInstances` value. Defaults to `1`

#### `--targetTraffic`
The total percentage of traffic to be migrated to the deployment.
Defaults to `100`

#### `--pollWait`

The time to wait between deployment progress checks