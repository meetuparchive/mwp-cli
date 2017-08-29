# Config

This is the 'master' config for all Meetup Web Platform applications. It is
intended to consolidate both buildtime and runtime configuration properties and
rules, including Babel and Webpack configuration, Node server config, and
configuration needed to to interface with external services such as Travis CI
and Transifex.

By consolidating all of this configuration into a single module/package, all
downstream dependencies can explicitly opt-in to reading configuration values
that determine the behavior of the system.

**Important**: browser-run scripts should never directly import configuration 
values. Instead, config should be read from the application state provided to 
the client on initial render.

## General config

The root-level modules of the config package each organize some information that
is used by many different packages. For the most part, they describe the
application environment, e.g. standard file `paths`, `env` values, and `package`
config values.

## Build config

Build-time config is primarily used by Webpack and its dependencies to define
build behavior, including paths to the source files and build targets.

All **Babel** plugins and presets are defined in the `/babel` module.

All **Webpack** configuration rules and helpers are defined in the `/webpack`
module.

## Server config

The `/server` module defines the runtime configuration of the Node application
server. It is essentially an extension of the `/env` config, but adds a few more
host and authentication configuration values.