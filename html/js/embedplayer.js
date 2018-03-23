var M;
var pfid;
var dlid;
var dlkey;
var u_type;
var u_checked;
var sc_packet;
var sc_node;
var tree_ok0;
var tree_node;
var tree_residue;
var folderlink;
var fminitialized;
var loadingDialog;
var dlmanager;

function startMega() {
    'use strict';
    mBroadcaster.sendMessage('startMega');
    init_page();
}

function init_page() {
    'use strict';
    if (!is_embed) {
        throw new Error('Unexpected access...');
    }

    var tmp = String(page).split('!').map(function(s) {
        return s.replace(/[^\w-]+/g, "");
    });

    var ph = tmp[1];
    var key = tmp[2];
    var time = tmp[3];

    var init = function(res) {
        init_embed(ph, key, time, res);
    };

    if (dl_res || !key) {
        init(dl_res);
    }
    else {
        api_req({a: 'g', p: ph}, {callback: init});
    }
}

function init_embed(ph, key, time, g) {
    'use strict';
    var node;

    if (typeof g === 'object' && typeof g.at === 'string') {
        var akey = base64_to_a32(String(key).trim()).slice(0, 8);
        if (akey.length === 8) {
            var a = dec_attr(base64_to_ab(g.at), akey);
            node = a && new MegaNode({h: ph, ph: ph, s: g.s, k: akey, fa: g.fa, name: a.n, link: ph + '!' + key});
        }
    }

    if (d) {
        console.debug(node);
    }
    add_layout();

    if (node) {
        var link = '#!' + ph + '!' + key;

        $('.play-video-button, .viewonmega-item, .filename').rebind('click', function() {
            open(getAppBaseUrl() + '/' + link);
            return false;
        });

        $('.login-item').rebind('click', function() {
            open(getBaseUrl() + '/login');
        });

        $('.logo-container, .login-item.with-avatar, .useravatar').rebind('click', function() {
            open(getBaseUrl());
        });

        $('.embedcode-item, .getlink-item, .share-generic').rebind('click', function() {
            var playing = false;
            var timeoffset = 0;
            var $block = $('.sharefile-block');
            var $wrapper = $('.video-wrapper');
            var url = getBaseUrl() + '/embed' + link;
            var embed = '<iframe src="%" width="640" height="360" frameborder="0" allowfullscreen></iframe>';

            $('.close-overlay, .sharefile-buttons .cancel', $block).rebind('click', function() {
                playing = false;
                $block.addClass('hidden');
                $wrapper.removeClass('share-option');
            });

            $('.sharefile-buttons .copy', $block).rebind('click', function() {
                var content = String($('.tab-content', $block).text());
                if (playing && document.getElementById('timecheckbox').checked) {
                    content = content.replace(/![\w-]{8}![^"]+/, '$&!' + timeoffset + 's');
                }
                copyToClipboard(content, 1);
            });

            (function _() {
                $('.tab-link', $block).removeClass('active').rebind('click', _);

                if ($(this).is('.getlink-item, .share-link')) {
                    $('.tab-link.share-link', $block).addClass('active');
                    $('.tab-content', $block).text(url);
                }
                else {
                    $('.tab-link.share-embed-code', $block).addClass('active');
                    $('.tab-content', $block).text(embed.replace('%', url));
                }
            }).call(this);

            if (node.stream) {
                playing = true;
                var elm = document.getElementById('timeoffset');
                node.stream.on('timeupdate', function() {
                    timeoffset = this.video.currentTime | 0;
                    elm.value = secondsToTimeShort(timeoffset);
                    return playing;
                });
            }

            $block.removeClass('hidden');
            $wrapper.addClass('main-blur-block share-option');
        });

        watchdog.registerOverrider('login', function() {
            watchdog.registerOverrider('setsid', function(ev, strg) {
                var sid = strg.data;
                api_setsid(sid);

                u_storage = init_storage(localStorage);
                u_storage.sid = sid;

                u_checklogin({
                    checkloginresult: function(ctx, r) {
                        u_type = r;
                        topmenuUI();
                    }
                });
                watchdog.unregisterOverrider('setsid');
            });
        });
        watchdog.registerOverrider('logout', function() {
            u_logout(-0xDEADF);
            topmenuUI();
        });

        iniVideoStreamLayout(node, $('body'))
            .then(function(stream) {
                if (stream instanceof Streamer) {
                    stream.on('activity', function() {
                        if (dlmanager.isOverQuota) {
                            dlmanager.isOverQuota = false;
                            dlmanager.isOverFreeQuota = false;
                            $('.transfer-limitation-block .close-overlay').trigger('click');
                            clearInterval($.quotaTimer);
                        }
                        return true;
                    });
                }
            });
    }
    else {
        console.info(404, arguments);
        $('.video-wrapper').addClass('hidden');
        $('.file-removed-block').removeClass('hidden');
    }
}

function add_layout() {
    'use strict';
    $('body').safeHTML(translate(pages.index).replace(/{staticpath}/g, staticpath));

    var elm = document.querySelector('video');
    var style = elm.style;
    var fill = function() {
        style.maxWidth = style.minWidth = window.innerWidth + 'px';
        style.maxHeight = style.minHeight = window.innerHeight + 'px';
    };
    fill();
    elm.controls = false;
    window.addEventListener('resize', fill);

    topmenuUI();
}

function topmenuUI() {
    'use strict';
    var $useravatar = $('.viewer-button.useravatar');
    var $avatarwrapper = $('.avatar-wrapper');
    var _colors = [
        "#69F0AE", "#13E03C", "#31B500", "#00897B", "#00ACC1",
        "#61D2FF", "#2BA6DE", "#FFD300", "#FFA500", "#FF6F00",
        "#E65100", "#FF5252", "#FF1A53", "#C51162", "#880E4F"
    ];

    if (u_type === 3) {
        var name = $.trim(u_attr.name || (u_attr.firstname + ' ' + u_attr.lastname));
        var fl = String(name && name[0] || '').toUpperCase();
        var color = UH64(u_handle).mod(_colors.length);

        $useravatar.removeClass('hidden');
        $avatarwrapper.css('background-color', _colors[color]).find('span').text(fl);
        $('.contextmenu.useravatar').removeClass('hidden')
            .find('span').text(fl).end()
            .parent().find('i').addClass('hidden').end()
            .find('.login-text').text(name);

        api_req({"a": "uga", "u": u_handle, "ua": "+a"}, {
            callback: tryCatch(function(res) {
                var src = res.length && mObjectURL([base64_to_ab(res)], 'image/jpeg');
                if (src) {
                    $avatarwrapper.safeHTML('<img src="@@"/>', src);
                }
            })
        });
    }
    else {
        $('.useravatar').addClass('hidden');
        $('.dropdown-item.login-item').find('i').removeClass('hidden').end().find('.login-text').text(l[16345]);
    }

    var $wrapper = $('.video-wrapper');
    $('body').rebind('click.bodyw', function() {
        if (!$wrapper.hasClass('share-option')) {
            $wrapper.removeClass('main-blur-block');
        }
        $('.files-menu.context').addClass('hidden').removeClass('mobile-mode');
    });

    $('.moreoptions').rebind('click', function() {
        var $cm = $('.files-menu.context').removeClass('hidden');

        if (is_mobile) {
            $cm.addClass('mobile-mode');
            $wrapper.addClass('main-blur-block');
        }
        else {
            var top = $('.viewer-top-bl').height();
            var left = $cm.outerWidth();

            $cm.css({'top': top, 'left': innerWidth - left - 4});
        }
        return false;
    });
}

// Setup desktop variant stubs
mBroadcaster.once('startMega', function() {
    'use strict';

    var dummy = function() {
        return false;
    };
    loadingDialog = {show: dummy, hide: dummy};

    M = Object.create(null);
    M.xhr = megaUtilsXHR;
    M.gfsfetch = megaUtilsGFSFetch;
    M.getStack = function() {
        return String(new Error().stack);
    };
    M.hasPendingTransfers = dummy;

    dlmanager = Object.create(null);
    dlmanager._quotaTasks = [];
    dlmanager.logger = new MegaLogger();
    dlmanager.getQBQData = dummy;
    dlmanager.setUserFlags = dummy;
    dlmanager._overquotaInfo = dummy;
    dlmanager.getCurrentDownloads = dummy;
    dlmanager.onNolongerOverquota = dummy;
    dlmanager.getCurrentDownloadsSize = dummy;
    dlmanager.showOverQuotaDialog = function(task) {
        var $wrapper = $('.video-wrapper').addClass('main-blur-block');
        var $block = $('.transfer-limitation-block').removeClass('hidden');

        if (typeof task === 'function') {
            this._quotaTasks.push(tryCatch(task));
        }
        this.isOverQuota = true;

        if (u_type) {
            if (u_attr.p) {
                $('.upgrade-option .button', $block).text(l[16386]);
            }
            else {
                $('.upgrade-option .button', $block).text(l[129]);
            }
            $('.transfer-body', $block).text(l[17084]);
            $('.upgrade-option', $block).removeClass('hidden');
            $('.signin-register-option', $block).addClass('hidden');
        }
        else {
            this.isOverFreeQuota = true;
            $('.transfer-body', $block).text(l[7098]);
            $('.upgrade-option', $block).addClass('hidden');
            $('.signin-register-option', $block).removeClass('hidden');
        }

        $('.close-overlay', $block).rebind('click', function() {
            $block.addClass('hidden');
            $wrapper.removeClass('main-blur-block');
        });

        var toPage = function(page) {
            open(getBaseUrl() + '/' + page);
            return false;
        };

        $('.button.login', $block).rebind('click', toPage.bind(this, 'login'));
        $('.button.signup', $block).rebind('click', toPage.bind(this, 'register'));
        $('.upgrade-option .button', $block).rebind('click', toPage.bind(this, 'pro'));

        // FIXME: ...
        $.quotaTimer = setInterval(this._onQuotaRetry.bind(this), 4e4);
    };
    dlmanager._onQuotaRetry = function() {
        for (var i = 0; i < this._quotaTasks.length; i++) {
            this._quotaTasks[i]();
        }
        this._quotaTasks = [];
    };
});

(function(global) {
    'use strict';

    function MegaLogger(n, o) {
        this.options = Object(o);
    }

    function expand(p, m) {
        return function(a, b) {
            p[m](a, b || console.debug.bind(console, m));
            return p;
        };
    }

    function extend(p) {
        p.fail = expand(p, 'catch');
        p.tryCatch = p.done = expand(p, 'then');
        p.always = function(f) {
            p.then(f, f);
            return p;
        };
        return p;
    }

    function MegaPromise(f) {
        var reject;
        var resolve;
        if (typeof Promise === 'undefined') {
            return this;
        }
        var promise = new Promise(function(res, rej) {
            reject = rej;
            resolve = res;
        });
        promise.reject = reject;
        promise.resolve = resolve;
        promise.__proto__ = this.__proto__;
        if (f) {
            try {
                f(resolve, reject);
            }
            catch (ex) {
                reject(ex);
            }
        }
        return extend(promise);
    }

    inherits(MegaLogger, console);
    inherits(MegaPromise, window.Promise || {});

    MegaLogger.getLogger = function(n, o) {
        return new MegaLogger(n, o);
    };

    global.MegaLogger = MegaLogger;
    global.MegaPromise = MegaPromise;

})(self);

function getBaseUrl() {
    return 'https://' + (((location.protocol === 'https:') && location.host) || 'mega.nz');
}
function getAppBaseUrl() {
    var l = location;
    var base = (l.origin !== 'null' && l.origin || (l.protocol + '//' + l.hostname));
    if (is_extension) {
        base += l.pathname;
    }
    return base;
}

function showToast() {
    var $toast = $('.toast-notification');
    $toast.addClass('visible second');
    setTimeout(function() {
        $toast.removeClass('visible second');
    }, 2000);
}
