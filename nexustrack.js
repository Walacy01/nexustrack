/**
 * NexusTrack - Script Universal de Tracking, Cookies Meta CAPI & Decorador de Links
 * Versão: 2.1.0 Production Ready
 * 
 * Funcionalidades:
 * 1. Captura e persistência de UTMs (localStorage e Cookies de 30 dias)
 * 2. Geração e manutenção de cookies compatíveis com Meta CAPI (_fbp e _fbc)
 * 3. Decorador automático de links de checkout (Kiwify, Hotmart, Greenn, Cakto, Wiapy, Eduzz, etc.)
 * 4. Disparo automático de evento PageView para o servidor NexusTrack
 */

(function (window, document) {
    'use strict';

    var STORAGE_KEY = 'nexustrack_params';
    var COOKIE_EXPIRY_DAYS = 30;

    // Utilitários de Cookies
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        var domain = "";
        try {
            var host = window.location.hostname;
            var parts = host.split('.');
            if (parts.length > 1) {
                domain = "; domain=." + parts.slice(-2).join('.');
            }
        } catch (e) {}
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/" + domain + "; SameSite=Lax";
    }

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    // Utilitário de URL Query Params
    function getUrlParams() {
        var search = window.location.search.substring(1);
        if (!search) return {};
        var pairs = search.split('&');
        var params = {};
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            if (pair[0]) {
                params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
            }
        }
        return params;
    }

    // Gerador de Cookie Meta _fbp (fb.1.{timestamp}.{random})
    function ensureFbp() {
        var existingFbp = getCookie('_fbp');
        if (!existingFbp) {
            var now = Date.now();
            var rand = Math.floor(Math.random() * 8999999999) + 1000000000;
            existingFbp = "fb.1." + now + "." + rand;
            setCookie('_fbp', existingFbp, COOKIE_EXPIRY_DAYS);
        }
        return existingFbp;
    }

    // Gerador de Cookie Meta _fbc (fb.1.{timestamp}.{fbclid})
    function ensureFbc(fbclid) {
        var existingFbc = getCookie('_fbc');
        if (fbclid) {
            var now = Date.now();
            var newFbc = "fb.1." + now + "." + fbclid;
            setCookie('_fbc', newFbc, COOKIE_EXPIRY_DAYS);
            return newFbc;
        }
        return existingFbc || '';
    }

    // Recupera dados salvos no localStorage
    function getStoredParams() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    // Salva parâmetros atualizados no localStorage
    function storeParams(params) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
        } catch (e) {}
    }

    // Inicialização do NexusTrack
    var currentUrlParams = getUrlParams();
    var storedParams = getStoredParams();

    // Captura parâmetros de campanhas
    var trackedKeys = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'src', 'sck', 'fbclid', 'gclid', 'ttclid'
    ];

    var finalParams = Object.assign({}, storedParams);

    trackedKeys.forEach(function (key) {
        if (currentUrlParams[key]) {
            finalParams[key] = currentUrlParams[key];
            setCookie(key, currentUrlParams[key], COOKIE_EXPIRY_DAYS);
        } else if (!finalParams[key]) {
            var cookieVal = getCookie(key);
            if (cookieVal) finalParams[key] = cookieVal;
        }
    });

    // Garante Cookies Meta CAPI
    var fbp = ensureFbp();
    var fbc = ensureFbc(finalParams.fbclid || currentUrlParams.fbclid);

    finalParams.fbp = fbp;
    if (fbc) finalParams.fbc = fbc;

    // Se src não estiver preenchido mas utm_source estiver, usa como fallback
    if (!finalParams.src && finalParams.utm_source) {
        finalParams.src = finalParams.utm_source;
    }
    if (!finalParams.sck && finalParams.utm_campaign) {
        finalParams.sck = finalParams.utm_campaign;
    }

    // Persiste no localStorage
    storeParams(finalParams);

    // Domínios conhecidos de plataformas de checkout
    var checkoutDomains = [
        'kiwify.com.br',
        'hotmart.com',
        'greenn.com.br',
        'cakto.com.br',
        'wiapy.com',
        'eduzz.com',
        'perfectpay.com.br',
        'monetizze.com.br',
        'kirvano.com',
        'ticto.com.br',
        'braip.com'
    ];

    // Decorador de links
    function decorateUrl(urlStr) {
        try {
            var url = new URL(urlStr, window.location.href);
            var isCheckout = checkoutDomains.some(function (domain) {
                return url.hostname.indexOf(domain) !== -1;
            });

            if (!isCheckout) return urlStr;

            // Injeta todos os parâmetros capturados
            Object.keys(finalParams).forEach(function (k) {
                if (finalParams[k] && !url.searchParams.has(k)) {
                    url.searchParams.set(k, finalParams[k]);
                }
            });

            return url.toString();
        } catch (e) {
            return urlStr;
        }
    }

    function decorateAllLinks() {
        var links = document.querySelectorAll('a[href]');
        links.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href && href.indexOf('javascript:') !== 0 && href.indexOf('#') !== 0) {
                var decorated = decorateUrl(href);
                if (decorated !== href) {
                    link.setAttribute('href', decorated);
                }
            }
        });
    }

    // Disparo de Evento PageView
    function sendPageView() {
        try {
            // Descobre o endpoint do servidor NexusTrack a partir da tag do script ou config
            var scriptTag = document.currentScript || document.querySelector('script[src*="nexustrack.js"]');
            var endpointHost = "";
            if (window.NEXUSTRACK_ENDPOINT) {
                endpointHost = window.NEXUSTRACK_ENDPOINT;
            } else if (scriptTag && scriptTag.src) {
                var u = new URL(scriptTag.src);
                endpointHost = u.origin;
            } else {
                endpointHost = window.location.origin;
            }

            var payload = {
                event_name: 'PageView',
                url: window.location.href,
                referrer: document.referrer || '',
                utm_source: finalParams.utm_source || '',
                utm_medium: finalParams.utm_medium || '',
                utm_campaign: finalParams.utm_campaign || '',
                utm_content: finalParams.utm_content || '',
                utm_term: finalParams.utm_term || '',
                src: finalParams.src || '',
                sck: finalParams.sck || '',
                fbc: finalParams.fbc || '',
                fbp: finalParams.fbp || ''
            };

            var trackUrl = endpointHost + '/api/track';

            if (navigator.sendBeacon) {
                navigator.sendBeacon(trackUrl, JSON.stringify(payload));
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', trackUrl, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(payload));
            }
        } catch (e) {
            console.error('[NexusTrack] Erro ao registrar PageView:', e);
        }
    }

    // Executa ao carregar o DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            decorateAllLinks();
            sendPageView();
        });
    } else {
        decorateAllLinks();
        sendPageView();
    }

    // Observer para links inseridos dinamicamente (Single Page Apps, VSLs, Elementor)
    try {
        var observer = new MutationObserver(function () {
            decorateAllLinks();
        });
        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    } catch (e) {}

    // Exposição da API pública NexusTrack no objeto window
    window.NexusTrack = {
        version: '2.1.0',
        getParams: function () {
            return Object.assign({}, finalParams);
        },
        decorateUrl: decorateUrl,
        decorateAllLinks: decorateAllLinks,
        track: function (eventName, customData) {
            try {
                var scriptTag = document.currentScript || document.querySelector('script[src*="nexustrack.js"]');
                var endpointHost = window.NEXUSTRACK_ENDPOINT || (scriptTag ? new URL(scriptTag.src).origin : window.location.origin);
                var payload = Object.assign({}, finalParams, {
                    event_name: eventName,
                    url: window.location.href,
                    referrer: document.referrer || '',
                    custom_data: customData || {}
                });
                var xhr = new XMLHttpRequest();
                xhr.open('POST', endpointHost + '/api/track', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(payload));
            } catch (err) {
                console.error('[NexusTrack] Track Error:', err);
            }
        }
    };

})(window, document);
