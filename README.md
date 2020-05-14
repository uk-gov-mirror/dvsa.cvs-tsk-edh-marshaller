# cvs-tsk-edh-marshaller
handles update requests destined for EDH and pipes them to SQS queues

### Prerequisites
- NodeJS 8.10
- Typescript - `npm install -g typescript`
- Serverless - `npm install -g serverless`

### Installing
- Install dependencies - `npm install`

### Building
- Building without source maps - `npm run build`
- Building with source maps - `npm run build:dev`

### Configuration
The configuration file can be found under `src/config/config.yml`.
Environment variable injection is possible with the syntax:
`${BRANCH}`, or you can specify a default value: `${BRANCH:local}`.

### Git Hooks

Please set up the following prepush git hook in .git/hooks/pre-push

```
#!/bin/sh
npm run prepush && git log -p | scanrepo

```

#### Security

Please install and run the following security programs as part of your testing process:

https://github.com/awslabs/git-secrets

- After installing, do a one-time set up with `git secrets --register-aws`. Run with `git secrets --scan`.

https://github.com/UKHomeOffice/repo-security-scanner

- After installing, run with `git log -p | scanrepo`.

These will be run as part of prepush so please make sure you set up the git hook above so you don't accidentally introduce any new security vulnerabilities.

### Testing
In order to test, you need to run the following:
- `npm run test` for unit tests,
- `npm run test-i` for integration tests, or
- `npm run coverage` all tests + coverage report

### Environmental variables

- The `BRANCH` environment variable indicates in which environment is this application running. Not setting this variable will result in defaulting to `local`.
- The `DEBUG` environment variable is used as a feature flag, to enable more extensive logging. Does more logging if value is `TRUE`, otherwise off
- The `VALIDATION` environment variable is used as a feature flag, to enable validation. Does validation if value is `TRUE`, otherwise off
