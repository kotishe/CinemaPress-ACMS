'use strict';

/**
 * Configuration dependencies.
 */

var config  = require('../config/production/config');
var modules = require('../config/production/modules');

/**
 * Node dependencies.
 */

var async   = require('async');
var request = require('request');
var express = require('express');
var router  = express.Router();

/**
 * Player.
 */

router.get('/?', function(req, res) {

    var id            = (parseInt(req.query.id))         ? parseInt(req.query.id)            : 0;
    var season        = (parseInt(req.query.season))     ? parseInt(req.query.season)        : 0;
    var episode       = (parseInt(req.query.episode))    ? parseInt(req.query.episode)       : 0;
    var translate     = (parseInt(req.query.translate))  ? parseInt(req.query.translate)     : null;
    var start_time    = (parseInt(req.query.start_time)) ? parseInt(req.query.start_time)    : 0;
    var start_episode = (req.query.start_episode)        ? req.query.start_episode           : '';

    var script = 'function player(){var e,t,r,n=document.querySelector("#yohoho");if(!n)return!1;for(var a=document.createElement("div"),o=Array.prototype.slice.call(n.attributes);r=o.pop();)a.setAttribute(r.nodeName,r.nodeValue);a.innerHTML=n.innerHTML,n.parentNode.replaceChild(a,n);var i=document.createElement("iframe");i.setAttribute("id","player-iframe"),i.setAttribute("frameborder","0"),i.setAttribute("allowfullscreen","allowfullscreen"),i.setAttribute("src","iframe-src"),a.appendChild(i);var s="width:"+(e=parseInt(a.offsetWidth)?parseInt(a.offsetWidth):parseInt(a.parentNode.offsetWidth)?a.parentNode.offsetWidth:610)+"px;height:"+(t=parseInt(a.offsetHeight)&&parseInt(a.offsetHeight)<370?parseInt(a.parentNode.offsetHeight)&&370<=parseInt(a.parentNode.offsetHeight)?parseInt(a.parentNode.offsetHeight):370:parseInt(a.offsetHeight)&&e/3<parseInt(a.offsetHeight)?parseInt(a.offsetHeight):parseInt(a.parentNode.offsetHeight)&&e/3<parseInt(a.parentNode.offsetHeight)?parseInt(a.parentNode.offsetHeight):e/2)+"px;border:0;margin:0;padding:0;overflow:hidden;position:relative";i.setAttribute("style",s),i.setAttribute("width",e),i.setAttribute("height",t),a.setAttribute("style",s)}document.addEventListener("DOMContentLoaded",player),document.addEventListener("DOMContentLoaded",function(){document.querySelector("#player-translate");document.querySelector("#player-quality")});';

    if (req.query.player) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.send(script.replace('iframe-src', decodeURIComponent(req.query.player)));
    }

    if (!/googlebot|crawler|spider|robot|crawling|bot/i.test(req.get('User-Agent'))) {

        async.parallel({
                "moonwalk": function (callback) {
                    if (modules.player.data.moonwalk && modules.player.data.moonwalk.token) {
                        getMoonwalk(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "hdgo": function (callback) {
                    if (modules.player.data.hdgo && modules.player.data.hdgo.token) {
                        getHdgo(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "iframe": function (callback) {
                    if (modules.player.data.iframe && modules.player.data.iframe.token) {
                        getIframe(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "kodik": function (callback) {
                    if (modules.player.data.kodik && modules.player.data.kodik.token) {
                        getKodik(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "yohoho": function (callback) {
                    if (modules.player.data.yohoho.player) {
                        getYohoho(function (result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "hdbaza": function (callback) {
                    if (modules.player.data.hdbaza && modules.player.data.hdbaza.user_hash) {
                        getHdbaza(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
            },
            function(err, result) {

                if (err) {
                    return res.send(err);
                }

                if (modules.episode.status && season && result['moonwalk'].src) {
                    script = script
                        .replace('iframe-src', result['moonwalk'].src)
                        .replace('iframe-translate', result['moonwalk'].translate.toUpperCase())
                        .replace('iframe-quality', result['moonwalk'].quality.toUpperCase());
                }
                else if (result[modules.player.data.display].src) {
                    if (modules.player.data.display === 'yohoho') {
                        script = result['yohoho'].src;
                    }
                    else {
                        script = script
                            .replace('iframe-src', result[modules.player.data.display].src)
                            .replace('iframe-translate', result[modules.player.data.display].translate.toUpperCase())
                            .replace('iframe-quality', result[modules.player.data.display].quality.toUpperCase());
                    }
                }
                else if (result['moonwalk'].src) {
                    script = script
                        .replace('iframe-src', result['moonwalk'].src)
                        .replace('iframe-translate', result['moonwalk'].translate.toUpperCase())
                        .replace('iframe-quality', result['moonwalk'].quality.toUpperCase());
                }
                else if (result['hdgo'].src) {
                    script = script
                        .replace('iframe-src', result['hdgo'].src)
                        .replace('iframe-translate', result['hdgo'].translate.toUpperCase())
                        .replace('iframe-quality', result['hdgo'].quality.toUpperCase());
                }
                else if (result['iframe'].src) {
                    script = script
                        .replace('iframe-src', result['iframe'].src)
                        .replace('iframe-translate', result['iframe'].translate.toUpperCase())
                        .replace('iframe-quality', result['iframe'].quality.toUpperCase());
                }
                else if (result['kodik'].src) {
                    script = script
                        .replace('iframe-src', result['kodik'].src)
                        .replace('iframe-translate', result['kodik'].translate.toUpperCase())
                        .replace('iframe-quality', result['kodik'].quality.toUpperCase());
                }
                else if (result['yohoho'].src) {
                    script = result['yohoho'].src;
                }
                else {
                    script = '';
                }

                res.setHeader('Content-Type', 'application/javascript');
                res.send(script);

            });

    }
    else {

        res.setHeader('Content-Type', 'application/javascript');
        res.send('console.log(\'Hello CinemaPress!\');');

    }

    /**
     * Get Moonwalk player.
     */

    function getMoonwalk(callback) {

        api('http://moonwalk.cc/api/videos.json?' +
            'api_token=' + modules.player.data.moonwalk.token.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && !json.error && json.length) {
                    var iframe_url = '';
                    var added = 0;
                    for (var i = 0; i < json.length; i++) {
                        if (season && episode && translate === json[i].translator_id) {
                            iframe_url = getMoonlight(json[i].iframe_url) + '?season=' + season + '&episode=' + episode;
                            iframe_translate = json[i].translator ? json[i].translator : '';
                            iframe_quality = json[i].source_type ? json[i].source_type : '';
                            break;
                        }
                        else {
                            var d = json[i].added_at || json[i].last_episode_time || 0;
                            var publish = (new Date(d).getTime()/1000);
                            if (publish >= added) {
                                iframe_url = getMoonlight(json[i].iframe_url);
                                iframe_translate = json[i].translator ? json[i].translator : '';
                                iframe_quality = json[i].source_type ? json[i].source_type : '';
                                added = publish;
                            }
                        }
                    }
                    if (iframe_url && start_episode) {
                        var se = start_episode.match(/^([a-z0-9]*?)\|([0-9]*?)\|([0-9]*?)$/i);
                        if (se && se.length === 4) {
                            iframe_url = iframe_url.replace(/serial\/([a-z0-9]*?)\//i, 'serial/' + se[1] + '/');
                            if (iframe_url.indexOf('?')+1) {
                                iframe_url = iframe_url + '&season=' + se[2] + '&episode=' + se[3]
                            }
                            else {
                                iframe_url = iframe_url + '?season=' + se[2] + '&episode=' + se[3]
                            }
                        }
                    }
                    if (iframe_url && start_time) {
                        if (iframe_url.indexOf('?')+1) {
                            iframe_url = iframe_url + '&start_time=' + start_time
                        }
                        else {
                            iframe_url = iframe_url + '?start_time=' + start_time
                        }
                    }
                    if (iframe_url.indexOf('?')+1) {
                        iframe_url = iframe_url + '&show_translations=1'
                    }
                    else {
                        iframe_url = iframe_url + '?show_translations=1'
                    }
                    iframe_src = iframe_url;
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

        function getMoonlight(iframe_url) {
            var pat = /\/[a-z]{1,20}\/[a-z0-9]{1,40}\/iframe/i;
            var str = pat.exec(iframe_url);
            if (str && str[0]) {
                if (modules.player.data.moonlight.domain) {
                    var domain = modules.player.data.moonlight.domain;
                    domain = (domain[domain.length-1] === '/')
                        ? domain.slice(0, -1)
                        : domain;
                    domain = (domain.indexOf('://') === -1)
                        ? config.protocol + domain
                        : domain;
                    iframe_url = domain + str[0];
                }
                else {
                    iframe_url = 'https://streamguard.cc' + str[0];
                }
            }
            return iframe_url;
        }

    }

    /**
     * Get HDGO player.
     */

    function getHdgo(callback) {

        api('http://hdgo.cc/api/video.json?' +
            'token=' + modules.player.data.hdgo.token.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && !json.error && json.length && json[0].iframe_url) {
                    iframe_src = json[0].iframe_url.replace('.cc', '.cx').replace('http:', 'https:');
                    iframe_translate = json[0].translator ? json[0].translator : '';
                    iframe_quality = json[0].quality ? json[0].quality : '';
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

    }

    /**
     * Get Iframe player.
     */

    function getIframe(callback) {

        api('https://iframe.video/api/videos.json' +
            'api_token=' + modules.player.data.iframe.token.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && !json.error && json.length) {
                    var iframe_url = '';
                    var added = 0;
                    for (var i = 0; i < json.length; i++) {
                        var d = json[i].added_at || json[i].last_episode_time || 0;
                        var publish = (new Date(d).getTime()/1000);
                        if (publish >= added) {
                            iframe_url = json[i].iframe_url;
                            iframe_translate = json[i].translator ? json[i].translator : '';
                            iframe_quality = json[i].source_type ? json[i].source_type : '';
                            added = publish;
                        }
                    }
                    iframe_src = iframe_url;
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

    }

    /**
     * Get Kodik player.
     */

    function getKodik(callback) {

        api('https://kodikapi.com/search?' +
            'token=' + modules.player.data.kodik.token.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && json.results && json.results.length) {
                    iframe_src = (json.results[0].link && json.results[0].link.indexOf('/')+1)
                        ? json.results[0].link.replace('http:', 'https:')
                        : '';
                    iframe_translate = (json.results[0].translation && json.results[0].translation.title)
                        ? json.results[0].translation.title
                        : '';
                    iframe_quality = (json.results[0].quality)
                        ? json.results[0].quality
                        : '';
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

    }

    /**
     * Get Hdbaza player.
     */

    function getHdbaza(callback) {

        api('https://hdbaza.com/api/movies?' +
            'user_hash=' + modules.player.data.hdbaza.user_hash.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && json.data && json.data.length && json.data[0].iframe_url) {
                    iframe_src = json.data[0].iframe_url;
                    iframe_translate = (json.data[0].sounds && json.data[0].sounds[0] && json.data[0].sounds[0].name)
                        ? json.data[0].sounds[0].name
                        : '';
                    iframe_quality = json.data[0].quality ? json.data[0].quality : '';
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

    }

    /**
     * Get Yohoho player.
     */

    function getYohoho(callback) {

        api('https://yohoho.cc/yo.js',
            function (json, body) {
                callback({
                    "src": body,
                    "translate": "",
                    "quality": ""
                });
            });

    }

    /**
     * Request.
     */

    function api(url, callback) {
        request({url: url, timeout: 1500, agent: false, pool: {maxSockets: 100}}, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var json = tryParseJSON(body);
                callback(json, body);
            }
            else {
                console.log(url, (error && error.code) ? error.code : error);
                callback(null, '');
            }
        });
    }

    /**
     * Valid JSON.
     *
     * @param {String} jsonString
     */

    function tryParseJSON(jsonString) {
        try {
            var o = JSON.parse(jsonString);
            if (o && typeof o === "object") {
                return o;
            }
        }
        catch (e) { }
        return null;
    }

});

module.exports = router;