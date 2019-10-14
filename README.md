# What

This commandline tool installs Elm libraries behind corporate firewalls.

The `elm install` in version 0.19.0 [may not work](https://github.com/elm/core/issues/1036) if your corproate network has interesting ways of doing things. This includes tools like [elm-json](https://github.com/zwilias/elm-json) which also may not work for the same reasons.

Node.js however is much more hackable. Specifically:

1. Obeying weird http/https proxies
2. turning off ssl via `npm config set strict-ssl=false`
3. turn off SSL globally via `process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0`
4. utilizing authenticated proxy urls via `npm config set proxy http://proxy.company.com:8080` and `npm config set https-proxy http://proxy.company.com:8080`
5. Pointing to an internal registry vs. public Github via `npm config set registry https://registry.your-registry.npme.io/`

This commandline tool utilizes the above features to ensure we can install Elm libraries so `elm make` will work correctly in corproate networks. If it doesn't, we'll make it work.

# Installing

To install:

`npm i elm-library-installer`

Ensure this is where your code is and is in the same directory as your `elm.json`. Do not install globally (...you can, I haven't tested it, heh!).

Ensure you already have these installed:

1. Install [Node.js](https://nodejs.org/en/). In a Terminal, type `npm -v` and hit <kbd>Enter</kbd> to verify it worked.
2. Install [Elm](https://guide.elm-lang.org/install/elm.html). In a Terminal, type `elm --version` and hit <kbd>Enter</kbd> to verify it worked.

# This Doesn't Work For Me

Ok, Plan B. Go use [Elm Offline](https://github.com/drathier/elm-offline). It has most of the known Elm packages. You can then manually update the versions you need.

1. Unzip all the [Elm Offline release](https://github.com/drathier/elm-offline/releases) in your `.elm` directory
2. Go find a package you need by going to find it on github.com
3. Click the "Releases" tab and find the version you need.
4. Create the folder in the `.elm` folder path that matches what you need. For example, if you have the Elm Browser v1.0.0, but your `elm.json` says v1.0.1, then you can download a zip of it on Github. Unzip it somewhere else like your Desktop or Downloads. Make a folder in `.elm/0.19.0/package/elm/browser/1.0.1`. Then copy the contents of the unzip into that new folder.

# How Does It Work

Elm installs elm libraries listed in your `elm.json` when you run `elm make`. It puts them in your user directory in a folder called `.elm`. This has all Elm libraries for all applications. There is no need to have a local `node_modules` like you do in Node, or virtual environment like you do in Python. There is one source of truth. This is why working on multiple projects is so fast because most libaries are already downloaded to your machine.

This commandline tool reads your `elm.json`, loads all those dependencies from github, downloads the zip files into the correct version folders in your `.elm` folder, and then unzips them.

# TODO

- cache if zip already downloaded
- moooarrrr unit tests
- moaarr prompts to verify directories are correct
- moar validation to esnure paths look correct
- backup your stuff for you
