# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!-- insertion marker -->
## Unreleased

<small>[Compare with latest](https://github.com/billyeatcookies/biscuit/compare/v2.99.22...HEAD)</small>

### Fixed

- fix: Close main menus when submenu commands are chosen ([89e16e4](https://github.com/billyeatcookies/biscuit/commit/89e16e483ee298c832a3a36fea47161ce00de67c) by Billy).
- fix: Cleanup biscuit submenus, handling SubMenuItem highlights ([e27134a](https://github.com/billyeatcookies/biscuit/commit/e27134adb789772a19c1d701bc14ea98abc22df7) by Billy).
- fix: Various UI tweaks, improvements ([0ca0777](https://github.com/billyeatcookies/biscuit/commit/0ca07774deb9fc6d070ca6bce213c9f9a69e9101) by Billy).
- fix: Updated codicon files ([136c95e](https://github.com/billyeatcookies/biscuit/commit/136c95ec951f8766d790b3837c95e4ef2e0697b0) by Billy).
- fix: Converted all icons to use new iconfont ([05c6d4c](https://github.com/billyeatcookies/biscuit/commit/05c6d4c34448a17a7959d3be2c81847c7df89aeb) by Billy).
- fix: Cleaned ups some docs ([3e52168](https://github.com/billyeatcookies/biscuit/commit/3e521687791a7cc316b27bfef094af671728eee5) by Billy).

<!-- insertion marker -->
## [v2.99.22](https://github.com/billyeatcookies/biscuit/releases/tag/v2.99.22) - 2024-07-21

<small>[Compare with v2.99.10](https://github.com/billyeatcookies/biscuit/compare/v2.99.10...v2.99.22)</small>

### Fixed

- fix: Resolved errors caused by git checks on empty directory opened, langserver client stderr decode errors ([4451d60](https://github.com/billyeatcookies/biscuit/commit/4451d608bd86e90627ab250b1f59e359daa87c89) by Billy).
- fix: Make callstack, variable views compatible with any debugger ([b73355f](https://github.com/billyeatcookies/biscuit/commit/b73355f66bc61a53f3bf2dd6cd8180b86f0d1b5a) by Billy).
- fix: Goto (file, line, col) event not being triggered properly ([eaa040f](https://github.com/billyeatcookies/biscuit/commit/eaa040f1fd910281cef9c484a8d4fffd2b9b8b78) by Billy).
- fix: Fixed issue with language aliases not being recognized ([11f81c1](https://github.com/billyeatcookies/biscuit/commit/11f81c1e7cecb3876a600a752c17bd9b90e3b0dc) by Billy).
- fix: Open Peek with full editor width (for references, goto-definitions) ([ed85998](https://github.com/billyeatcookies/biscuit/commit/ed85998d5d2f4e3936c244f1cf84bc33cbf7a3cc) by Billy).
- fix: Fixed LSP client issues with clangd and pyright langservers ([374bb08](https://github.com/billyeatcookies/biscuit/commit/374bb0868a985df71ca2768ded537379601f3007) by Billy).
- fix: Fixed issues with basedpyright-langserver, Send empty configurations after server initialization #365 from tomlin7/pyright-fix ([c83b118](https://github.com/billyeatcookies/biscuit/commit/c83b11805576b9eabd5600695657bc9851b47949) by billy).
- fix: Fixed issues with pyright langserver, Send empty configurations after initialization ([82fffce](https://github.com/billyeatcookies/biscuit/commit/82fffce62aad3e3162e258438a1f9c2ff12e3eb3) by Billy).
- fix: Fixed issues with ClangD not recognizing opened files after `didChangClangD not recognizing opened files after `didChange` notifications e` notifications  #363 from tomlin7/clangd-fix ([3e5bd13](https://github.com/billyeatcookies/biscuit/commit/3e5bd13c378dd09b6fa38fb5f7606b86aa960321) by billy).
- fix: Fixed issues with ClangD not recognizing opened files after `didChange` notifications ([80021b0](https://github.com/billyeatcookies/biscuit/commit/80021b0cafd6fe3eb8ce96e8d786b789dae1fddd) by Billy).
- fix: Added root workspace folder for language server protocol client ([7165e0f](https://github.com/billyeatcookies/biscuit/commit/7165e0f224a69a7f3d28baf903f37fd1f231c329) by Billy).

## [v2.99.10](https://github.com/billyeatcookies/biscuit/releases/tag/v2.99.10) - 2024-06-29

<small>[Compare with v2.90.0](https://github.com/billyeatcookies/biscuit/compare/v2.90.0...v2.99.10)</small>

### Fixed

- fix: Use BaseGame for defining game extension classes ([b9ed552](https://github.com/billyeatcookies/biscuit/commit/b9ed55278f55391caab9ce535c34082a3f0b1c6f) by Billy).
- fix: New Extension structure and template (nightly) ([e062c43](https://github.com/billyeatcookies/biscuit/commit/e062c4347d56f587a2a2730973281d4af0a2ccdd) by Billy).
- fix: Lint SyntaxError: f-string expression part cannot include a backslash ([b3f7bac](https://github.com/billyeatcookies/biscuit/commit/b3f7bac0602ece4f031d1078bd7d8a4de29c2efe) by Billy).
- fix: File watcher add directories to be ignored for file creation, deletion and move events ([6e758c1](https://github.com/billyeatcookies/biscuit/commit/6e758c15646f9ac009506e44dd06c9fda4f574c4) by Billy).
- fix: Bugs with directory tree watcher fixed ([f199ec8](https://github.com/billyeatcookies/biscuit/commit/f199ec8dd042303c6da6671e25026f5eb50c25ff) by Billy).
- fix: Use gitpython for ignored path checks, grey out ignored paths in directory trees, add "add to gitignore" "exclude in gitignore" commands ([6ccc21a](https://github.com/billyeatcookies/biscuit/commit/6ccc21a22e209576e33c4fbca0ad91fd4304942f) by Billy).
- fix: Notification icons are shown in top container ([3eb76d1](https://github.com/billyeatcookies/biscuit/commit/3eb76d14ab0b597fe1cdc4db60938bb16777cea3) by Billy).
- fix: Fixed single notification close action ([516e0d0](https://github.com/billyeatcookies/biscuit/commit/516e0d0926223ff2d52877e9a858d0d48bd58e1c) by Billy).
- fix: quoting problem #342 from cid0rz/main ([bed7cd7](https://github.com/billyeatcookies/biscuit/commit/bed7cd7761044a1659255080e369ef06d1030ad7) by billy).
- fix quoting problem ([2fc8c52](https://github.com/billyeatcookies/biscuit/commit/2fc8c52987eebb28fcf632c26ff50138b1388e7b) by cid0rz).
- fix: Open assistant attachments file popup to active directory ([793d31b](https://github.com/billyeatcookies/biscuit/commit/793d31bb9a2ecfe0a002090d2027b63b83dceaa3) by Billy).
- fix: Fixed issue which caused secrets database to not update correctly ([66b2bbe](https://github.com/billyeatcookies/biscuit/commit/66b2bbe11d639afebce90b2fd8bc23077e6d231a) by Billy).
- fix: Change `goto-def` and `references` keybinds ([0b852c8](https://github.com/billyeatcookies/biscuit/commit/0b852c8a1a3c28eae7760fe52adca47576e172d3) by Billy).
- fix: Fixed tests ([3f5ab56](https://github.com/billyeatcookies/biscuit/commit/3f5ab56ee110acef4d3a12bb693590fa00deb0ca) by Billy).

## [v2.90.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.90.0) - 2024-06-12

<small>[Compare with v2.76.0](https://github.com/billyeatcookies/biscuit/compare/v2.76.0...v2.90.0)</small>

### Fixed

- fix: Separate extensions management from GUI code ([e99c83f](https://github.com/billyeatcookies/biscuit/commit/e99c83f9ca1a2dd46af8c9bf2c50689ec20c7123) by Billy).
- fix: Biscuit CLI - clone command will notify user about implicit host assumptions, add new dev mode flag ([ea9cf91](https://github.com/billyeatcookies/biscuit/commit/ea9cf91da6b75e12e367af4391410312642842d0) by Billy).
- fix: Handle error caused while closing diff editors and image viewers ([d7d0502](https://github.com/billyeatcookies/biscuit/commit/d7d0502eeab79b30246412dfcfea2d6272fb7ba0) by Billy).

## [v2.76.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.76.0) - 2024-05-15

<small>[Compare with v2.72.0](https://github.com/billyeatcookies/biscuit/compare/v2.72.0...v2.76.0)</small>

### Fixed

- fix: Open new terminals in working directory (or $home if no directory opened), add a terminal instance when panel is toggled (active terminal type, otherwise the default configured) ([f80797b](https://github.com/billyeatcookies/biscuit/commit/f80797b7341f70008251e46590ee046fc4f1befe) by Billy).
- fix: d (damn) ([f51a307](https://github.com/billyeatcookies/biscuit/commit/f51a307dc92ff44c6a28044437425ed9f5a258c8) by billy).
- fix: Filter issues to separate pull requests from data ([a535678](https://github.com/billyeatcookies/biscuit/commit/a5356782e92c69573d7200a83ba178dea845a7e5) by billy).
- fix: Fix PRs being displayed with issues ([db05fef](https://github.com/billyeatcookies/biscuit/commit/db05fef69ed6d6d7c5a29bfc92eb3e16c6244a24) by Vyshnav Vinod).
- fix: Icon error in linux systems #307 ([0efe57c](https://github.com/billyeatcookies/biscuit/commit/0efe57c8621186f2f97b2e7e3598798f6a180048) by billy).
- fix: Fixes fetching from github when the url is a ssh link ([c98a3c2](https://github.com/billyeatcookies/biscuit/commit/c98a3c2e4326e1aa6011da2f1a87eb6493200aa4) by Vyshnav Vinod).
- fix #305 ([d75fd94](https://github.com/billyeatcookies/biscuit/commit/d75fd940a17b8dc6924a9af7c25c9fd8b81823a4) by Vyshnav Vinod).
- fix: Handling empty issues & prs, added placeholder for github view ([ab2274d](https://github.com/billyeatcookies/biscuit/commit/ab2274d6d1031f82bf8a0cfc12bf645a3ece7439) by Billy).
- fixed spelling mistakes ([08b1151](https://github.com/billyeatcookies/biscuit/commit/08b11519a05b61a508b76091b2d2642ce1494a7a) by Ike).
- fix: Git integration - `git clone` resolve url detection issues ([7ad744e](https://github.com/billyeatcookies/biscuit/commit/7ad744e9665f2df1b69576814ae3887a0b69323e) by Billy).
- fix: Fixes my username mentions across repository (ignore this commit) ([20b3eb4](https://github.com/billyeatcookies/biscuit/commit/20b3eb4855342f41b2b6c5fd8ba241d273ef240c) by Billy).
- fix: Open cloned repo in new window/current window, fixed icon in windows ([3f61676](https://github.com/billyeatcookies/biscuit/commit/3f6167608445c5d2369ce00290861a159bcb61a2) by Billy).
- fix: Window now closes when 'x' is clicked ([5c88a2d](https://github.com/billyeatcookies/biscuit/commit/5c88a2d404501ad44e6f6b723007419b7653f432) by Vyshnav Vinod).

## [v2.72.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.72.0) - 2024-04-22

<small>[Compare with v2.69.0](https://github.com/billyeatcookies/biscuit/compare/v2.69.0...v2.72.0)</small>

### Fixed

- fix: Resolved build errors caused by searchbar (nightly) ([83437bd](https://github.com/billyeatcookies/biscuit/commit/83437bd90fc4003d4a09ba47cb9445fe34f7f9c7) by Billy).

## [v2.69.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.69.0) - 2024-04-13

<small>[Compare with v2.66.0](https://github.com/billyeatcookies/biscuit/compare/v2.66.0...v2.69.0)</small>

### Fixed

- fix: Regenerate command palette actionset on late setup (nightly) ([7a661ee](https://github.com/billyeatcookies/biscuit/commit/7a661ee8698668b1565c70ec8bbd3d4841ae0899) by Billy).
- fix: Set directory to active directory or the working directory if no folder selected (new-file) ([d901395](https://github.com/billyeatcookies/biscuit/commit/d901395edc4509d7290aadf92df68bd1a6527e5d) by Billy ビリアム).
- Fix #287 ([9b9ac87](https://github.com/billyeatcookies/biscuit/commit/9b9ac875cec08774a2f8a29c939cccc26983215a) by Vyshnav Vinod).
- fix: Handling of binary files (open-anyway, not caching editor) (nightly) ([28b627e](https://github.com/billyeatcookies/biscuit/commit/28b627ea64a266f1a71d1233a2413ce284fdffaa) by Billy).
- fix: Merged `biscuit.core.components.utils` to `biscuit.core.utils` for consistency ([2674fc6](https://github.com/billyeatcookies/biscuit/commit/2674fc6db17f061f6e1f73f69f6cdaf0ebc0ecb6) by Billy).
- fix: Command palette will render on top of titlebar ([eed761d](https://github.com/billyeatcookies/biscuit/commit/eed761d1883a214821b261491a4ab64188c3527a) by Billy).
- fix: Symbol Rename widget positioning ([d7d4438](https://github.com/billyeatcookies/biscuit/commit/d7d44387479a47576a78a2ca74bf4b2f5919f3d2) by Billy).
- fix: Statusbar clock is removed and now available as extension ([2a1d0c5](https://github.com/billyeatcookies/biscuit/commit/2a1d0c5db2d84689d9cd4dfad864cae88ad0d1a3) by Billy).
- fix: Disable bracket pair colorization until color bug is not resolved #264 ([0811729](https://github.com/billyeatcookies/biscuit/commit/0811729a2abaefdfb85b5d71128706a19703d1af) by Billy).

## [v2.66.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.66.0) - 2024-03-30

<small>[Compare with v2.63.1](https://github.com/billyeatcookies/biscuit/compare/v2.63.1...v2.66.0)</small>

### Fixed

- fix: Support for LSP LocationLink (LSP v3.14 onwards) ([e79a08a](https://github.com/billyeatcookies/biscuit/commit/e79a08a40d57639b5ece97ea2dd6da03934c9086) by Billy).
- fix: Manually change focus & selection when right clicked on tree items ([7c8f1c6](https://github.com/billyeatcookies/biscuit/commit/7c8f1c68cdb2fd1ec08bea78c747af450e258d12) by Billy).
- fix: Temporary fix segmentation fault #256 ([2fae6a3](https://github.com/billyeatcookies/biscuit/commit/2fae6a37eea91faa125f99cc4de07687da79b049) by Billy).
- fix: Remove unused imports #256 ([b2b824c](https://github.com/billyeatcookies/biscuit/commit/b2b824c6efcab76f3988cd93a799e7bfd2cf6f0d) by Billy ビリアム).
- fix: File search palette cleanup, `Ctrl+p` keybinding ([3b8e77e](https://github.com/billyeatcookies/biscuit/commit/3b8e77ef5ec569ac2631e3f48c5848930ab39906) by Billy).
- fix: Minor UX improvements ([44c36da](https://github.com/billyeatcookies/biscuit/commit/44c36da3bca43db3b46dd7be2417ec89d3199139) by Billy).
- fix: set markdown preview disabled by default ([72394c1](https://github.com/billyeatcookies/biscuit/commit/72394c1949116abffba14e929ff9f1d27aa70f80) by Billy ビリアム).
- fix: Handle issue with reopening cached editors ([de12aa7](https://github.com/billyeatcookies/biscuit/commit/de12aa71c9b78bd2f810f6c951de6c7d6467e954) by Billy).
- fix: Handle bom check errors for empty files #250 ([0117954](https://github.com/billyeatcookies/biscuit/commit/0117954a2f03b351e1e28935075bcba42529ccd1) by Billy).
- Fix #244 ([bbd2b08](https://github.com/billyeatcookies/biscuit/commit/bbd2b08b95d5ba41d80017b61703bfb11bf629fb) by vyshnav-vinod).
- fix: Remove pylsp binaries from build (nightly) ([33e1969](https://github.com/billyeatcookies/biscuit/commit/33e1969feac91aef71589d85d8662a3fb4151af1) by Billy).
- fix: pylsp binaries not detected (nightly) ([009e94c](https://github.com/billyeatcookies/biscuit/commit/009e94c9e523d5bb05b58ec12fa8d058130d4a1f) by Billy).
- fix: include pylsp binaries (nightly) ([1e49f68](https://github.com/billyeatcookies/biscuit/commit/1e49f6881fd33fdb8aae626c98a8da4ca5752df0) by Billy).

## [v2.63.1](https://github.com/billyeatcookies/biscuit/releases/tag/v2.63.1) - 2024-02-15

<small>[Compare with v2.58.0](https://github.com/billyeatcookies/biscuit/compare/v2.58.0...v2.63.1)</small>

### Added

- add docs ([3c39606](https://github.com/billyeatcookies/biscuit/commit/3c396066e0a078c48a3eb690767c220a4b40f688) by Mo Norman).
- add relations graph ([88f5b94](https://github.com/billyeatcookies/biscuit/commit/88f5b948c34723278a728709ccd09e843d93c914) by Mo Norman).

### Fixed

- fix: Selection methods in text editor - ctrl+shift horizontal for selecting words - selection tag will have priority over current word, current line, hover tags ([b61b569](https://github.com/billyeatcookies/biscuit/commit/b61b569aa85340bf39c8ea97d39c4829c76248fe) by Billy).
- fix: Rename window positioning and default text ([2d097a5](https://github.com/billyeatcookies/biscuit/commit/2d097a59c375c4c406ffd787b7266538503756e6) by Billy).
- fix typo ([b53e220](https://github.com/billyeatcookies/biscuit/commit/b53e220db4134448f443c528ec0de20d56ad47b1) by Mo Norman).
- fix: Add extra discard for arguments ([80a49d7](https://github.com/billyeatcookies/biscuit/commit/80a49d7e5fe520b377759926dfb22620f4e84b48) by Billy).
- fix: Custom window resizing (horizontal) ([65f86bd](https://github.com/billyeatcookies/biscuit/commit/65f86bddf94c2b54213a171e6429c103ae2310d4) by Billy).
- fix: Crediting porcupine for LSP client implementation #216 ([279dab2](https://github.com/billyeatcookies/biscuit/commit/279dab2330aa7ccbe88729c62584c14b32abba03) by Billy ビリアム).
- fix: Resolve PTY errors in linux #214 ([3312761](https://github.com/billyeatcookies/biscuit/commit/33127610547f1a9c29ad5266b53dc8eb1c33fb00) by Billy ビリアム).
- fix: Resolve PTY errors in linux ([c56856e](https://github.com/billyeatcookies/biscuit/commit/c56856ea9e3a2d4e18a6d199b19c06942d971733) by Billy).
- fix: System specific pty libs ([4f18ee1](https://github.com/billyeatcookies/biscuit/commit/4f18ee1c2d56ee780810951797a71ebe1d324714) by Billy).

## [v2.58.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.58.0) - 2024-01-12

<small>[Compare with v2.55.0](https://github.com/billyeatcookies/biscuit/compare/v2.55.0...v2.58.0)</small>

### Fixed

- fix: Load text content after initialization #206 ([d2c4404](https://github.com/billyeatcookies/biscuit/commit/d2c44044b0b345328e0cd91b67efc73a01e30ca6) by Billy ビリアム).
- fix: Load text content after initialization ([a54ebbf](https://github.com/billyeatcookies/biscuit/commit/a54ebbf5765a46580de042540e1c9f874e456fea) by Billy).
- fix: Disable minimap for Diff editor (performance mode) ([da03142](https://github.com/billyeatcookies/biscuit/commit/da031424b00c8c2cde048e4c95e3ab7c9cf04829) by Billy).

## [v2.55.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.55.0) - 2024-01-04

<small>[Compare with v2.33.0](https://github.com/billyeatcookies/biscuit/compare/v2.33.0...v2.55.0)</small>

### Fixed

- fix: Palette File Search is not showing all files in entire project #111 ([cd4058e](https://github.com/billyeatcookies/biscuit/commit/cd4058ea9956d1d2bb0af2734f34c64c0d443e17) by Billy).
- fix: colors for completion items #193 ([e7204a2](https://github.com/billyeatcookies/biscuit/commit/e7204a2ec375da7e67afdcc34fedff4fe999a365) by Billy).
- fix: iconbutton arguments are not defaulted ([63adcb0](https://github.com/billyeatcookies/biscuit/commit/63adcb07552fd06e7fde0128e62a02cbb310f321) by Dheeraj Charaungonath).
- fix: global search goto line #160 (@nfoert) ([c0a6f1f](https://github.com/billyeatcookies/biscuit/commit/c0a6f1f697f24711fb0947e10e4e9c64eaed18c7) by Billy).
- Fix: encoding detection and handle ValueError in update_statusbar() ([84501e4](https://github.com/billyeatcookies/biscuit/commit/84501e46204908e14613d148155a5d70a1e9a41e) by Billy).
- fix: update statusbar on new editor opened ([dadc346](https://github.com/billyeatcookies/biscuit/commit/dadc346dfb41e6552ab73d3bad27070700dc2420) by Billy).
- fix: picking language for non-existing files ([d3e49f1](https://github.com/billyeatcookies/biscuit/commit/d3e49f1cf7290ed0aa31a1e675dfcdbbe33271b4) by Billy).
- fix: ValueError (Paths don't have the same drive) ([2f4cd9b](https://github.com/billyeatcookies/biscuit/commit/2f4cd9b681484338a794db8f31edee87411af35f) by Billy).
- fix: update lsp_mode variable ([72f2ccc](https://github.com/billyeatcookies/biscuit/commit/72f2ccc5b8797e80a060b1004d03d61c69729054) by Dheeraj Charaungonath).
- fix: Autocomplete symbol kinds on LSP mode (#190) ([5fe23d9](https://github.com/billyeatcookies/biscuit/commit/5fe23d9c8ded9f73f76909d5f813f1b3ddbb4050) by Billy).
- fix: properly cleaning hyperlink tags (ctrl key release) ([9a00a18](https://github.com/billyeatcookies/biscuit/commit/9a00a18d0182df991a76177be5ec2d38617f77d5) by Billy).
- fix: Extensions repo now handles json based data, not toml ([c92a758](https://github.com/billyeatcookies/biscuit/commit/c92a75807ec512592a38acef61b082f08ab398da) by Billy).
- fix highlighting orders of selection, current line, current word ([0a8a6a5](https://github.com/billyeatcookies/biscuit/commit/0a8a6a55f46fe4d13aba636a252fb76c312e5dfd) by billy).

## [v2.33.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.33.0) - 2023-11-15

<small>[Compare with v2.31.0](https://github.com/billyeatcookies/biscuit/compare/v2.31.0...v2.33.0)</small>

### Fixed

- fix: import errors from last pr ([821de74](https://github.com/billyeatcookies/biscuit/commit/821de74ea6b8db245eec09f539fd119a75ce6f6c) by billy).
- fix: dont import all of tkinter.constants ([a8ded25](https://github.com/billyeatcookies/biscuit/commit/a8ded254ae58ac0285304b30fb3ca9737b2cc044) by Dheeraj Charaungonath).
- fix indentation errors ([211c906](https://github.com/billyeatcookies/biscuit/commit/211c90636ced628b51b68be2860685c03b46139a) by Dheeraj Charaungonath).
- fix: Remove double scrollbar isssue for markdown renderer ([f7f131c](https://github.com/billyeatcookies/biscuit/commit/f7f131c30368f057af6653683296bae3a07851a6) by billy).
- fix: Remove highlight borders (this looks better) ([658705d](https://github.com/billyeatcookies/biscuit/commit/658705d0c1a2aa8055e17b2b59b85446a0b6d723) by billy).
- fix: Disable minimalist mode for markdown editors ([2f7b691](https://github.com/billyeatcookies/biscuit/commit/2f7b6916dbf3eea59986eed98bedc658029b8dc3) by billy).

### Removed

- Remove non-existent 'Config' from __all_ ([31b3604](https://github.com/billyeatcookies/biscuit/commit/31b3604a080df0896bff026a6d4be5d22501f905) by Dheeraj Charaungonath).

## [v2.31.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.31.0) - 2023-10-22

<small>[Compare with v2.0.0](https://github.com/billyeatcookies/biscuit/compare/v2.0.0...v2.31.0)</small>

## [v2.0.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.0.0) - 2023-10-22

<small>[Compare with v2.26.0](https://github.com/billyeatcookies/biscuit/compare/v2.26.0...v2.0.0)</small>

### Added

- Add codecov ([2caaec4](https://github.com/billyeatcookies/biscuit/commit/2caaec4c1421bb9b3691ff110e932d4395d63532) by Billy ビリアム).
- Add selection, view menus and callbacks ([9dae4f2](https://github.com/billyeatcookies/biscuit/commit/9dae4f2be80b2723f52c50e012b70f5fbd722ea4) by billy).

### Fixed

- fix: Toggling sidebar-panel views from menu ([95e8e6b](https://github.com/billyeatcookies/biscuit/commit/95e8e6b7ec17f16163bfcc367187c43f38a272af) by billy).
- fix(tests): breadcrumbs tests failing ([8aa052c](https://github.com/billyeatcookies/biscuit/commit/8aa052c614b767bd35c8ebab94090d3c9847587e) by Kristofer Soler).
- fix(requirements): missing package pyperclip during `pytest` execution ([4be50d4](https://github.com/billyeatcookies/biscuit/commit/4be50d4676ac9fa4621eae3945a92782a0512e36) by Kristofer Soler).

### Changed

- Change language mode from statusbar ([9a38016](https://github.com/billyeatcookies/biscuit/commit/9a3801632545983efa71afe100ef440d39fa7d45) by Billy ビリアム).

## [v2.26.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.26.0) - 2023-10-02

<small>[Compare with v2.21.0](https://github.com/billyeatcookies/biscuit/compare/v2.21.0...v2.26.0)</small>

### Added

- add a develop menu, and undo/repo edit ([6646723](https://github.com/billyeatcookies/biscuit/commit/66467236a23677e6fb0aa4fae3f0939d3beb2c69) by Mo Norman).

### Fixed

- fix: Minimap should added before loading text ([8ffa267](https://github.com/billyeatcookies/biscuit/commit/8ffa2677cbbc74f8f13d87ecd8dca31567055437) by billy).
- fix: Load extensions GUI after initialization ([bc1a3d4](https://github.com/billyeatcookies/biscuit/commit/bc1a3d44db5443fac819b5f854f077051336e1c2) by billy).

## [v2.21.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.21.0) - 2023-08-11

<small>[Compare with v2.20.7](https://github.com/billyeatcookies/biscuit/compare/v2.20.7...v2.21.0)</small>

### Fixed

- fix: Palette settings, command clean up ([0d5ad05](https://github.com/billyeatcookies/biscuit/commit/0d5ad0595646cbd06b33df487ba8f3934c447f62) by Billy).
- fix: Breadcrumbs are shown properly for POSIX paths ([b4695f6](https://github.com/billyeatcookies/biscuit/commit/b4695f65603a9287dddd2c6a7183562fa2f20b1b) by Billy).
- fix: Palette filter not working properly ([c030994](https://github.com/billyeatcookies/biscuit/commit/c030994eb826dcfd775a2fee1bc99a35c9f9aad8) by Billy).

## [v2.20.7](https://github.com/billyeatcookies/biscuit/releases/tag/v2.20.7) - 2023-08-08

<small>[Compare with v2.20.2](https://github.com/billyeatcookies/biscuit/compare/v2.20.2...v2.20.7)</small>

### Fixed

- fix: Currentword highlights are not visible due to currentline highlights (fixed order) ([eb0a1e8](https://github.com/billyeatcookies/biscuit/commit/eb0a1e8eafb0fb69b00f4c6ac60eb304e2563ddf) by Billy).
- fix: Diff viewer can also open deleted/new files ([6ecb4fb](https://github.com/billyeatcookies/biscuit/commit/6ecb4fb1741b6a477d83139146a4510b9f3e1511) by Billy).
- fix: Diff editor not opening ([23d625e](https://github.com/billyeatcookies/biscuit/commit/23d625eaea3bc0621a85333fa262c934cc91f32f) by Billy).
- fix: Custom titlebar will be windows specific feature ([2449d19](https://github.com/billyeatcookies/biscuit/commit/2449d19dc6aaeabdcd4240f7157202d50d7d16f4) by Billy).
- fix: Not showing up in taskbar (windows specific) - window decorations are not removed for linux, mac ([0f8a358](https://github.com/billyeatcookies/biscuit/commit/0f8a3583dc2af30618f24f8665bf65944276c7d1) by Billy).

## [v2.20.2](https://github.com/billyeatcookies/biscuit/releases/tag/v2.20.2) - 2023-07-29

<small>[Compare with v2.20.0](https://github.com/billyeatcookies/biscuit/compare/v2.20.0...v2.20.2)</small>

### Added

- Add compiling guidelines ([747a223](https://github.com/billyeatcookies/biscuit/commit/747a22354c8dfdc891ee100a7199d4c35fc143b6) by Billy).
- Add screenshots ([0dce695](https://github.com/billyeatcookies/biscuit/commit/0dce6951a11e942e1b238f10a1c1e28a13e18fe7) by Billy).

### Fixed

- fix: Linux compatibility for maximizing ([e60ce47](https://github.com/billyeatcookies/biscuit/commit/e60ce47c367e6f7dc7a7372a4a8dcdb0c4f31537) by Billy).
- fix: Revert `./__init__.py` ([bf7ef4a](https://github.com/billyeatcookies/biscuit/commit/bf7ef4acc9d4417c6ec04cec276849c2a3cee7e4) by Billy).
- fix: Update cupcake core - merge cupcake updates - consider https://github.com/billyeatcookies/cupcake/pull/37 ([beff32b](https://github.com/billyeatcookies/biscuit/commit/beff32b1458c85284c48a869e64cca11494a7ad0) by Billy).
- fix: ModuleNotFoundError: No module named `biscuit.core.components.games.stackengineer'` ([ca1ab38](https://github.com/billyeatcookies/biscuit/commit/ca1ab38fe1ef01b96acb0f5fd22c3c9582613fc3) by Billy).
- fix: fixes minesweeper, circular import (this better work) ([8a79bcc](https://github.com/billyeatcookies/biscuit/commit/8a79bcc8ae463f8925428e6b13991934114ac211) by Billy).
- fix: add stackengineer to games ([b98cba7](https://github.com/billyeatcookies/biscuit/commit/b98cba74f18b0e29ba99e5e5a940886560cc1d8a) by Billy).

## [v2.20.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.20.0) - 2023-07-25

<small>[Compare with v2.9.2](https://github.com/billyeatcookies/biscuit/compare/v2.9.2...v2.20.0)</small>

### Fixed

- fix: NIghtly build errors fixed ([06a2fea](https://github.com/billyeatcookies/biscuit/commit/06a2feaf841c3aa6899dc973fdc69de7ba414137) by Billy).
- fix: Splash screen not hiding after startup ([405f7f9](https://github.com/billyeatcookies/biscuit/commit/405f7f9fa34bbfa5cf064670f0af77cbb9ccf5aa) by Billy).
- fix: sidebar reference errors ([f3f6ed6](https://github.com/billyeatcookies/biscuit/commit/f3f6ed6344c0753e80b56e588c9bc307417214ed) by Billy).
- fix: Include binaries for tkextrafont (linux) ([176981c](https://github.com/billyeatcookies/biscuit/commit/176981c7173dccfd592cbad0c8f711250eb6c03a) by Billy).
- fix: Make splashscreen windows specific ([b9bd8f3](https://github.com/billyeatcookies/biscuit/commit/b9bd8f37897d9acd971bf75084f80c5c2537abb2) by Billy).
- fix: windll notfounderr in linux ([6b0c40b](https://github.com/billyeatcookies/biscuit/commit/6b0c40b46277027583f2da01ccdb31f33643033c) by Billy).
- fix: Disable directory watcher for extensions/ - manually refresh extensions list ([9f4530e](https://github.com/billyeatcookies/biscuit/commit/9f4530e099099a72d5f39d7ba5f47677f23664e9) by Billy).
- fix: Fix build output name ([4d4801f](https://github.com/billyeatcookies/biscuit/commit/4d4801f98a0b8ea9417f897a4e9106fc655c701e) by Billy).
- fix: Remove merge conflicts ([b57f3a9](https://github.com/billyeatcookies/biscuit/commit/b57f3a9359f68343b2ba69805d61bebbd86ba1f4) by Billy).
- fix: Extensionmanager fetching error handling ([f70bde8](https://github.com/billyeatcookies/biscuit/commit/f70bde85f06bfd8bb0c9016c639b07026c30ed6d) by Billy).
- fix: Sort all imports using isort #86 ([1532478](https://github.com/billyeatcookies/biscuit/commit/1532478d15e85132762a0e9f94631f9009845e28) by Billy).
- fix: SetProcessDpiAwareness should be windows specific configuration #86 ([56023d4](https://github.com/billyeatcookies/biscuit/commit/56023d4856d37a31451d04aed560d3e2b401cb5b) by Billy).
- fix: Hide panel when no terminals are deleted ([38ceba3](https://github.com/billyeatcookies/biscuit/commit/38ceba3429542b1b66d678d8a2db3125f803e94a) by Billy).
- fix: Handling deleted/untracked files in diff viewer ([47c1a7b](https://github.com/billyeatcookies/biscuit/commit/47c1a7b55dd140402eb00dac55121a903ea140eb) by Billy).
- fix: Optimizations done for diff viewer ([e5789db](https://github.com/billyeatcookies/biscuit/commit/e5789dbbaa5212a8d67b1121bc60c45cd1639982) by Billy).
- fix: Git integration - hide changes/staged changes when there arent any ([5447380](https://github.com/billyeatcookies/biscuit/commit/5447380d260147e77495e717fdcbbed553aaf502) by Billy).
- fix: Git integration no longer fails to stage deleted files ([1c34b4f](https://github.com/billyeatcookies/biscuit/commit/1c34b4f18f57ad76ebd39a1aa51b2137aec92019) by Billy).
- fixed auto pair completion bug for quotes ([e4eb489](https://github.com/billyeatcookies/biscuit/commit/e4eb489416aa916bd70857c2db97b1eb067f693c) by CSP).
- fix: Optimize palette filter to work more efficiently ([d103ee5](https://github.com/billyeatcookies/biscuit/commit/d103ee5af0f3a866bfad314e23ce0d4e139e5112) by Billy).
- fix: Diffeditor line numbers should update on scroll ([fcd7236](https://github.com/billyeatcookies/biscuit/commit/fcd7236dcc477a1540a1fefbb5db44c32b89a598) by Billy).
- fix: Line numbers should be redrawn on every content change ([01555ff](https://github.com/billyeatcookies/biscuit/commit/01555ff43299a93016ded5bcce9d9509b11fc516) by Billy).
- fix: Remove cells in game of life, fix tetris bindings - show instructions for game of life ([6b7b88c](https://github.com/billyeatcookies/biscuit/commit/6b7b88c4fec51800a8b7a4248d4297da8f12d4f2) by Billy).
- fix: Restrict resizing with minimum width/height ([bea7d47](https://github.com/billyeatcookies/biscuit/commit/bea7d47d6825094a12201cec2464b13ae61ccc4c) by Billy).

## [v2.9.2](https://github.com/billyeatcookies/biscuit/releases/tag/v2.9.2) - 2023-07-13

<small>[Compare with v2.5.2](https://github.com/billyeatcookies/biscuit/compare/v2.5.2...v2.9.2)</small>

### Fixed

- fix: Command palette should be resized with window scaling - close button should be red when hovered ([7a7a279](https://github.com/billyeatcookies/biscuit/commit/7a7a279ce9d15aae92972f77c5249fd27f47bb7a) by Billy).
- fix: Notifications offset based on window scale ([6758343](https://github.com/billyeatcookies/biscuit/commit/67583431d9ca90a75d3573f24a32d57571549c77) by Billy).
- fix: FindReplace is not rendered as topmost ([d348751](https://github.com/billyeatcookies/biscuit/commit/d348751ef1f794ce4f620841a4e519e44523c39d) by Billy).
- fix: Notifications are not rendered topmost ([af8676f](https://github.com/billyeatcookies/biscuit/commit/af8676f2d6d5d09a20b8c3fcb48bff75322b5cd5) by Billy).
- fix: Minimap shouldn't refresh text editor internals (optimizations) ([197df75](https://github.com/billyeatcookies/biscuit/commit/197df75c5e04cdc1265b34fe5e61d75d20838504) by Billy).
- fix: Proxy now generates different Scroll, Change events for better performance ([bbc31bb](https://github.com/billyeatcookies/biscuit/commit/bbc31bb5d6914ca3e6efaf6ed38a13d2c4c862ab) by Billy).
- fix: Scaling tk based on screen DPI ([be3a380](https://github.com/billyeatcookies/biscuit/commit/be3a380fd0734ed05a0b879080741663abc19fb3) by Billy).
- fix: Scale all components based on dpi ([df61777](https://github.com/billyeatcookies/biscuit/commit/df617776c821e9cf81d26c05ba803aa960fbeb34) by Billy).
- fix: Scaling of fonts, toplevel windows ([108976b](https://github.com/billyeatcookies/biscuit/commit/108976b14c1543a458cf4634fb5b24b4da051822) by Billy).
- fix: Scale components based on screen dpi ([e6da8ee](https://github.com/billyeatcookies/biscuit/commit/e6da8ee1c853cd8af8bf9dc653a336ba8cba904e) by Billy).
- fix #75: Scale tk based on the dpi of screen ([26fe26d](https://github.com/billyeatcookies/biscuit/commit/26fe26d875800cdce91b92c87c8d29d51985cb3f) by Billy).
- fix: Scale tk based on the dpi of screen ([08903e1](https://github.com/billyeatcookies/biscuit/commit/08903e1d50a538c1b7a7a411edf6f0bece51e245) by Billy).
- fix: Update statusbar info to show encoding of opened file ([9ec0268](https://github.com/billyeatcookies/biscuit/commit/9ec0268e005f3544161c37b0bb78f6051cc7c2ae) by Billy).
- fix: #71 Decide encoding of files with BOM (if exists) BOM is not loaded as text ([c4b09be](https://github.com/billyeatcookies/biscuit/commit/c4b09be92a0fb9d18bdfa8e1399b7b392950796f) by Billy).

## [v2.5.2](https://github.com/billyeatcookies/biscuit/releases/tag/v2.5.2) - 2023-07-11

<small>[Compare with v2.5.1](https://github.com/billyeatcookies/biscuit/compare/v2.5.1...v2.5.2)</small>

## [v2.5.1](https://github.com/billyeatcookies/biscuit/releases/tag/v2.5.1) - 2023-07-10

<small>[Compare with v2.5.0](https://github.com/billyeatcookies/biscuit/compare/v2.5.0...v2.5.1)</small>

## [v2.5.0](https://github.com/billyeatcookies/biscuit/releases/tag/v2.5.0) - 2023-07-10

<small>[Compare with 2.0.0](https://github.com/billyeatcookies/biscuit/compare/2.0.0...v2.5.0)</small>

### Added

- Added `requests` in dependency list ([56f92e5](https://github.com/billyeatcookies/biscuit/commit/56f92e5f66a8a7f0c12674dccff511621e29dde5) by Satakun Utama).
- Added further checks to handle git not found exceptions ([c0bb977](https://github.com/billyeatcookies/biscuit/commit/c0bb977459392a045c02a01cd7c65b0db311ab46) by Billy).
- Add poetry to project ([c490824](https://github.com/billyeatcookies/biscuit/commit/c490824ad53124ee0527d52f66c41ff188bd706a) by Billy).
- Add games/game of life implementation - games/game of life ([fae2067](https://github.com/billyeatcookies/biscuit/commit/fae2067b34add88467d5b23c887ba4481eb5627d) by Billy).
- Add sv-ttk to requirements ([9757ad7](https://github.com/billyeatcookies/biscuit/commit/9757ad7909d141092b93358df2602f835c796b87) by Billy).

### Fixed

- fix: Text is blurred in windows systems ([b29ce6b](https://github.com/billyeatcookies/biscuit/commit/b29ce6b163b0f6ddd39fe19380d4b3ac7bf69d64) by Billy).
- fix: custom prompt is shown for linux only ([9cf9df9](https://github.com/billyeatcookies/biscuit/commit/9cf9df9e69d8c0563420df26b5134bb47dba37da) by Billy).
- fix: Diff Editor lhs/rhs should be equally divided ([59fee40](https://github.com/billyeatcookies/biscuit/commit/59fee40991341b6947830866a479cb9778890a0f) by Billy).
- fix: Poetry - python version can be any `^3.10` - add `poetry.lock` file ([da82367](https://github.com/billyeatcookies/biscuit/commit/da82367e83f60fb7d8fe254c3811ed0f92031fec) by Billy).
- fix: Status bar editmode info are not hidden when editor is closed ([765d5ce](https://github.com/billyeatcookies/biscuit/commit/765d5ced7e8acce1a625ec616c3749ad20e2f9a6) by Billy).
- fix #55: theming autocompletions correctly ([f145b2e](https://github.com/billyeatcookies/biscuit/commit/f145b2efb3fab713c41b68279300e44bcd3f26e5) by Billy).
- fix: enforce module restrictions only for the imported extensions, not globally ([d28ec3b](https://github.com/billyeatcookies/biscuit/commit/d28ec3baf692e537cc4bdf8e2585c3b669a650e6) by Billy).
- Fix the closure bug with games manager ([bc18052](https://github.com/billyeatcookies/biscuit/commit/bc1805228eec4fda9cfb5d902617e180fbe1376d) by Billy).
- Fix #59: Notifications not showing up on `info`, `warn`, `error` calls ([a77c15c](https://github.com/billyeatcookies/biscuit/commit/a77c15c1ad7d435fb85a03d35c91be744050279c) by Billy).
- Fix #58: Actionsets registered are not updated when new actions are added ([f4f4817](https://github.com/billyeatcookies/biscuit/commit/f4f4817e088dfc0c22bf74a0f0166620b9c43fe0) by Billy).
- Fix <Control-`> binding not working in linux - now using <Control-grave> ([68395f0](https://github.com/billyeatcookies/biscuit/commit/68395f077e0dc093a121688424c8550bab44d778) by Billy).
- Fix #49: stop highlighting when file is unsupported ([0c8ed13](https://github.com/billyeatcookies/biscuit/commit/0c8ed13bc7684de7224fa9e611ac683e352a1264) by Billy).
- FIX #48 If a single file is opened, pathview is not working ([29f7fbe](https://github.com/billyeatcookies/biscuit/commit/29f7fbe205ad354258b11a189549a2d3f611a5f1) by Billy).

### Removed

- Remove unnecessary instances ([acc99e3](https://github.com/billyeatcookies/biscuit/commit/acc99e34a0a7970e22e1554b30ab3ec12183bd58) by Billy).

## [2.0.0](https://github.com/billyeatcookies/biscuit/releases/tag/2.0.0) - 2023-06-14

<small>[Compare with v1.0.0](https://github.com/billyeatcookies/biscuit/compare/v1.0.0...2.0.0)</small>

### Added

- Add badges ([4a1afc7](https://github.com/billyeatcookies/biscuit/commit/4a1afc79561a90dd603c2f2343225d29911c4b57) by Billy).
- Add TODOs ([8b2eb6a](https://github.com/billyeatcookies/biscuit/commit/8b2eb6ab0da4600ced42f044eba44093b63045d5) by Billy).
- Added panelbar ([d84f536](https://github.com/billyeatcookies/biscuit/commit/d84f53660be41281234fb46c952d6f19ad622ae5) by Billy).
- add a games folder and start to work in tetris ([5d3bb23](https://github.com/billyeatcookies/biscuit/commit/5d3bb239839deaea9a235a539fd8a1ff193b4922) by cid0rz).
- Add documentation for layout and configs ([c53749a](https://github.com/billyeatcookies/biscuit/commit/c53749af199e9844b805c73a9635d1c91c9f1f7b) by Billy).

### Fixed

- Fix for directorytree ([443e833](https://github.com/billyeatcookies/biscuit/commit/443e833a4f96bfa4b5c57b3e980b2cbcd124dc34) by Billy).
- Fix file searching feature in palette, fix explorer ([1685a53](https://github.com/billyeatcookies/biscuit/commit/1685a53fdab015453d6622cf8ad91b29b71f5a4a) by Billy).
- Fix terminal Fix bug where command line output was being pasted repeatedly Temporarily remove bash prompts ([928f0a8](https://github.com/billyeatcookies/biscuit/commit/928f0a80289781f7a681682575b05a2d564da52f) by Billy).
- Fix sizing of panel, editors, menubar ([710e4f3](https://github.com/billyeatcookies/biscuit/commit/710e4f3ebca894012cb609047e553d6a24576d05) by Billy).
- Fix bug: menubar and statusbar are not visible ([2e82a58](https://github.com/billyeatcookies/biscuit/commit/2e82a580ae05533eae20028c3fbb2836cad6ef10) by Billy).
- Fix Sidebar slots, Panel tabs, Editor tabs ([f3c95af](https://github.com/billyeatcookies/biscuit/commit/f3c95afe2b8c5874bc4395de224735d23d28938f) by Billy).
- fix preferred editors ([c321dcb](https://github.com/billyeatcookies/biscuit/commit/c321dcb88da653744f4d1c5e6ee1fc1bde5f35ae) by cid0rz).

### Changed

- Change colors of editor tabs, editorsbar ([a0319db](https://github.com/billyeatcookies/biscuit/commit/a0319db943eab7b9be63279bf94c965c001096cf) by Billy).
- Changes in View system for panel and sidebar ([b058b96](https://github.com/billyeatcookies/biscuit/commit/b058b963581d892603a0bccc4765cf5e830daf0b) by Billy).

### Removed

- remove unmatched bracket ([94ee2a6](https://github.com/billyeatcookies/biscuit/commit/94ee2a6ad54f0fb221ad6ec4f472bc6c3a427aaf) by Billy).
- Remove unnecessary files ([ec4aa07](https://github.com/billyeatcookies/biscuit/commit/ec4aa076c8ceff0d8abc8b2a09f2762f995030c8) by Billy).
- Remove tkdnd temporarily ([259b408](https://github.com/billyeatcookies/biscuit/commit/259b4081f5891c4dedc44635f03e2eb81f7a9187) by Billy).
- remove some debug statements ([6faa20c](https://github.com/billyeatcookies/biscuit/commit/6faa20c7755ab6317d7b68b3dfdd57c8a972750b) by cid0rz).
- Remove unnecessary image resources ([84a934a](https://github.com/billyeatcookies/biscuit/commit/84a934ac64c6f77b8bbef6e53f0220bd20f2dcfe) by Billy).

## [v1.0.0](https://github.com/billyeatcookies/biscuit/releases/tag/v1.0.0) - 2022-05-10

<small>[Compare with first commit](https://github.com/billyeatcookies/biscuit/compare/24560012f0ef285f50d8804b201749160ad4f490...v1.0.0)</small>

### Added

- Add sysinfo to base class ([dbe909d](https://github.com/billyeatcookies/biscuit/commit/dbe909dd1857de715f6a90e8d2e881436efbed53) by billyeatcookies).
- Add new terminal ([ea2189f](https://github.com/billyeatcookies/biscuit/commit/ea2189fb3d9176a4d5fe4589ce90a2f05ca45157) by billyeatcookies).
- add start buttons and useful resources to welcome page ([5468e23](https://github.com/billyeatcookies/biscuit/commit/5468e23bfe2368ea494c58831401a66d13f399f7) by billyeatcookies).
- Add welcome page ([0f82887](https://github.com/billyeatcookies/biscuit/commit/0f8288754607e9f55e1b571f2d2a262cd2daa442) by billyeatcookies).
- Add diff colors based on changes ([3fb016e](https://github.com/billyeatcookies/biscuit/commit/3fb016e8c265e90f88d188ba5ef318efce38d639) by billyeatcookies).
- Add filetype library to dependencies, new filetype class ([7d195bc](https://github.com/billyeatcookies/biscuit/commit/7d195bcb0666b30c8475a5c9ed0ced5de2839bea) by billyeatcookies).
- Add toolbar containing dirname, refresh, newfile elements ([c7670b4](https://github.com/billyeatcookies/biscuit/commit/c7670b45f7e968cc4971fcb0b4a8f630591a9eec) by billyeatcookies).
- Add issue templates ([dbecdfd](https://github.com/billyeatcookies/biscuit/commit/dbecdfda5a532144607bbff61b6e367ec5a080d3) by Billy).
- Add LICENSE ([ee8e244](https://github.com/billyeatcookies/biscuit/commit/ee8e244bd583a53101751f82154187725b38a3de) by Billy).
- Add README for repository ([6d46770](https://github.com/billyeatcookies/biscuit/commit/6d46770ae86e520b53771d7df331bab0f14aa323) by billyeatcookies).
- Add Contributing guidelines ([321b06f](https://github.com/billyeatcookies/biscuit/commit/321b06f1254c710cfc036b144ee1ca2cecc3f53a) by billyeatcookies).
- Add CODE OF CONDUCT ([f9d09e6](https://github.com/billyeatcookies/biscuit/commit/f9d09e6e6441e3d3ea341f0a650ad0fb07ad784e) by billyeatcookies).
- Add sample colorizer ([237904b](https://github.com/billyeatcookies/biscuit/commit/237904bd36a8a0f3721f9ec6e823452ce038270c) by billyeatcookies).
- Add shortcuts to emptytab ([a2cffd9](https://github.com/billyeatcookies/biscuit/commit/a2cffd93fd446ac8eb0186a3ad80b6d00f2291f0) by billyeatcookies).
- Add Resources Holder, Loader ([7fb0afd](https://github.com/billyeatcookies/biscuit/commit/7fb0afda29625ce9166468165ec296213ba2588f) by billyeatcookies).
- Add items that contain the term ([543f76f](https://github.com/billyeatcookies/biscuit/commit/543f76f0e169ecd01818d7503c6cf425578763c7) by billyeatcookies).
- add_all_items method, default size should be 70 ([f1992d9](https://github.com/billyeatcookies/biscuit/commit/f1992d9c929fb6660e5ad82ef86e5d9257af8607) by billyeatcookies).
- add git to requirements ([a004f14](https://github.com/billyeatcookies/biscuit/commit/a004f14563f5e2dbfbd3a7f784294eda654bebbb) by billyeatcookies).
- Add statusbar to the application ([4fcaa7e](https://github.com/billyeatcookies/biscuit/commit/4fcaa7ee891736fe07ca6aa147892e987477e66e) by billyeatcookies).
- Add `python-tkdnd` to requirements ([0cfaa5b](https://github.com/billyeatcookies/biscuit/commit/0cfaa5b963bf4fe36cbda427de943b509cd9f0f3) by billyeatcookies).
- Add requirements.txt ([b8dfdfa](https://github.com/billyeatcookies/biscuit/commit/b8dfdfadd1d5de217c0e493b2dcca6f954b7aca7) by billyeatcookies).
- Add pytest to project ([8eed5a2](https://github.com/billyeatcookies/biscuit/commit/8eed5a23937931c90006eb0dfc6b05d61a0461ee) by billyeatcookies).
- Add tkterminal submodule ([4ae5821](https://github.com/billyeatcookies/biscuit/commit/4ae5821b80eeef4a26fd8453262a2756a76d4ee7) by billyeatcookies).
- Add default settings, basic bindings, default theme ([c1fd236](https://github.com/billyeatcookies/biscuit/commit/c1fd236060a6207ca32bcbc4611ca94483dbf36a) by billyeatcookies).
- Add config files ([88c8dbb](https://github.com/billyeatcookies/biscuit/commit/88c8dbb21ecad87624526c8dc6c24dc362246ab2) by billyeatcookies).
- Add run API method for root ([e0551de](https://github.com/billyeatcookies/biscuit/commit/e0551de5aacfe0f65155e85ba01b72026e6d13e2) by billyeatcookies).
- Add gitignore ([57d855f](https://github.com/billyeatcookies/biscuit/commit/57d855f5a4d7318e3cbce393f7438d282a32bdf1) by billyeatcookies).

### Fixed

- fix scrollbar in terminal ([ee4bf12](https://github.com/billyeatcookies/biscuit/commit/ee4bf12c103cfad268291aa7f9885e46662647a9) by cid0rz).
- Fix linux version ([cfe3e9c](https://github.com/billyeatcookies/biscuit/commit/cfe3e9c058bb146b74364f55d0958cc4c6b114c7) by cid0rz).
- Fix for windows ([aff6080](https://github.com/billyeatcookies/biscuit/commit/aff608071f8918c32e01073390fb5725ab10eafc) by Billy).
- Fix working directory ([7262d7f](https://github.com/billyeatcookies/biscuit/commit/7262d7fd667e12632557094e68f72f079dcdc3ee) by Billy).
- Fix empty tab shortcuts with t for terminal and imprved readability ([a2ce28b](https://github.com/billyeatcookies/biscuit/commit/a2ce28b8bbdefbb4c0151455b58c44634b85ecd3) by cid0rz).
- Fix running instructions ([95cf8ad](https://github.com/billyeatcookies/biscuit/commit/95cf8ada0afcefd19af554376573acd34ebde0c9) by Billy).
- Fix command palette sizing, Update preview ([b57e4c5](https://github.com/billyeatcookies/biscuit/commit/b57e4c5aee6013812887f7088e2718da80380ac7) by billyeatcookies).
- Fix sizes ([06f18ef](https://github.com/billyeatcookies/biscuit/commit/06f18ef5b1e9900a53dd034db672f016451b2a74) by billyeatcookies).
- Fix bug in diff, decoding content properly ([5a2e6d3](https://github.com/billyeatcookies/biscuit/commit/5a2e6d3444bc6bc99f1ff5de6cfbbbfca252f5da) by billyeatcookies).
- Fix zooming of editor affects editor pane size ([a2c9c76](https://github.com/billyeatcookies/biscuit/commit/a2c9c765f8cb4d8a6b55aeedb27a9912f505c15b) by billyeatcookies).
- fix show_unsupported_dialog ([fb71e08](https://github.com/billyeatcookies/biscuit/commit/fb71e08020bf7cc0830ce967d7998f09dcc29f56) by billyeatcookies).
- Fix bindings ([b541956](https://github.com/billyeatcookies/biscuit/commit/b54195635ac174b66e47a2ef5091af2dcff68b53) by billyeatcookies).
- fix in theme settings ([af69d7b](https://github.com/billyeatcookies/biscuit/commit/af69d7b74528f6ce2e78bac680863572ca3c0bd2) by billyeatcookies).
- fix in theme loader, default value for theme parameter ([0eb2806](https://github.com/billyeatcookies/biscuit/commit/0eb2806e2e1b6d330f33a5a6b832918abb5e6509) by billyeatcookies).
- fix bug in bindings loader ([648e0da](https://github.com/billyeatcookies/biscuit/commit/648e0da0d79271516008e67e2405852b5d16f86d) by billyeatcookies).

### Changed

- Change line numbers background ([0bcc352](https://github.com/billyeatcookies/biscuit/commit/0bcc3527ff910644af7ff1d5ae89273c707858f5) by billyeatcookies).
- Change sidepane width on enabling ([8f578a9](https://github.com/billyeatcookies/biscuit/commit/8f578a936c2a5f4404632d7ba9209d6a5f567094) by billyeatcookies).
- Change GitWindow to GitPane ([c8a6d96](https://github.com/billyeatcookies/biscuit/commit/c8a6d96083edf55a54500eac9a6be64be698ef62) by billyeatcookies).
- change binding of command pallette to ctrl-shift-p ([02b316f](https://github.com/billyeatcookies/biscuit/commit/02b316f5790e4181fdd1c00582b5830fd32480f8) by billyeatcookies).
- Change font of editorpath ([7abc775](https://github.com/billyeatcookies/biscuit/commit/7abc775ed5bfe032bfbf2aa51b13779ea31fc21f) by billyeatcookies).
- changes in tkterminal ([8151a2c](https://github.com/billyeatcookies/biscuit/commit/8151a2c1a1e4245da01e147b0881ee7d7961ef75) by billyeatcookies).

### Removed

- Removed some comments ([a326d45](https://github.com/billyeatcookies/biscuit/commit/a326d459ebb596e679fb7a9df3fa4436d22f5027) by Billy).
- Remove path argument ([eb47ee9](https://github.com/billyeatcookies/biscuit/commit/eb47ee9bd86deece3de75e988b29b86e03857926) by Billy).
- Remove appdir from root ([0981cb1](https://github.com/billyeatcookies/biscuit/commit/0981cb141e2a5a8f368fc4d0baf0f314089434e1) by Billy).
- Remove unused dnd class ([bdf6be6](https://github.com/billyeatcookies/biscuit/commit/bdf6be66a5de9a2bff4fe73da0f189d05f606672) by billyeatcookies).
- Removed tkterminal ([18d8e64](https://github.com/billyeatcookies/biscuit/commit/18d8e64b8ac4cba7799c7c2ee12d642050f5f381) by billyeatcookies).
- Remove find replace widget ([20add20](https://github.com/billyeatcookies/biscuit/commit/20add20414c0ac210dc61242a30cd226ec2abd26) by billyeatcookies).
- Remove test.py ([5e67841](https://github.com/billyeatcookies/biscuit/commit/5e678410d826f249a8fe2b72e589ae3797ed8728) by billyeatcookies).
- Remove sample external font test ([0226955](https://github.com/billyeatcookies/biscuit/commit/022695561fa40f974e4fc561c08a6351094ae86e) by Billy).
- Remove unnecessary details from git toolbar ([5638f41](https://github.com/billyeatcookies/biscuit/commit/5638f41f22962aa1f56b08ff1472496a992b66bd) by billyeatcookies).
- Remove tree headings ([5705dae](https://github.com/billyeatcookies/biscuit/commit/5705dae563e62024dcb39e13c1e544a986e3155a) by billyeatcookies).
- Remove obsolete left container ([a9a645e](https://github.com/billyeatcookies/biscuit/commit/a9a645e6b47012fa7769d867100b4a45b8752a8e) by billyeatcookies).
- Remove sidebar test application ([c507753](https://github.com/billyeatcookies/biscuit/commit/c507753a5d340671650738da3ad35a11b629a647) by billyeatcookies).
- Remove test editor components ([81a05e2](https://github.com/billyeatcookies/biscuit/commit/81a05e2f0e94455f045e91c489909825d4592485) by billyeatcookies).
- Remove editor bindings for now ([9a088a0](https://github.com/billyeatcookies/biscuit/commit/9a088a0b87b33e95003b0d3dec17ee7c79021f21) by billyeatcookies).
- remove statusbar for now ([89667e2](https://github.com/billyeatcookies/biscuit/commit/89667e2e8090696fa52891b128abe4cc0489bf53) by billyeatcookies).
- remove cache dirs and files ([d95110c](https://github.com/billyeatcookies/biscuit/commit/d95110c0f4a2f4b5a3b499b07a9a4567dac3801e) by billyeatcookies).