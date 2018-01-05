### TX: `mope tx <target>`

#### Synopsis

```
$ mope tx [pushNewContent|pull|pushTxMaster]
```

1. pushNewContent target: (`mope tx pushNewContent`): 
   Pushes new and updated content to Transifex for translation
2. pull target: (`mope tx pull <resource>`):
   Pulls translated content from Transifex resource and appends to po files
3. pushTxMaster target: (`mope tx pushTxMaster`):
   Pushes translated content from local repo into Transifex master resource

## Transifex process / flow

Transifex is used to translate our content. Each step in the process is an
interaction between Transifex and the codebase. We use `.po` files to store trn
content locally and on Transifex.

[Architecture diagram](https://docs.google.com/presentation/d/1Q_kxUANKaE0fkPZtP5LoneUsTtbJzsM7HBfwXCKM2zU/edit#slide=id.p)

- `pushNewContent` - Each time a PR is created or updated a Transifex `resource`
  (named after the branch) is created or updated, assuming trn content is
  created or changed. This is run via Travis.

  `pushNewContent` parses the codebase, extracting trn content with
  `babel-plugin-react-intl`. It loads content from the `${txProject}-master`
  transifex project which is used as a point of comparison for a diff. The
  results of the diff (if any) are put in a new resource in `mup-web` on transifex.

- `pull <resource>`- should be run while on a fresh branch from `master`, separate from other
  code changes. It will download translated content from of the current project's resources
  in order of most-recently-updated. Merges pulled content into `src/trns/po/{localeCode}.po` files.
  Run for each resource you wish to pull down, usually resources where translation is complete.
  Commit result, create PR, and merge PR after Travis build has passed.

- `pullAll`- should be run while on a fresh branch from `master`, separate from other
  code changes. It will download translated content from all resources for the project it
  is run in in last updated resource order. As each resource is pulled, and then merges
  pulled content into the associated by locale `src/trns/po/{localeCode}.po` files.
    * If you'd like to have a history of each change based on resource add a flag of `-c`
    and it will create a unique commit for each resource that has a change to commit.

  Commit result, create PR, and merge PR after Travis build has passed.

- `pushTxMaster` - Updates the master resource - the canonical copy of translated 
  content. The main usage is for diffing against when examining a new / updated PR.
  This is run whenever there's an update to the master branch. This pushes all
  languages.

- Adding new locales / languages - First make sure that the language has been added to
  the project in Transifex. Create a new `.po` file in `src/trns/po`, copying
  the first three lines (headers) from another `.po` file. Add the locale to
  `src/util/locales.js` and https://github.com/meetup/meetup-web-platform/blob/master/src/util/localizationUtils.js
