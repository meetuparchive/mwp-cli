# Deploy `mope deploy [create|migrate|clean|delete]`

This set of commands affect the cloud-based deployments for MWP apps.

`create` automates the process of connecting a previously-uploaded Docker
container to the cloud host (currently Google App Engine).

`clean` automates stopping/deleting older deployments that are no longer serving
production traffic.

### Global options


#### `--force`

Forces the deployment even if the instance is running

#### `--pollWait`

The time to wait between deployment progress checks

#### `--version`

The version ID to deploy. Defaults to `CI_BUILD_NUMBER`

#### `--servicesId`

The GAE service name

## Command: `deploy create`

### Env requirements

Deployed apps require secrets stored as env variables, and these values are
sourced from the environment that runs the `deploy` command.

The deployment currently requires the following environment variables to be set
to their production values:

*   `COOKIE_ENCRYPT_SECRET` (any random 32-character string)
*   `CSRF_SECRET` (any random 32-character string)
*   `PHOTO_SCALER_SALT` (defined by the photo scaler)
*   `NEW_RELIC_APP_NAME` (from New Relic config)
*   `NEW_RELIC_LICENSE_KEY` (from New Relic config)
*   `CI_BUILD_NUMBER` (optional - will be used to set the 'version ID' of the
    deployment)

### Options

#### `--image`

_Required_. The full image tag source for the deployed image. Usually prefixed with `us.gcr.io/`
for GCP-hosted images

#### `--maxInstances`

The maximum number of available instances in a GAE deployment - must be manually
set to the `IN_USE_ADDRESSES` quota value shown in GAE

#### `--deployCount`

_Default: `1`_. The number of parallel versions to deploy. Helpful for scaling
beyond the maximum `maxInstances` value.

### `--env`

Optional array of environment variable _names_ to read from the deploy environment
and load into the deployed runtime environment

## Command: `deploy migrate`

Migrate traffic to a deployment that has been created

### Options

#### `--incrementWait`

The delay between migration increments, in ms

#### `--incrementPercentage`

The percentage of traffic to migrate in each increment

#### `--targetTraffic`

_Default: `100`_. The total percentage of traffic to be migrated to the deployment.

## Command: `deploy clean`

### Options

#### `--serving`

_Default: 3_. Integer number of deployments to keep 'warm', ready to receive
traffic.

#### `--available`

_Default: 20_. Integer number of deployments to keep 'cold', ready to be started.
Older deployments will be deleted from GAE, although the container images will
still be available in Google Container Registry for re-deployment.

## Command: `deploy delete`

Delete the specified version. Safely.
