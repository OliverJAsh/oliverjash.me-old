/* eslint-env serviceworker */

import { getAssetFilename } from '../shared/helpers';

const version = 1;
const staticCacheName = 'static-' + version;
const contentCacheName = 'content';

const shellFileName = getAssetFilename('shell.html');
const shellAssetFileNames = [
    getAssetFilename('js/main-bundle.js'),
    getAssetFilename('js/vendor-bundle.js')
];

const expectedCaches = [
    staticCacheName,
    contentCacheName
];

const map = (collection, mapFn) => (
    Object.keys(collection).map(key => mapFn(collection[key], key))
);
const reduce = (collection, reduceFn, seed) => (
    Object.keys(collection).reduce((acc, key) => {
        const value = collection[key];
        return reduceFn(acc, value, key);
    }, seed)
);
const mapKeys = (collection, mapFn) => (
    reduce(collection, (acc, value, key) => {
        acc[mapFn(value, key)] = value;
        return acc;
    }, {})
);

const fetchAll = inputs => Promise.all(inputs.map(input => fetch(input)));

const addResponsesToCache = (cacheName, requestUrlToResponseMap) => (
    caches.open(cacheName).then((cache) => (
        map(requestUrlToResponseMap, (response, request) => cache.put(new Request(request), response))
    ))
);

const updateCache = () => {
    const cacheUrls = shellAssetFileNames.concat(shellFileName);
    return fetchAll(cacheUrls).then(assetResponses => {
        const allAssetResponsesOk = assetResponses.every(response => response.ok);

        if (allAssetResponsesOk) {
            const assetRequestUrlToResponseMap = mapKeys(assetResponses, (response, index) => cacheUrls[index]);
            return addResponsesToCache(staticCacheName, assetRequestUrlToResponseMap);
        }
    });
};

self.addEventListener('install', (event) => {
    console.log('Install');
    // Cache the shell
    event.waitUntil(updateCache());
});

self.addEventListener('activate', (event) => {
    console.log('Activate');
    const cacheKeysForDeletionPromise = caches.keys().then((keys) => (
        keys.filter((key) => (
            expectedCaches.every((i) => key !== i)
        ))
    ));

    event.waitUntil(
        cacheKeysForDeletionPromise.then((cacheKeysForDeletion) => {
            console.log('Flushing old caches: ' + cacheKeysForDeletion);
            return Promise.all(cacheKeysForDeletion.map((key) => (
                caches.delete(key)
            )));
        })
    );
});

self.addEventListener('fetch', (event) => {
    const requestURL = new URL(event.request.url);

    // Serve shell if root request and pathname is / or /posts/:postId
    const isRootRequest = requestURL.origin === location.origin;
    const homeOrArticlePageRegExp = new RegExp('^/(posts/.+)?$');
    const shouldServeShell = isRootRequest && homeOrArticlePageRegExp.test(requestURL.pathname);
    if (shouldServeShell) {
        event.respondWith(
            caches.match(shellFileName).then(response => (
                // Fallback to network in case the cache was deleted
                response || fetch(event.request)
            ))
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => (
                response || fetch(event.request)
            ))
        );
    }
});
