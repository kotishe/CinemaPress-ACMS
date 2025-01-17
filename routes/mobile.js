'use strict';

/**
 * Module dependencies.
 */

var CP_cache    = require('../lib/CP_cache');
var CP_cachep2p = require('../lib/CP_cachep2p');
var CP_decode   = require('../lib/CP_decode');
var CP_translit = require('../lib/CP_translit');
var CP_regexp   = require('../lib/CP_regexp');

/**
 * Configuration dependencies.
 */

var config  = require('../config/production/config');
var modules = require('../config/production/modules');

/**
 * Node dependencies.
 */

var cheerio = require('cheerio');
var crypto  = require('crypto');
var minify  = require('html-minifier').minify;
var maxmind = require('maxmind');
var parser  = require('ua-parser-js');
var md5     = require('md5');
var express = require('express');
var router  = express.Router();

/**
 * Route dependencies.
 */

var index    = require('./paths/index');
var movie    = require('./paths/movie');
var category = require('./paths/category');

/**
 * Route CP modules dependencies.
 */

var content = require('./paths/content');

/**
 * Callback.
 *
 * @callback Callback
 * @param {Object} err
 * @param {Object} [render]
 */

router.get('/:level1?/:level2?/:level3?/:level4?', function (req, res, next) {

    // -----------------------------------------------------------------
    // Checking activation module the mobile site.
    // -----------------------------------------------------------------

    if (!modules.mobile.status) {
        return next({
            "status": 404,
            "message": "Мобильная версия сайта не активирована. Сайт адаптируется под экран и одинаково прекрасно отображается, как на больших экранах, так и на мобильных устройствах под управлением iOS, Android или WindowsPhone."
        });
    }

    // -----------------------------------------------------------------

    var options = {};
    options.domain = 'm.' + config.domain;
    options.sub = req.cookies.CP_sub || '';
    options.debug = process.env.NODE_ENV !== 'production'
        ? {"url": parseUrl(), "duration": {"current": new Date(), "all": new Date()}, "detail": []}
        : null;

    req.query.start_time = req.query.start_time || '';
    options.start_time = '';
    if (req.query.start_time &&
        req.query.start_time.replace(/[^0-9]/ig, '')) {
        options.start_time = req.query.start_time.replace(/[^0-9]/ig, '');
    }

    req.query.start_episode = req.query.start_episode || '';
    options.start_episode = '';
    if (req.query.start_episode &&
        req.query.start_episode.replace(/[^0-9a-z|]/ig, '')) {
        options.start_episode = req.query.start_episode.replace(/[^0-9a-z|]/ig, '');
    }

    if (modules.adv.status || modules.blocking.status || modules.abuse.status) {
        options.userinfo = {};
        options.userinfo.device = 'mobile';
        if (parseInt(modules.adv.data.target) || parseInt(modules.abuse.data.country) || (modules.blocking.data.display === 'legal' && modules.blocking.data.legal.countries)) {
            var lookup = maxmind.openSync('/home/' + config.domain + '/files/GeoLite2-Country.mmdb', {
                cache: {
                    max: 1000,
                    maxAge: 1000 * 60 * 60 * 24 * 7
                }
            });
            var info = lookup.get(req.ip);
            var user = parser(req.headers['user-agent']);
            options.userinfo.country_en = (info.country && info.country.names && info.country.names.en)
                ? info.country.names.en
                : '';
            options.userinfo.country_ru = (info.country && info.country.names && info.country.names.ru)
                ? info.country.names.ru
                : '';
            //options.userinfo.ip = (req.ip)
            //    ? req.ip
            //    : '';
            //options.userinfo.city_en = (info.city && info.city.names && info.city.names.en)
            //    ? info.city.names.en
            //    : '';
            //options.userinfo.browser = (user.browser && user.browser.name)
            //    ? user.browser.name
            //    : '';
            //options.userinfo.type = (user.device && user.device.type)
            //    ? user.device.type
            //    : '';
            //options.userinfo.vendor = (user.device && user.device.vendor)
            //    ? user.device.vendor
            //    : '';
            //options.userinfo.os = (user.os && user.os.name)
            //    ? user.os.name
            //    : '';
            //options.userinfo.model = (user.device && user.device.model)
            //    ? user.device.model
            //    : '';
        }
    }

    var url = parseUrl();
    var urlHash = md5(JSON.stringify(options) + url.toLowerCase());

    var level1  = CP_regexp.str(req.params.level1) || null;
    var level2  = CP_regexp.str(req.query.q)       || CP_regexp.str(CP_translit.text(req.params.level2, true)) || null;
    var level3  = CP_regexp.str(req.params.level3) || null;
    var sorting = CP_regexp.str(req.query.sorting) || ((level1 === modules.content.data.url) ? '' : config.default.sorting);
    var tag     = CP_regexp.str(req.query.tag)     || null;

    var template = setTemplate();

    getRender(function (err, render) {

        renderData(err, render);

    });

    /**
     * Get render.
     *
     * @param {Callback} callback
     */

    function getRender(callback) {

        return (config.cache.time && 0)
            ? getCache(
            function (err, render) {
                return (err)
                    ? callback(err)
                    : callback(null, render)
            })
            : getSphinx(
            function (err, render) {
                return (err)
                    ? callback(err)
                    : callback(null, render)
            });

    }

    /**
     * Get cache.
     *
     * @param {Callback} callback
     */

    function getCache(callback) {

        CP_cache.get(urlHash, function (err, render) {

            if (err) return callback(err);

            return (render)
                ? callback(null, render)
                : getSphinx(
                function (err, render) {
                    return (err)
                        ? callback(err)
                        : callback(null, render)
                });

        });

    }

    /**
     * Get sphinx.
     *
     * @param {Callback} callback
     */

    function getSphinx(callback) {

        switch (template) {
            case 'mobile/movie':
                movie.data(
                    movie.id(level2),
                    'movie',
                    options,
                    function (err, render) {
                        if (err) {
                            callback(err);
                        }
                        else if (url === render.page.url) {
                            callback(null, render);
                        }
                        else {
                            return res.redirect(301, render.page.url);
                        }
                    });
                break;
            case 'mobile/online':
                movie.data(
                    movie.id(level2),
                    'online',
                    options,
                    function (err, render) {
                        if (err) {
                            callback(err);
                        }
                        else if (url === render.page.url) {
                            callback(null, render);
                        }
                        else {
                            return res.redirect(301, render.page.url);
                        }
                    });
                break;
            case 'mobile/download':
                movie.data(
                    movie.id(level2),
                    'download',
                    options,
                    function (err, render) {
                        if (err) {
                            callback(err);
                        }
                        else if (url === render.page.url) {
                            callback(null, render);
                        }
                        else {
                            return res.redirect(301, render.page.url);
                        }
                    });
                break;
            case 'mobile/trailer':
                movie.data(
                    movie.id(level2),
                    'trailer',
                    options,
                    function (err, render) {
                        if (err) {
                            callback(err);
                        }
                        else if (url === render.page.url) {
                            callback(null, render);
                        }
                        else {
                            return res.redirect(301, render.page.url);
                        }
                    });
                break;
            case 'mobile/picture':
                movie.data(
                    movie.id(level2),
                    'picture',
                    options,
                    function (err, render) {
                        if (err) {
                            callback(err);
                        }
                        else if (url === render.page.url) {
                            callback(null, render);
                        }
                        else {
                            return res.redirect(301, render.page.url);
                        }
                    });
                break;
            case 'mobile/episode':
                movie.data(
                    movie.id(level2),
                    level3,
                    options,
                    function (err, render) {
                        if (err) {
                            callback(err);
                        }
                        else if (url === render.page.url) {
                            callback(null, render);
                        }
                        else {
                            return res.redirect(301, render.page.url);
                        }
                    });
                break;
            case 'mobile/category':
                category.one(
                    level1,
                    level2,
                    parseInt(level3),
                    sorting,
                    options,
                    function (err, render) {
                        callback(err, render);
                    });
                break;
            case 'mobile/categories':
                category.all(
                    level1,
                    options,
                    function (err, render) {
                        callback(err, render);
                    });
                break;
            case 'mobile/content':
                template = 'mobile/category';
                content.one(
                    req.params.level2,
                    parseInt(level3),
                    sorting,
                    options,
                    function (err, render) {
                        callback(err, render);
                    });
                break;
            case 'mobile/contents':
                template = 'mobile/categories';
                content.all(
                    tag,
                    options,
                    function (err, render) {
                        callback(err, render);
                    });
                break;
            case 'mobile/index':
                index.data(
                    options,
                    function (err, render) {
                        callback(err, render);
                    });
                break;
            default:
                callback('Данной страницы нет на сайте. Возможно Вы ошиблись в URL или это внутренняя ошибка сайта, о которой администратор уже знает и предпринимает действия для её устранения.');
        }

    }

    /**
     * Parse URL.
     *
     * @return {String}
     */

    function parseUrl() {

        var parts = req.originalUrl.split('?');

        var url = config.protocol + options.domain + parts[0].replace('/mobile-version', '');

        if (parts[1]) {
            if (req.query.sorting && config.sorting[req.query.sorting]) {
                url += ((url.indexOf('?')+1) ? '&' : '?') + 'sorting=' + req.query.sorting;
            }
            if (req.query.q) {
                url += ((url.indexOf('?')+1) ? '&' : '?') + 'q=' + CP_regexp.str(req.query.q);
            }
            if (req.query.tag) {
                url += ((url.indexOf('?')+1) ? '&' : '?') + 'tag=' + CP_regexp.str(req.query.tag);
            }
            if (req.query.json) {
                url += ((url.indexOf('?')+1) ? '&' : '?') + 'json=1';
            }
        }

        return CP_decode.text(url);

    }

    /**
     * Set template.
     *
     * @return {String}
     */

    function setTemplate() {

        switch (level1) {
            case config.urls.noindex:
                if (!config.urls.noindex)
                    return 'error';
                return (movie.id(level2))
                    ? 'mobile/' + movie.type(level3)
                    : 'error';
                break;
            case config.urls.movie:
                return (movie.id(level2))
                    ? 'mobile/' + movie.type(level3)
                    : 'error';
                break;
            case config.urls.year:
                return (level2)
                    ? 'mobile/category'
                    : 'mobile/categories';
                break;
            case config.urls.genre:
                return (level2)
                    ? 'mobile/category'
                    : 'mobile/categories';
                break;
            case config.urls.country:
                return (level2)
                    ? 'mobile/category'
                    : 'mobile/categories';
                break;
            case config.urls.actor:
                return (level2)
                    ? 'mobile/category'
                    : 'mobile/categories';
                break;
            case config.urls.director:
                return (level2)
                    ? 'mobile/category'
                    : 'mobile/categories';
                break;
            case config.urls.type:
                return (level2)
                    ? 'mobile/category'
                    : 'error';
                break;
            case config.urls.search:
                return (level2)
                    ? 'mobile/category'
                    : 'error';
                break;
            case modules.content.data.url:
                if (!modules.content.status)
                    return 'error';
                return (level2)
                    ? 'mobile/content'
                    : 'mobile/contents';
                break;
            case null:
                return 'mobile/index';
                break;
            default:
                return 'error';
        }

    }

    /**
     * Render data.
     *
     * @param {Object} err
     * @param {Object} render
     */

    function renderData(err, render) {

        if (err) {
            console.log('[routes/mobile.js]', url);

            return next({
                "status": 404,
                "message": err
            });
        }

        if (typeof render === 'object') {

            if (config.theme === 'default' || (req.query.q && req.query.json)) {

                res.json(render);

                if (options.debug) {
                    options.debug.duration = (new Date() - options.debug.duration.all) + 'ms';
                    console.log(options.debug);
                }

            }
            else {

                res.render(template, render, function(err, html) {

                    if (options.debug) {
                        options.debug.detail.push({"type": "render", "duration": (new Date() - options.debug.duration.current) + 'ms'});
                        options.debug.duration.current = new Date();
                    }

                    if (err) console.log('[renderData] Render Error:', err);

                    var h = '';

                    if ((config.cache.time || config.cache.p2p) && config.cache.minify) {
                        try {
                            h = minify(html, {
                                removeComments: true,
                                removeCommentsFromCDATA: true,
                                collapseWhitespace: true,
                                collapseBooleanAttributes: true,
                                removeRedundantAttributes: true,
                                useShortDoctype: true,
                                removeAttributeQuotes: true,
                                removeEmptyAttributes: true,
                                minifyCSS: true,
                                minifyJS: true
                            });
                        } catch (err) {
                            h = html;
                            console.log('[minifyData] Minify Error:', err);
                        }
                        html = h;

                        if (options.debug) {
                            options.debug.detail.push({"type": "minify", "duration": (new Date() - options.debug.duration.current) + 'ms'});
                            options.debug.duration.current = new Date();
                        }
                    }

                    res.send(html);

                    if (config.cache.time && html && 0) {
                        CP_cache.set(
                            urlHash,
                            html,
                            config.cache.time,
                            function (err) {
                                if (err) {
                                    if ((err+'').indexOf('1048576') + 1) {
                                        console.log('[routes/mobile.js:renderData] Cache Length Error:', url);
                                    }
                                    else {
                                        console.log('[routes/mobile.js:renderData] Cache Set Error:', err);
                                    }
                                }
                            }
                        );
                    }
                    if (config.cache.p2p && html && 0) {
                        var $ = cheerio.load(html);
                        CP_cachep2p.set(
                            url,
                            crypto.createHash('sha1').update($('html').html()).digest('hex')
                        );
                    }

                    if (options.debug) {
                        options.debug.duration = (new Date() - options.debug.duration.all) + 'ms';
                        console.log(options.debug);
                    }

                });

            }
        }
        else {

            if (options.debug) {
                options.debug.detail.push({"type": "cache", "duration": (new Date() - options.debug.duration.current) + 'ms'});
                options.debug.duration.current = new Date();
            }

            res.send(render);

            if (options.debug) {
                options.debug.duration = (new Date() - options.debug.duration.all) + 'ms';
                console.log(options.debug);
            }

        }

    }

});

module.exports = router;