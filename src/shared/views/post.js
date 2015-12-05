import h from 'virtual-dom/h';
import exp from '../exp';
import { isBrowserWindow, getContentUrl, isContentCached } from '../helpers';

export default (post) => {
    const contentId = `posts/${post.id}`;

    return isContentCached(contentId).then(isCached => {
        const cacheOption = exp(isBrowserWindow) && (
            h('label', [
                h('input', { type: 'checkbox', checked: isCached, onchange: (event) => (
                    caches.open('content').then((cache) => {
                        const shouldCache = event.target.checked;
                        if (shouldCache) {
                            cache.add(getContentUrl(contentId))
                                .catch(() => event.target.checked = false);
                        } else {
                            cache.delete(getContentUrl(contentId));
                        }
                    })
                ) }),
                'Read offline'
            ])
        );

        return h('article', [
            h('header', [
                cacheOption,
                h('h2',
                    h('a', { href: '/' + contentId }, post.title)
                ),
                h('p', new Date(post.date).toDateString())
            ]),
            h('div', { innerHTML: post.body })
        ]);
    });
};