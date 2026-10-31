# Changelog

## [1.2.0](https://github.com/yurguenmo/ferrist/compare/v1.1.0...v1.2.0) (2026-10-31)


### Features

* **match:** support independent return types per arm across Result, Option, and Enum ([ab43742](https://github.com/yurguenmo/ferrist/commit/ab437427120b830c30de1444b5efde95de4deaf0))

## [1.1.0](https://github.com/yurguenmo/ferrist/compare/v1.0.0...v1.1.0) (2026-10-31)


### Features

* **enum:** constrain VariantOf to declared variants for IDE autocomplete ([eb5e3e6](https://github.com/yurguenmo/ferrist/commit/eb5e3e63ad126facceded6604c24d676be69d19d))
* **option:** add unified Option.try for sync and async exception safety ([5c1c31f](https://github.com/yurguenmo/ferrist/commit/5c1c31f72360bd64ba9e82d36a7b2f069acab56a))
* **result:** add unified Result.try for sync and async exception safety ([e6e8d98](https://github.com/yurguenmo/ferrist/commit/e6e8d98831449349afd6746009bdb3de55a4f082))

## 1.0.0 (2026-10-31)


### Features

* **adts:** implement dedicated Result and Option types with method chaining ([86d3b4f](https://github.com/yurguenmo/ferrist/commit/86d3b4fcb8f760d4ab18ca1f5e808f1d9c838412))
* **core:** implement pure type-level enums with pattern matching and behavior ([1a7b1e5](https://github.com/yurguenmo/ferrist/commit/1a7b1e5e5b7b224ce898debf7e74ddac436abf98))
* **fn:** implement Try runner supporting sync and async generator pipelines ([694d5bc](https://github.com/yurguenmo/ferrist/commit/694d5bc536c0a2a8a3bba9fbfa15a65cd1c8b3b6))
