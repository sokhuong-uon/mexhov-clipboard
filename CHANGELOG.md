## [1.4.2](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.4.1...v1.4.2) (2026-04-03)


### Bug Fixes

* no special chars in service domain ([3fe73d8](https://github.com/sokhuong-uon/mexhov-clipboard/commit/3fe73d8c7a86f8a14966114c1507274b19c4edc6))

## [1.4.1](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.4.0...v1.4.1) (2026-04-03)


### Bug Fixes

* paste onto other app works on first attempt ([f9066be](https://github.com/sokhuong-uon/mexhov-clipboard/commit/f9066beff774e8b6f785e0442dd099890567047a))

# [1.4.0](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.3.5...v1.4.0) (2026-04-01)


### Features

* can customize hotkeys ([917fdab](https://github.com/sokhuong-uon/mexhov-clipboard/commit/917fdabf50e19c1b8658c8d56ec1103923d758b9))


### Performance Improvements

* memoize components and add is_env in db instead of recalcuate ([63d06eb](https://github.com/sokhuong-uon/mexhov-clipboard/commit/63d06ebc12b0a748500053c6a4845f43ecbc77d3))

## [1.3.5](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.3.4...v1.3.5) (2026-04-01)


### Bug Fixes

* can paste image into other apps on Windows ([d47562b](https://github.com/sokhuong-uon/mexhov-clipboard/commit/d47562b82bbd3728800e2ddafbe1ecd37fd39db0))

## [1.3.4](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.3.3...v1.3.4) (2026-03-31)


### Bug Fixes

* **mac:** add Mac specific dep ([449e68b](https://github.com/sokhuong-uon/mexhov-clipboard/commit/449e68b2a7a66afb83811bdada75a83273b6b108))

## [1.3.3](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.3.2...v1.3.3) (2026-03-31)


### Bug Fixes

* copy gif with click instead of double click ([bd3accf](https://github.com/sokhuong-uon/mexhov-clipboard/commit/bd3accff7b85d48336f1ce47f447f495ed135ada))

## [1.3.2](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.3.1...v1.3.2) (2026-03-31)


### Bug Fixes

* refresh client UI when connection droped to 0 ([cdba34b](https://github.com/sokhuong-uon/mexhov-clipboard/commit/cdba34b446d3519bdd6f7d8d6a6a174b6a45167b))

## [1.3.1](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.3.0...v1.3.1) (2026-03-31)


### Bug Fixes

* prevent UI from breaking when no gif data ([b1dbe04](https://github.com/sokhuong-uon/mexhov-clipboard/commit/b1dbe04c4348214934b3b9ee8877e7e0f7db2794))

# [1.3.0](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.2.0...v1.3.0) (2026-03-31)


### Bug Fixes

* copy gif on double click ([23cd696](https://github.com/sokhuong-uon/mexhov-clipboard/commit/23cd696b0bac960f66bb9b4dfc80398e5ef5be8c))
* secure messages over websocket ([8bedd1f](https://github.com/sokhuong-uon/mexhov-clipboard/commit/8bedd1f4dcc89a15c7ee66fb24cd71817bcf3dd7))


### Features

* broadcast clipboard over LAN ([bc15f41](https://github.com/sokhuong-uon/mexhov-clipboard/commit/bc15f41ab73b65f0aa69a6a9d187ef1aee17f32c))
* color format conversion ([a063497](https://github.com/sokhuong-uon/mexhov-clipboard/commit/a063497db9fc15278f48b764988f8b4f10745b21))
* toggle between normal order and pinned ([f51b36e](https://github.com/sokhuong-uon/mexhov-clipboard/commit/f51b36ef3faf1d7fd45c75624670ca94c7d6b874))

# [1.2.0](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.1.0...v1.2.0) (2026-03-29)


### Bug Fixes

* remove unused import and deprecated api ([5e0b949](https://github.com/sokhuong-uon/mexhov-clipboard/commit/5e0b9499fa83e40ccaba513b5adf579aff3ca19b))
* stop propogation when click QR in link preview ([f17e771](https://github.com/sokhuong-uon/mexhov-clipboard/commit/f17e771485750a7eac947066402c9a042f348109))


### Features

* also able to drag gif from gif list to other apps ([8ac63c2](https://github.com/sokhuong-uon/mexhov-clipboard/commit/8ac63c2de2b9b7046270790e8b0a0640bd43e146))
* can drag gif onto other apps ([04abd5e](https://github.com/sokhuong-uon/mexhov-clipboard/commit/04abd5ece5e829d4e2b5f29c7046bf97e35cfec0))


### Performance Improvements

* use events instead of polling ([1181c2f](https://github.com/sokhuong-uon/mexhov-clipboard/commit/1181c2f0dbfdd909c506d35892c7345f81510621))

# [1.1.0](https://github.com/sokhuong-uon/mexhov-clipboard/compare/v1.0.0...v1.1.0) (2026-03-29)


### Features

* render media url inline ([6f25417](https://github.com/sokhuong-uon/mexhov-clipboard/commit/6f254172edd1a774d97fa716050d742426382677))

# 1.0.0 (2026-03-29)


### Bug Fixes

* hide load more button if item is less than page limit ([fb88db4](https://github.com/sokhuong-uon/mexhov-clipboard/commit/fb88db4a513c3fdc829fd1587c37ef468f629f66))
* make it work even without focus ([b1657a5](https://github.com/sokhuong-uon/mexhov-clipboard/commit/b1657a54fe5f9708f332fa07b067a19771317986))
* mark 'Nothing is copied' as non-error ([d0254b0](https://github.com/sokhuong-uon/mexhov-clipboard/commit/d0254b039394e639c78a074e6d793be9696f45e5))
* show no match message if no match on search ([adcae8e](https://github.com/sokhuong-uon/mexhov-clipboard/commit/adcae8e20ca8aa890f72f90ce27480da070432f6))


### Features

* add Ctrl+K for search ([d91c0f8](https://github.com/sokhuong-uon/mexhov-clipboard/commit/d91c0f8e759ade8fac18bf9cb7bf361d23a68abd))
* add drag region ([d17ae1a](https://github.com/sokhuong-uon/mexhov-clipboard/commit/d17ae1ab341cd08aaf095398d0981429a7a8ba0a))
* add hotkeys for navigating through list ([2ba8ee2](https://github.com/sokhuong-uon/mexhov-clipboard/commit/2ba8ee25545118f41e5bce90311561b96bc901fc))
* add load more button ([d7b65c7](https://github.com/sokhuong-uon/mexhov-clipboard/commit/d7b65c71151f8438fea29e5c7215e3a7258d15b6))
* add search ([1baaac8](https://github.com/sokhuong-uon/mexhov-clipboard/commit/1baaac8c3d9438769cf287b00867f30d978c3980))
* can read image ([c751c30](https://github.com/sokhuong-uon/mexhov-clipboard/commit/c751c30990dc4d972bfd982dae599d0866792248))
* click link ([0933736](https://github.com/sokhuong-uon/mexhov-clipboard/commit/093373601414816f650904bc5f5eb18a69ce6850))
* dedup with content hashing ([a7eac7e](https://github.com/sokhuong-uon/mexhov-clipboard/commit/a7eac7e9878f9d2bfc07dd99cf1fc5c9effbb375))
* delete item with d hotkey ([b4c16d7](https://github.com/sokhuong-uon/mexhov-clipboard/commit/b4c16d750bad0b241fd874d6dd5d056bf9f963b8))
* display color ([a62dd66](https://github.com/sokhuong-uon/mexhov-clipboard/commit/a62dd66d516f3f6b56a1cfbeca44ff09a9d7e1c2))
* display content in pre ([5524738](https://github.com/sokhuong-uon/mexhov-clipboard/commit/5524738bc999ad36138b802a982e0e89748e2059))
* display gif. CLIENT BUNDLE WILL EXPOSE API KEY ([250adb5](https://github.com/sokhuong-uon/mexhov-clipboard/commit/250adb56ef9f5904c173b9b4950d89ab874cff6f))
* double click to copy ([fbe3983](https://github.com/sokhuong-uon/mexhov-clipboard/commit/fbe39839cb1882f61f470fc077685cbe1bc3911e))
* generate QR code for link ([81b802f](https://github.com/sokhuong-uon/mexhov-clipboard/commit/81b802ff5af6c4aa4dd9bd25d36b5824f05ae9cb))
* improve UI ([7d63d9d](https://github.com/sokhuong-uon/mexhov-clipboard/commit/7d63d9d304133a2c612d73fe655fd1a09d0b3d56))
* persist data and ordering ([a4cf3fc](https://github.com/sokhuong-uon/mexhov-clipboard/commit/a4cf3fc9a72e5c38b1979a8a15473674770f417e))
* preview link ([ffbf1bd](https://github.com/sokhuong-uon/mexhov-clipboard/commit/ffbf1bdd586996979873c85c485ac9884614bb53))
* receive system shortcut to toggle window ([f9b889d](https://github.com/sokhuong-uon/mexhov-clipboard/commit/f9b889de3a8f716bed4122bdab1bd5b2c9e94c83))
* show relative distance for date ([85082e7](https://github.com/sokhuong-uon/mexhov-clipboard/commit/85082e79db823676b3ee58faccd3cc19e56080f4))
* split key value for key-value content ([3763fa5](https://github.com/sokhuong-uon/mexhov-clipboard/commit/3763fa549fd0a6c7425158c364f6f72ba0d69382))
* use I hotkey to search as well ([5d9bcb1](https://github.com/sokhuong-uon/mexhov-clipboard/commit/5d9bcb153a62a8fc07bba54d8b1dd3ac862ecb01))


### Performance Improvements

* show skeleton before items loaded ([3bb8069](https://github.com/sokhuong-uon/mexhov-clipboard/commit/3bb806927599524c38046753e25ef168dd297987))
* use debouncer to improve search input ([b27d644](https://github.com/sokhuong-uon/mexhov-clipboard/commit/b27d6447cef62ab0ac5da7f168de2ebed690ddae))

# [1.3.0](https://github.com/mexdehor/mexdeclip/compare/v1.2.0...v1.3.0) (2026-03-28)


### Bug Fixes

* hide load more button if item is less than page limit ([fb88db4](https://github.com/mexdehor/mexdeclip/commit/fb88db4a513c3fdc829fd1587c37ef468f629f66))
* mark 'Nothing is copied' as non-error ([d0254b0](https://github.com/mexdehor/mexdeclip/commit/d0254b039394e639c78a074e6d793be9696f45e5))
* show no match message if no match on search ([adcae8e](https://github.com/mexdehor/mexdeclip/commit/adcae8e20ca8aa890f72f90ce27480da070432f6))


### Features

* add load more button ([d7b65c7](https://github.com/mexdehor/mexdeclip/commit/d7b65c71151f8438fea29e5c7215e3a7258d15b6))
* add search ([1baaac8](https://github.com/mexdehor/mexdeclip/commit/1baaac8c3d9438769cf287b00867f30d978c3980))
* display content in pre ([5524738](https://github.com/mexdehor/mexdeclip/commit/5524738bc999ad36138b802a982e0e89748e2059))
* generate QR code for link ([81b802f](https://github.com/mexdehor/mexdeclip/commit/81b802ff5af6c4aa4dd9bd25d36b5824f05ae9cb))
* persist data and ordering ([a4cf3fc](https://github.com/mexdehor/mexdeclip/commit/a4cf3fc9a72e5c38b1979a8a15473674770f417e))
* preview link ([ffbf1bd](https://github.com/mexdehor/mexdeclip/commit/ffbf1bdd586996979873c85c485ac9884614bb53))
* show relative distance for date ([85082e7](https://github.com/mexdehor/mexdeclip/commit/85082e79db823676b3ee58faccd3cc19e56080f4))
* split key value for key-value content ([3763fa5](https://github.com/mexdehor/mexdeclip/commit/3763fa549fd0a6c7425158c364f6f72ba0d69382))

# [1.2.0](https://github.com/mexdehor/mexdeclip/compare/v1.1.0...v1.2.0) (2026-01-16)


### Features

* can read image ([c751c30](https://github.com/mexdehor/mexdeclip/commit/c751c30990dc4d972bfd982dae599d0866792248))

# [1.1.0](https://github.com/mexdehor/mexdeclip/compare/v1.0.0...v1.1.0) (2026-01-10)


### Features

* receive system shortcut to toggle window ([f9b889d](https://github.com/mexdehor/mexdeclip/commit/f9b889de3a8f716bed4122bdab1bd5b2c9e94c83))

# 1.0.0 (2026-01-07)


### Bug Fixes

* make it work even without focus ([b1657a5](https://github.com/mexdehor/mexdeclip/commit/b1657a54fe5f9708f332fa07b067a19771317986))


### Features

* improve UI ([7d63d9d](https://github.com/mexdehor/mexdeclip/commit/7d63d9d304133a2c612d73fe655fd1a09d0b3d56))
