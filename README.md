# `mope`

[![npm version](https://badge.fury.io/js/mwp-cli.svg)](https://badge.fury.io/js/mwp-cli)
[![Build Status](https://travis-ci.org/meetup/mwp-cli.svg?branch=master)](https://travis-ci.org/meetup/mwp-cli)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=meetup/mwp-cli)](https://dependabot.com)

The CLI for building apps with meetup-web-platform (internal).

## Synopsis

```
$ mope <command> [<args>]
```

## Commands

*   [build](docs/build.md)
*   [run](docs/run.md)
*   [time](docs/time.md)
*   [tx](docs/tx.md)

## Developing

The mwp-cli executable (mope) is defined in /bin/mope.js - you can execute it directly without installing the `mwp-cli` package. In development, this means that you can test the CLI from your application directory by running node path/to/mwp-cli/bin/mope.js

For example on running `mwp-cli` from `mup-web`

1.  Checkout `mwp-cli` and a `*-web` repo in this example `mup-web`
2.  Go to `mup-web` repo folder
3.  From `mup-web` run `node ../mwp-cli/bin/mope.js COMMAND` (e.g. `node ../mwp-cli/bin/mope.js tx pullAll` which will pull all trns down for the mup-web transifex project)
