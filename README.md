[![npm version](https://badge.fury.io/js/mwp-cli.svg)](https://badge.fury.io/js/mwp-cli)
[![Build Status](https://travis-ci.org/meetup/mwp-cli.svg?branch=master)](https://travis-ci.org/meetup/mwp-cli)
[![Coverage Status](https://coveralls.io/repos/github/meetup/mwp-cli/badge.svg?branch=master)](https://coveralls.io/github/meetup/mwp-cli?branch=master)

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


## Developing
When developing run the command you are working on in a repo that has a project defined (e.g. `mup-web`). 
To start dev'ing.
1. Checkout mwp-cli a *-web repo
2. Go to *-web repo folder
3. run `node ../mwp-cli/bin/mope.js COMMAND` (e.g. `node ../mwp-cli/bin/mope.js tx pullAll -c`)
