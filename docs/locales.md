### Supporting locales: `--locales <localeCode> [<localeCode>...]`

You can override the default locale(s) that will be built/run by passing a
`locales` option to `mope build` or `mope run`.

_Example_
```
$ mope build browser --locales es fr-FR de-DR
```

#### Defaults

`mope build` uses `NODE_ENV` to determine the default locales to build. In dev,
it will default to building only `en-US`. In production, it will build all the
locales with declared support in the application's `src/util/locales.js` module.