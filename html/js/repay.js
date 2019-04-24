﻿function RepayPage() {
    this.noOverduePaymentErrorCode = -1;
    this.unknownErrorCode = -99;
};

RepayPage.prototype.init = function() {

    if (!u_attr || !u_attr.b || !u_attr.b.m || (u_attr.b.s !== -1 && u_attr.b.s !== 2)) {
        loadSubPage('start');
        return;
    }
    var mySelf = this;
    loadingDialog.show();

    parsepage(pages['repay']);

    var $repaySection = $('.main-mid-pad.bus-repay');
    var $leftSection = $('.main-left-block', $repaySection);
    var $paymentBlock = $('.bus-reg-radio-block', $leftSection);

    var $repayBtn = $leftSection.find('.repay-btn').addClass('disabled');

    $leftSection.find('.bus-reg-agreement.mega-terms .bus-reg-txt').safeHTML(l['208s']);

    // event handler for repay button
    $repayBtn.off('click').on('click',
        function repayButtonHandler() {
            if ($(this).hasClass('disabled')) {
                return false;
            }
            alert('Hi Kiro');
        });

    // event handler for radio buttons
    $('.bus-reg-radio', $paymentBlock)
        .off('click.suba').on('click.suba', function businessRepayCheckboxClick() {
            var $me = $(this);
            if ($me.hasClass('checkOn')) {
                return;
            }
            else {
                $('.bus-reg-radio', $paymentBlock).removeClass('checkOn').addClass('checkOff');
                $me.removeClass('checkOff').addClass('checkOn');
            }
        });


    // event handler for clicking on terms anchor
    $leftSection.find('.bus-reg-agreement.mega-terms .bus-reg-txt span').off('click')
        .on('click', function termsClickHandler() {
            if (!is_mobile) {
                bottomPageDialog(false, 'terms', false, true);
            }
            else {
                var wentOut = false;
                if (window.open) {
                    var cutPlace = location.href.indexOf('/registerb');
                    var myHost = location.href.substr(0, cutPlace);
                    myHost += '/terms';
                    wentOut = window.open(myHost, 'MEGA LIMITED TERMS OF SERVICE');
                }
                if (!wentOut) {
                    loadSubPage('terms');
                }
            }
            return false;
        });

    // event handler for check box
    $('.bus-reg-agreement', $leftSection).off('click.suba').on('click.suba',
        function businessRepayCheckboxClick() {
            var $me = $(this).find('.bus-reg-checkbox');
            if ($me.hasClass('checkOn')) {
                $me.removeClass('checkOn').addClass('checkOff');
                $repayBtn.addClass('disabled');
            }
            else {
                $me.removeClass('checkOff').addClass('checkOn');
                if ($('.bus-reg-agreement .bus-reg-checkbox.checkOn', $leftSection).length === 2) {
                    $repayBtn.removeClass('disabled');
                }
                else {
                    $repayBtn.addClass('disabled');
                }
            }
        });

    M.require('businessAcc_js').done(function() {
        var business = new BusinessAccount();
        var overduePromise = business.getOverduePayments();

        var failHandler = function(st, res) {
            var msg = l[20671];
            var title = l[6859];
            if (res !== mySelf.noOverduePaymentErrorCode) {
                msg = l[20672];
                title = l[1578];
            }
            msgDialog('warninga', l[6859], l[20671], '', function() {
                loadingDialog.hide();
                loadSubPage('');
            });
        };

        overduePromise.fail(failHandler)

        overduePromise.done(function(st, res) {
            // validations of API response
            if (st !== 1 || !res || !res.t || !res.inv || !res.inv.length) {
                return failHandler(0, mySelf.unknownErrorCode);
            }

            loadingDialog.hide();

            var nbOfUsers = new BusinessRegister().minUsers;

            var $rightBlock = ('.main-right-block', $repaySection);

            var $overduePaymentRow = $('.repay-breakdown-tb-content', $rightBlock);
            var $overduePaymentHeader = $('.repay-breakdown-tb-header', $rightBlock);

            var rowTemplate = $overduePaymentRow.clone();

            // adding due invoice row
            $overduePaymentRow.find('.content-desc').text(res.inv[0].d);
            $overduePaymentRow.find('.content-date').text(time2date(res.inv[0].ts, 1));
            $overduePaymentRow.find('.content-amou').text(res.inv[0].tot);
            nbOfUsers = res.inv[0].nb;

            if (res.nb && res.et) {
                var futurePaymentRow = rowTemplate.clone();
                nbOfUsers = res.nb;

                futurePaymentRow.find('.content-desc').text(res.nb + ' ' + l[5569]);
                futurePaymentRow.find('.content-date').text(time2date(new Date().getTime() / 1000, 1));
                futurePaymentRow.find('.content-amou').text(res.et);

                futurePaymentRow.insertAfter($overduePaymentHeader);
            }

            $rightBlock.find('.repay-td-total').text(res.t);

            if (u_attr['%name']) {
                $leftSection.find('#repay-business-cname').text(u_attr['%name']);
            }
            else {
                mega.attr.get(u_attr.b.bu, '%name', -1, undefined,
                    function(res, ctx) {
                        if (typeof res !== 'number' && ctx.ua === "%name") {
                            u_attr['%name'] = from8(base64urldecode(res));
                            $leftSection.find('#repay-business-cname').text(u_attr['%name']);
                        }
                    });
            }

            if (u_attr['%email']) {
                $leftSection.find('#repay-business-email').text(u_attr['%email']);
            }
            else {
                mega.attr.get(u_attr.b.bu, '%email', -1, undefined,
                    function(res, ctx) {
                        if (typeof res !== 'number' && ctx.ua === "%email") {
                            u_attr['%email'] = from8(base64urldecode(res));
                            $leftSection.find('#repay-business-email').text(u_attr['%email']);
                        }
                    });
            }

            $leftSection.find('#repay-business-nb-users').text(nbOfUsers + ' ' + l[5569]);
        });

    });
};