# README

## Getting started

It is assumed that you have npm installed.

1. Install Truffle globally.

```
npm install -g truffle
```

2. Install testrpc globally.

```
npm install -g ethereumjs-testrpc
```

3. Install the project's dependencies. At the root of the project, run:

```
npm install
```

## Project layout

* The project is a Truffle project.
* The source files are in `contracts/`. The migration scripts are in `migrations/`.
* The networks that Truffle will connect to are configured in `truffle.js`, which is at the root of the project. Currently, two are defined: `live` and `development`.

## Development

* To compile the source files, at the root of the project, run `truffle compile`.
* To run tests, run `truffle test`.
* To start up a test network locally, run `testrpc` in a dedicated terminal. 10 funded accounts are generated each time this test network is started. You will see console output as commands are issued to the network.
* To run the migration scripts for the first time, run`truffle migrate`. To re-run the migration scripts, use `truffle migrate --reset`. To specify a specific network that is configured in `truffle.js`, use `truffle migrate --network live`.
    * The default network is the `development` network.
