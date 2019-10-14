const log = console.log
const request = require('request-promise')
const { exec } = require('child_process')
const fs = require('fs')
const { getOr, get, map, toPairs, isString, isNil } = require('lodash/fp')
const debug = require('debug')('elm-library-installer')

const tap = label => (...args) =>
    debug(`${label} %O`, args) ||
    Promise.resolve.apply(Promise, args)

const getElmVersion = () =>
    new Promise((success, failure) =>
        exec('elm --version', (error, stdout, stderr) =>
            error
            ? failure(error)
            : success(stdout.trim())
        )
    )

const getElmDependencies = filename =>
    new Promise((success, failure) =>
        fs.readFile(
            filename,
            'utf-8',
            (error, data) =>
                error
                ? failure(error)
                : success(data)
            )
    )
    .then(parseJSON)
    .then(
        result => ({
            ...get('dependencies.direct', result),
            ...get('dependencies.indirect', result),
            ...get('test-dependencies.direct', result),
            ...get('test-dependencies.indirect', result)
        })
    )
    .then(toPairs)
    .then(
        map(
            ([ name, version ]) =>
                ({ url: `https://github.com/${name}/zipball/${version}/`, name, version })
        )
    )
    .then(
        deps =>
            Promise.all(
                map(
                    getPackagePath,
                    deps
                )
            )
    )

const getPackagePath = dependency => {
    const name = getOr('???', 'name', dependency)
    if(name === '???') {
        return Promise.reject(new Error('Cannot get packagepath because dependency has no name.'))
    }
    const orgAndName = name.split('/')
    if(orgAndName === [] || orgAndName === [''] || orgAndName.length < 2) {
        return Promise.reject(new Error('Failed to parse organization and package name.'))
    }
    const [org, dependencyName] = orgAndName
    return Promise.resolve({
        ...dependency,
        dependencyName: dependencyName,
        packagePath: `${org}/${dependencyName}/${dependency.version}`
    })
}

const parseJSON = string => {
    try {
        const result = JSON.parse(string)
        return Promise.resolve(result)
    }catch(error) {
        return Promise.reject(error)
    }
}


const downloadElmDependenciesToZIPFiles = targetPath => dependencies =>
    makePathIfItDoesNotExist(targetPath)
    .then(tap(`makePathIfItDoesNotExist: ${targetPath}`))
    .then(
        () =>
            Promise.all(
                map(
                    dependency =>
                        debug("dependency.url:", dependency.url) ||
                        request({
                            uri: dependency.url,
                            encoding: null
                        }),
                    dependencies
                )
            )
    )
    .then(
        binaries =>
            Promise.all(
                binaries.map(
                    (value, index) => {
                        const dep = dependencies[index]
                        debug("makePathIfItDoesNotExist:", `${targetPath}/${dep.packagePath}`)
                        return makePathIfItDoesNotExist(`${targetPath}/${dep.packagePath}`)
                    }
                )
            )
            .then(
                () =>
                    Promise.all(
                        binaries.map(
                            (value, index) => {
                                const dep = dependencies[index]
                                debug("writeFile:", `${targetPath}/${dep.packagePath}/${dep.dependencyName}.zip`)
                                return writeFile(`${targetPath}/${dep.packagePath}/${dep.dependencyName}.zip`)(value)
                            }
                        )
                    )
            )
            .then(
                () =>
                    map(
                        dep =>
                            ({
                                path: `${targetPath}/${dep.packagePath}`,
                                zipFileName: `${dep.dependencyName}.zip`
                            }),
                        dependencies
                    )
            )
    )

const writeFile = path => data =>
    new Promise((success, failure) =>
        fs.writeFile(
            path,
            data,
            error =>
                error
                ? failure(error)
                : success(data)
        )
    )

const pathExists = path =>
    new Promise( resolve =>
        fs.exists(
            path,
            resolve
        )
    )

const makePathIfItDoesNotExist = path =>
    pathExists(path)
    .then(
        exists =>
            exists
            ? true
            : makePath(path)
    )

const makePath = path =>
    // console.log("making path", path) ||
    new Promise((success, failure) =>
        fs.mkdir(
            path,
            {recursive: true},
            error =>
                error
                ? failure(error)
                : success(path)
        )
    )

const getHomeDirectory = () => {
    try {
        const dir = require('os').homedir()
        if(isString(dir) && dir.length > 0) {
            return Promise.resolve(dir)
        }
        return Promise.reject(new Error(`The home directory either is not a string or is empty: ${dir}`))
    } catch(error) {
        return Promise.reject(error)
    }
}

const getElm19PackagePath = () => 
    getHomeDirectory()
    .then(
        home =>
            `${home}/.elm/0.19.0/package`
    )

// [jwarden 10.13.2019] NOTE/WARNING/FIXME/TODO: This is Mac only.
const unzipAndDelete = path => zipFileName =>
    new Promise((success, failure) =>
        exec(`unzip -o ${path}/${zipFileName} -d ${path} && rm -f ${path}/${zipFileName}`, (error, stdout, stderr) =>
            error
            ? failure(error)
            : success(stdout.trim())
        )
    )
    .then(
        () =>
            getDirectories(path)
            .then(
                paths => {
                    const [ topDirectory ] = paths
                    if(isNil(topDirectory) || topDirectory === '') {
                        return Promise.reject(new Error('No directory found, so cannot move files.'))
                    }
                    return copyFilesUpOneDirectory(path)(topDirectory)
                }
            )
    )

const copyFilesUpOneDirectory = path => topDirectory =>
    new Promise((success, failure) =>
        exec(
            `cd ${path} && cp -vaR ${topDirectory}/. . && rm -rf ${topDirectory}`,
            (error, stdout, stderr) =>
                error
                ? failure(error)
                : success(stdout)
        )
    )

const getDirectories = source =>
    new Promise((success, failure) =>
        fs.readdir(
            source, 
            { withFileTypes: true}, 
            (error, files) =>
                error
                ? failure(error)
                : success(
                    files
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name)
                )
        )
    )

const installAllElm19Dependencies = verboseDebugging =>
    require('debug').enable('elm-library-installer', verboseDebugging) ||
    getElm19PackagePath()
    .then(tap('getElm19PackagePath'))
    .then(
        home =>
            getElmDependencies('elm.json')
            .then(tap('getElmDependencies'))
            .then(downloadElmDependenciesToZIPFiles(home))
            // .then(
            //     result => log("result:", result) || result
            // )
            .then(
                paths =>
                    Promise.all(
                        map(
                            ({path, zipFileName }) =>
                                unzipAndDelete(path)(zipFileName),
                            paths
                        )
                    )
                    .then(
                        () =>
                            map(
                                get('path'),
                                paths
                            )
                    )
                    .then(
                        paths =>
                            verboseDebugging
                            ? debug("paths: %O", paths)
                            : paths
                    )
            )
    )

module.exports = { installAllElm19Dependencies }