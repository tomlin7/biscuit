# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!-- insertion marker -->
## Unreleased

<small>[Compare with latest](https://github.com/billyeatcookies/Biscuit/compare/2.0.0...HEAD)</small>

### Added

- Added `requests` in dependency list ([56f92e5](https://github.com/billyeatcookies/Biscuit/commit/56f92e5f66a8a7f0c12674dccff511621e29dde5) by Satakun Utama).
- Added further checks to handle git not found exceptions ([c0bb977](https://github.com/billyeatcookies/Biscuit/commit/c0bb977459392a045c02a01cd7c65b0db311ab46) by Billy).
- Add poetry to project ([c490824](https://github.com/billyeatcookies/Biscuit/commit/c490824ad53124ee0527d52f66c41ff188bd706a) by Billy).
- Add games/game of life implementation - games/game of life ([fae2067](https://github.com/billyeatcookies/Biscuit/commit/fae2067b34add88467d5b23c887ba4481eb5627d) by Billy).
- Add sv-ttk to requirements ([9757ad7](https://github.com/billyeatcookies/Biscuit/commit/9757ad7909d141092b93358df2602f835c796b87) by Billy).

### Fixed

- fix: custom prompt is shown for linux only ([9cf9df9](https://github.com/billyeatcookies/Biscuit/commit/9cf9df9e69d8c0563420df26b5134bb47dba37da) by Billy).
- fix: Diff Editor lhs/rhs should be equally divided ([59fee40](https://github.com/billyeatcookies/Biscuit/commit/59fee40991341b6947830866a479cb9778890a0f) by Billy).
- fix: Poetry - python version can be any `^3.10` - add `poetry.lock` file ([da82367](https://github.com/billyeatcookies/Biscuit/commit/da82367e83f60fb7d8fe254c3811ed0f92031fec) by Billy).
- fix: Status bar editmode info are not hidden when editor is closed ([765d5ce](https://github.com/billyeatcookies/Biscuit/commit/765d5ced7e8acce1a625ec616c3749ad20e2f9a6) by Billy).
- fix #55: theming autocompletions correctly ([f145b2e](https://github.com/billyeatcookies/Biscuit/commit/f145b2efb3fab713c41b68279300e44bcd3f26e5) by Billy).
- fix: enforce module restrictions only for the imported extensions, not globally ([d28ec3b](https://github.com/billyeatcookies/Biscuit/commit/d28ec3baf692e537cc4bdf8e2585c3b669a650e6) by Billy).
- Fix the closure bug with games manager ([bc18052](https://github.com/billyeatcookies/Biscuit/commit/bc1805228eec4fda9cfb5d902617e180fbe1376d) by Billy).
- Fix #59: Notifications not showing up on `info`, `warn`, `error` calls ([a77c15c](https://github.com/billyeatcookies/Biscuit/commit/a77c15c1ad7d435fb85a03d35c91be744050279c) by Billy).
- Fix #58: Actionsets registered are not updated when new actions are added ([f4f4817](https://github.com/billyeatcookies/Biscuit/commit/f4f4817e088dfc0c22bf74a0f0166620b9c43fe0) by Billy).
- Fix <Control-`> binding not working in linux - now using <Control-grave> ([68395f0](https://github.com/billyeatcookies/Biscuit/commit/68395f077e0dc093a121688424c8550bab44d778) by Billy).
- Fix #49: stop highlighting when file is unsupported ([0c8ed13](https://github.com/billyeatcookies/Biscuit/commit/0c8ed13bc7684de7224fa9e611ac683e352a1264) by Billy).
- FIX #48 If a single file is opened, pathview is not working ([29f7fbe](https://github.com/billyeatcookies/Biscuit/commit/29f7fbe205ad354258b11a189549a2d3f611a5f1) by Billy).

### Removed

- Remove unnecessary instances ([acc99e3](https://github.com/billyeatcookies/Biscuit/commit/acc99e34a0a7970e22e1554b30ab3ec12183bd58) by Billy).

<!-- insertion marker -->
## [2.0.0](https://github.com/billyeatcookies/Biscuit/releases/tag/2.0.0) - 2023-06-14

<small>[Compare with v1.0.0](https://github.com/billyeatcookies/Biscuit/compare/v1.0.0...2.0.0)</small>

### Added

- Add badges ([4a1afc7](https://github.com/billyeatcookies/Biscuit/commit/4a1afc79561a90dd603c2f2343225d29911c4b57) by Billy).
- Add TODOs ([8b2eb6a](https://github.com/billyeatcookies/Biscuit/commit/8b2eb6ab0da4600ced42f044eba44093b63045d5) by Billy).
- Added panelbar ([d84f536](https://github.com/billyeatcookies/Biscuit/commit/d84f53660be41281234fb46c952d6f19ad622ae5) by Billy).
- add a games folder and start to work in tetris ([5d3bb23](https://github.com/billyeatcookies/Biscuit/commit/5d3bb239839deaea9a235a539fd8a1ff193b4922) by cid0rz).
- Add documentation for layout and configs ([c53749a](https://github.com/billyeatcookies/Biscuit/commit/c53749af199e9844b805c73a9635d1c91c9f1f7b) by Billy).

### Fixed

- Fix for directorytree ([443e833](https://github.com/billyeatcookies/Biscuit/commit/443e833a4f96bfa4b5c57b3e980b2cbcd124dc34) by Billy).
- Fix file searching feature in palette, fix explorer ([1685a53](https://github.com/billyeatcookies/Biscuit/commit/1685a53fdab015453d6622cf8ad91b29b71f5a4a) by Billy).
- Fix terminal Fix bug where command line output was being pasted repeatedly Temporarily remove bash prompts ([928f0a8](https://github.com/billyeatcookies/Biscuit/commit/928f0a80289781f7a681682575b05a2d564da52f) by Billy).
- Fix sizing of panel, editors, menubar ([710e4f3](https://github.com/billyeatcookies/Biscuit/commit/710e4f3ebca894012cb609047e553d6a24576d05) by Billy).
- Fix bug: menubar and statusbar are not visible ([2e82a58](https://github.com/billyeatcookies/Biscuit/commit/2e82a580ae05533eae20028c3fbb2836cad6ef10) by Billy).
- Fix Sidebar slots, Panel tabs, Editor tabs ([f3c95af](https://github.com/billyeatcookies/Biscuit/commit/f3c95afe2b8c5874bc4395de224735d23d28938f) by Billy).
- fix preferred editors ([c321dcb](https://github.com/billyeatcookies/Biscuit/commit/c321dcb88da653744f4d1c5e6ee1fc1bde5f35ae) by cid0rz).

### Changed

- Change colors of editor tabs, editorsbar ([a0319db](https://github.com/billyeatcookies/Biscuit/commit/a0319db943eab7b9be63279bf94c965c001096cf) by Billy).
- Changes in View system for panel and sidebar ([b058b96](https://github.com/billyeatcookies/Biscuit/commit/b058b963581d892603a0bccc4765cf5e830daf0b) by Billy).

### Removed

- remove unmatched bracket ([94ee2a6](https://github.com/billyeatcookies/Biscuit/commit/94ee2a6ad54f0fb221ad6ec4f472bc6c3a427aaf) by Billy).
- Remove unnecessary files ([ec4aa07](https://github.com/billyeatcookies/Biscuit/commit/ec4aa076c8ceff0d8abc8b2a09f2762f995030c8) by Billy).
- Remove tkdnd temporarily ([259b408](https://github.com/billyeatcookies/Biscuit/commit/259b4081f5891c4dedc44635f03e2eb81f7a9187) by Billy).
- remove some debug statements ([6faa20c](https://github.com/billyeatcookies/Biscuit/commit/6faa20c7755ab6317d7b68b3dfdd57c8a972750b) by cid0rz).
- Remove unnecessary image resources ([84a934a](https://github.com/billyeatcookies/Biscuit/commit/84a934ac64c6f77b8bbef6e53f0220bd20f2dcfe) by Billy).

## [v1.0.0](https://github.com/billyeatcookies/Biscuit/releases/tag/v1.0.0) - 2022-05-10

<small>[Compare with first commit](https://github.com/billyeatcookies/Biscuit/compare/24560012f0ef285f50d8804b201749160ad4f490...v1.0.0)</small>

### Added

- Add sysinfo to base class ([dbe909d](https://github.com/billyeatcookies/Biscuit/commit/dbe909dd1857de715f6a90e8d2e881436efbed53) by billyeatcookies).
- Add new terminal ([ea2189f](https://github.com/billyeatcookies/Biscuit/commit/ea2189fb3d9176a4d5fe4589ce90a2f05ca45157) by billyeatcookies).
- add start buttons and useful resources to welcome page ([5468e23](https://github.com/billyeatcookies/Biscuit/commit/5468e23bfe2368ea494c58831401a66d13f399f7) by billyeatcookies).
- Add welcome page ([0f82887](https://github.com/billyeatcookies/Biscuit/commit/0f8288754607e9f55e1b571f2d2a262cd2daa442) by billyeatcookies).
- Add diff colors based on changes ([3fb016e](https://github.com/billyeatcookies/Biscuit/commit/3fb016e8c265e90f88d188ba5ef318efce38d639) by billyeatcookies).
- Add filetype library to dependencies, new filetype class ([7d195bc](https://github.com/billyeatcookies/Biscuit/commit/7d195bcb0666b30c8475a5c9ed0ced5de2839bea) by billyeatcookies).
- Add toolbar containing dirname, refresh, newfile elements ([c7670b4](https://github.com/billyeatcookies/Biscuit/commit/c7670b45f7e968cc4971fcb0b4a8f630591a9eec) by billyeatcookies).
- Add issue templates ([dbecdfd](https://github.com/billyeatcookies/Biscuit/commit/dbecdfda5a532144607bbff61b6e367ec5a080d3) by Billy).
- Add LICENSE ([ee8e244](https://github.com/billyeatcookies/Biscuit/commit/ee8e244bd583a53101751f82154187725b38a3de) by Billy).
- Add README for repository ([6d46770](https://github.com/billyeatcookies/Biscuit/commit/6d46770ae86e520b53771d7df331bab0f14aa323) by billyeatcookies).
- Add Contributing guidelines ([321b06f](https://github.com/billyeatcookies/Biscuit/commit/321b06f1254c710cfc036b144ee1ca2cecc3f53a) by billyeatcookies).
- Add CODE OF CONDUCT ([f9d09e6](https://github.com/billyeatcookies/Biscuit/commit/f9d09e6e6441e3d3ea341f0a650ad0fb07ad784e) by billyeatcookies).
- Add sample colorizer ([237904b](https://github.com/billyeatcookies/Biscuit/commit/237904bd36a8a0f3721f9ec6e823452ce038270c) by billyeatcookies).
- Add shortcuts to emptytab ([a2cffd9](https://github.com/billyeatcookies/Biscuit/commit/a2cffd93fd446ac8eb0186a3ad80b6d00f2291f0) by billyeatcookies).
- Add Resources Holder, Loader ([7fb0afd](https://github.com/billyeatcookies/Biscuit/commit/7fb0afda29625ce9166468165ec296213ba2588f) by billyeatcookies).
- Add items that contain the term ([543f76f](https://github.com/billyeatcookies/Biscuit/commit/543f76f0e169ecd01818d7503c6cf425578763c7) by billyeatcookies).
- add_all_items method, default size should be 70 ([f1992d9](https://github.com/billyeatcookies/Biscuit/commit/f1992d9c929fb6660e5ad82ef86e5d9257af8607) by billyeatcookies).
- add git to requirements ([a004f14](https://github.com/billyeatcookies/Biscuit/commit/a004f14563f5e2dbfbd3a7f784294eda654bebbb) by billyeatcookies).
- Add statusbar to the application ([4fcaa7e](https://github.com/billyeatcookies/Biscuit/commit/4fcaa7ee891736fe07ca6aa147892e987477e66e) by billyeatcookies).
- Add `python-tkdnd` to requirements ([0cfaa5b](https://github.com/billyeatcookies/Biscuit/commit/0cfaa5b963bf4fe36cbda427de943b509cd9f0f3) by billyeatcookies).
- Add requirements.txt ([b8dfdfa](https://github.com/billyeatcookies/Biscuit/commit/b8dfdfadd1d5de217c0e493b2dcca6f954b7aca7) by billyeatcookies).
- Add pytest to project ([8eed5a2](https://github.com/billyeatcookies/Biscuit/commit/8eed5a23937931c90006eb0dfc6b05d61a0461ee) by billyeatcookies).
- Add tkterminal submodule ([4ae5821](https://github.com/billyeatcookies/Biscuit/commit/4ae5821b80eeef4a26fd8453262a2756a76d4ee7) by billyeatcookies).
- Add default settings, basic bindings, default theme ([c1fd236](https://github.com/billyeatcookies/Biscuit/commit/c1fd236060a6207ca32bcbc4611ca94483dbf36a) by billyeatcookies).
- Add config files ([88c8dbb](https://github.com/billyeatcookies/Biscuit/commit/88c8dbb21ecad87624526c8dc6c24dc362246ab2) by billyeatcookies).
- Add run API method for root ([e0551de](https://github.com/billyeatcookies/Biscuit/commit/e0551de5aacfe0f65155e85ba01b72026e6d13e2) by billyeatcookies).
- Add gitignore ([57d855f](https://github.com/billyeatcookies/Biscuit/commit/57d855f5a4d7318e3cbce393f7438d282a32bdf1) by billyeatcookies).

### Fixed

- fix scrollbar in terminal ([ee4bf12](https://github.com/billyeatcookies/Biscuit/commit/ee4bf12c103cfad268291aa7f9885e46662647a9) by cid0rz).
- Fix linux version ([cfe3e9c](https://github.com/billyeatcookies/Biscuit/commit/cfe3e9c058bb146b74364f55d0958cc4c6b114c7) by cid0rz).
- Fix for windows ([aff6080](https://github.com/billyeatcookies/Biscuit/commit/aff608071f8918c32e01073390fb5725ab10eafc) by Billy).
- Fix working directory ([7262d7f](https://github.com/billyeatcookies/Biscuit/commit/7262d7fd667e12632557094e68f72f079dcdc3ee) by Billy).
- Fix empty tab shortcuts with t for terminal and imprved readability ([a2ce28b](https://github.com/billyeatcookies/Biscuit/commit/a2ce28b8bbdefbb4c0151455b58c44634b85ecd3) by cid0rz).
- Fix running instructions ([95cf8ad](https://github.com/billyeatcookies/Biscuit/commit/95cf8ada0afcefd19af554376573acd34ebde0c9) by Billy).
- Fix command palette sizing, Update preview ([b57e4c5](https://github.com/billyeatcookies/Biscuit/commit/b57e4c5aee6013812887f7088e2718da80380ac7) by billyeatcookies).
- Fix sizes ([06f18ef](https://github.com/billyeatcookies/Biscuit/commit/06f18ef5b1e9900a53dd034db672f016451b2a74) by billyeatcookies).
- Fix bug in diff, decoding content properly ([5a2e6d3](https://github.com/billyeatcookies/Biscuit/commit/5a2e6d3444bc6bc99f1ff5de6cfbbbfca252f5da) by billyeatcookies).
- Fix zooming of editor affects editor pane size ([a2c9c76](https://github.com/billyeatcookies/Biscuit/commit/a2c9c765f8cb4d8a6b55aeedb27a9912f505c15b) by billyeatcookies).
- fix show_unsupported_dialog ([fb71e08](https://github.com/billyeatcookies/Biscuit/commit/fb71e08020bf7cc0830ce967d7998f09dcc29f56) by billyeatcookies).
- Fix bindings ([b541956](https://github.com/billyeatcookies/Biscuit/commit/b54195635ac174b66e47a2ef5091af2dcff68b53) by billyeatcookies).
- fix in theme settings ([af69d7b](https://github.com/billyeatcookies/Biscuit/commit/af69d7b74528f6ce2e78bac680863572ca3c0bd2) by billyeatcookies).
- fix in theme loader, default value for theme parameter ([0eb2806](https://github.com/billyeatcookies/Biscuit/commit/0eb2806e2e1b6d330f33a5a6b832918abb5e6509) by billyeatcookies).
- fix bug in bindings loader ([648e0da](https://github.com/billyeatcookies/Biscuit/commit/648e0da0d79271516008e67e2405852b5d16f86d) by billyeatcookies).

### Changed

- Change line numbers background ([0bcc352](https://github.com/billyeatcookies/Biscuit/commit/0bcc3527ff910644af7ff1d5ae89273c707858f5) by billyeatcookies).
- Change sidepane width on enabling ([8f578a9](https://github.com/billyeatcookies/Biscuit/commit/8f578a936c2a5f4404632d7ba9209d6a5f567094) by billyeatcookies).
- Change GitWindow to GitPane ([c8a6d96](https://github.com/billyeatcookies/Biscuit/commit/c8a6d96083edf55a54500eac9a6be64be698ef62) by billyeatcookies).
- change binding of command pallette to ctrl-shift-p ([02b316f](https://github.com/billyeatcookies/Biscuit/commit/02b316f5790e4181fdd1c00582b5830fd32480f8) by billyeatcookies).
- Change font of editorpath ([7abc775](https://github.com/billyeatcookies/Biscuit/commit/7abc775ed5bfe032bfbf2aa51b13779ea31fc21f) by billyeatcookies).
- changes in tkterminal ([8151a2c](https://github.com/billyeatcookies/Biscuit/commit/8151a2c1a1e4245da01e147b0881ee7d7961ef75) by billyeatcookies).

### Removed

- Removed some comments ([a326d45](https://github.com/billyeatcookies/Biscuit/commit/a326d459ebb596e679fb7a9df3fa4436d22f5027) by Billy).
- Remove path argument ([eb47ee9](https://github.com/billyeatcookies/Biscuit/commit/eb47ee9bd86deece3de75e988b29b86e03857926) by Billy).
- Remove appdir from root ([0981cb1](https://github.com/billyeatcookies/Biscuit/commit/0981cb141e2a5a8f368fc4d0baf0f314089434e1) by Billy).
- Remove unused dnd class ([bdf6be6](https://github.com/billyeatcookies/Biscuit/commit/bdf6be66a5de9a2bff4fe73da0f189d05f606672) by billyeatcookies).
- Removed tkterminal ([18d8e64](https://github.com/billyeatcookies/Biscuit/commit/18d8e64b8ac4cba7799c7c2ee12d642050f5f381) by billyeatcookies).
- Remove find replace widget ([20add20](https://github.com/billyeatcookies/Biscuit/commit/20add20414c0ac210dc61242a30cd226ec2abd26) by billyeatcookies).
- Remove test.py ([5e67841](https://github.com/billyeatcookies/Biscuit/commit/5e678410d826f249a8fe2b72e589ae3797ed8728) by billyeatcookies).
- Remove sample external font test ([0226955](https://github.com/billyeatcookies/Biscuit/commit/022695561fa40f974e4fc561c08a6351094ae86e) by Billy).
- Remove unnecessary details from git toolbar ([5638f41](https://github.com/billyeatcookies/Biscuit/commit/5638f41f22962aa1f56b08ff1472496a992b66bd) by billyeatcookies).
- Remove tree headings ([5705dae](https://github.com/billyeatcookies/Biscuit/commit/5705dae563e62024dcb39e13c1e544a986e3155a) by billyeatcookies).
- Remove obsolete left container ([a9a645e](https://github.com/billyeatcookies/Biscuit/commit/a9a645e6b47012fa7769d867100b4a45b8752a8e) by billyeatcookies).
- Remove sidebar test application ([c507753](https://github.com/billyeatcookies/Biscuit/commit/c507753a5d340671650738da3ad35a11b629a647) by billyeatcookies).
- Remove test editor components ([81a05e2](https://github.com/billyeatcookies/Biscuit/commit/81a05e2f0e94455f045e91c489909825d4592485) by billyeatcookies).
- Remove editor bindings for now ([9a088a0](https://github.com/billyeatcookies/Biscuit/commit/9a088a0b87b33e95003b0d3dec17ee7c79021f21) by billyeatcookies).
- remove statusbar for now ([89667e2](https://github.com/billyeatcookies/Biscuit/commit/89667e2e8090696fa52891b128abe4cc0489bf53) by billyeatcookies).
- remove cache dirs and files ([d95110c](https://github.com/billyeatcookies/Biscuit/commit/d95110c0f4a2f4b5a3b499b07a9a4567dac3801e) by billyeatcookies).

