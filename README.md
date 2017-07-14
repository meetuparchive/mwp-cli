[![npm version](https://badge.fury.io/js/mwp-cli.svg)](https://badge.fury.io/js/mwp-cli)
[![Build Status](https://travis-ci.org/meetup/mwp-cli.svg?branch=master)](https://travis-ci.org/meetup/mwp-cli)

# `mope`

The CLI for building apps with meetup-web-platform (internal).

## Synopsis

```
$ mope <command> [<args>]
```

## Commands

- [build](docs/build.md)
- [run](docs/run.md)
- [tx](docs/tx.md)

## Configuration

Project configuration is managed from the `src/config` module, which
consolidates config information from various sources, including env
variables, project-local `config.{env}.json` files, `package.json` files, and
shared platform constants.

This config is used within the CLI to customize the behavior of each command,
particularly the `build` and `run` commands. It can also be imported by other
packages in order to determine configuration information.

In general, `src/config` should be treated as the 'single source of truth' for
configuration information about a platform application. Any _new_ configuration
rules should be exposed in the public config interface defined in
`src/config/index.js`.
