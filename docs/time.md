## Time `mope time [start|end|track]`

This utility keeps track of time values, using the file system to persist and
aggregate data that can be sent to DataDog.

### Env requirements

Since v6.1, the mope command starts to use datadog to track the start/stop tracking.

### Commands

#### `[start|end] --attribute <attribute>`

Record the current time as the start or end time for `attribute`.

##### Option: `--attribute`

_Required_ for `mope time start` and `mope time end`. The tag/name of the timing
value to record.

##### Conditions:

*   Calling `start` on an attribute that already has a start time will fail.
*   Calling `end` on an attribute that has not been started will fail.
*   Calling `end` on an attribute that has already stopped will fail.

#### `track --type <type> --attributes=<attribute>[,<attribute>...]`

##### Option: `--type`

_Required_ for `mope time track`. The event type/name under which to record the
timing data in the third party tracker. Usually TitleCase.

##### Option: `--attributes`

_Required_. A CSV list of attributes that have been timed with `time [start|end]`.

##### Conditions:

*   Calling `track` with an attribute that hasn't _started_ and _ended_ will fail
