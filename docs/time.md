## Time `mope time [start|end|track]`

This utility keeps track of time values, using the file system to persist and
aggregate data that can be sent to a third party tracker such as New Relic
Insights

### Env requirements

This command is currently configured to send data to
[New Relic Insights](https://newrelic.com/insights). In general, you will want
to supply 2 env variables that enable API authentication

- `NEW_RELIC_ACCOUNT_ID` the integer ID of your application
- `NEW_RELIC_INSERT_KEY` the _private_ API key from New Relic
  - Get a new key at https://insights.newrelic.com/accounts/<ACCOUNT_ID>/manage/api_keys

### Commands

#### `[start|end] --attribute <attribute>`

Record the current time as the start or end time for `attribute`.

##### Option: `--attribute`

*Required* for `mope time start` and `mope time end`. The tag/name of the timing
value to record.

##### Conditions:

- Calling `start` on an attribute that already has a start time will fail.
- Calling `end` on an attribute that has not been started will fail.
- Calling `end` on an attribute that has already stopped will fail.

#### `track --type <type> --attributes=<attribute>[,<attribute>...]`

##### Option: `--type`

*Required* for `mope time track`. The event type/name under which to record the
timing data in the third party tracker. Usually TitleCase.

##### Option: `--attributes`

*Required*. A CSV list of attributes that have been timed with `time [start|end]`.

##### Conditions:

- Calling `track` with an attribute that hasn't _started_ and _ended_ will fail
