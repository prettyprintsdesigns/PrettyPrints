/* Pretty Prints · interfaz (ventanas, carrusel, filtros) y bolsa de compras */

(function () {
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Deslizador de imágenes ---------- */
    function initSlider(slider) {
        var track = $('.slides', slider);
        var total = $$('img', track).length;
        var dots = $$('.dot', slider);
        var prev = $('.prev', slider);
        var next = $('.next', slider);

        if (!total || !prev || !next) return;

        function current() { return Math.round(track.scrollLeft / track.clientWidth); }
        function goTo(i) {
            track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
        }

        prev.addEventListener('click', function () { goTo((current() - 1 + total) % total); });
        next.addEventListener('click', function () { goTo((current() + 1 + total) % total); });

        track.addEventListener('scroll', function () {
            var i = current();
            dots.forEach(function (d, n) { d.classList.toggle('active', n === i); });
        }, { passive: true });

        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
        });
    }

    /* ---------- Carga de productos desde Google Sheets en tiempo real ---------- */
    function loadProducts() {
        var grid = $('#product-grid');
        if (!grid) return;

        var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwQi1yOcvdssyFh9TFRWItHyOAd5j1z6LUDAKf1PBr3pZbHymWBtNdy3vEqKRshYg7_9A/exec?action=getProducts';

        fetch(WEB_APP_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('No se pudo cargar el catálogo desde Google Sheets');
                return res.json();
            })
            .then(function (products) {
                if (!Array.isArray(products) || products.length === 0) {
                    grid.innerHTML = '<p class="empty-msg">No hay productos disponibles en este momento.</p>';
                    return;
                }

                grid.innerHTML = products.map(function (p) {
                    var badgesHtml = (p.badges || []).map(function (b) {
                        var isCustom = b.toLowerCase().indexOf('personalizable') > -1;
                        return '<span class="badge ' + (isCustom ? 'badge--custom' : '') + '">' + esc(b) + '</span>';
                    }).join('');

                    var imagesHtml = (p.images || []).map(function (img, idx) {
                        return '<img src="' + esc(img) + '" alt="' + esc(p.name) + ', imagen ' + (idx + 1) + ' de ' + p.images.length + '" loading="lazy">';
                    }).join('');

                    var dotsHtml = (p.images || []).map(function (_, idx) {
                        return '<span class="dot ' + (idx === 0 ? 'active' : '') + '"></span>';
                    }).join('');

                    return '<article class="project-item" data-category="' + esc(p.category) + '" data-id="' + esc(p.id) + '" data-price="' + p.price + '">' +
                        '<div class="slider" role="group" aria-roledescription="carrusel" aria-label="Imágenes de ' + esc(p.name) + '">' +
                            '<div class="slides" tabindex="0">' + imagesHtml + '</div>' +
                            '<button class="slider-btn prev" type="button" aria-label="Imagen anterior"><svg class="icon" aria-hidden="true"><use href="#i-chevron-left"/></svg></button>' +
                            '<button class="slider-btn next" type="button" aria-label="Imagen siguiente"><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>' +
                            '<div class="dots" aria-hidden="true">' + dotsHtml + '</div>' +
                        '</div>' +
                        '<div class="product-info">' +
                            '<div class="badges">' + badgesHtml + '</div>' +
                            '<div class="product-title">' + esc(p.name) + '</div>' +
                            '<div class="product-price">$' + Number(p.price).toFixed(2) + ' CUP</div>' +
                            '<button class="buy-btn" type="button"><svg class="icon" aria-hidden="true"><use href="#i-bag"/></svg> Añadir a la bolsa</button>' +
                        '</div>' +
                    '</article>';
                }).join('');

                // Inicializar carruseles y filtros después de pintar
                $$('.slider', grid).forEach(initSlider);
                applyFilter();
            })
            .catch(function (err) {
                console.error(err);
                grid.innerHTML = '<p class="empty-msg">Error al cargar las plantillas.</p>';
            });
    }

    /* ---------- Filtro de categorías ---------- */
    var filterBtns = $$('.filter-btn');
    var emptyMsg = $('#empty-msg');
    var currentFilter = 'todos';

    function applyFilter() {
        var visible = 0;
        $$('.project-item').forEach(function (it) {
            var cats = (it.getAttribute('data-category') || '').split(/\s+/);
            var show = currentFilter === 'todos' || cats.indexOf(currentFilter) > -1;
            it.hidden = !show;
            if (show) visible++;
        });
        if (emptyMsg) emptyMsg.hidden = visible > 0;
    }

    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentFilter = btn.getAttribute('data-filter');
            filterBtns.forEach(function (b) {
                var on = b === btn;
                b.classList.toggle('active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            applyFilter();
        });
    });

    /* ---------- Ventanas legales ---------- */
    $$('[data-open]').forEach(function (el) {
        el.addEventListener('click', function () {
            var dlg = document.getElementById(el.getAttribute('data-open'));
            if (dlg && !dlg.open) {
                dlg.showModal();
                $('.legal-body', dlg).scrollTop = 0;
            }
        });
    });

    $$('dialog.legal').forEach(function (dlg) {
        var closeBtn = $('[data-close]', dlg);
        if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    });

    /* ---------- Cookies ---------- */
    var KEY = 'prettyprints-cookies';
    var banner = $('#cookie-banner');

    function getChoice() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function saveChoice(v) {
        try { localStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento */ }
        if (banner) banner.hidden = true;
    }

    if (banner) {
        var btnAll = $('#cookie-all');
        var btnNec = $('#cookie-necessary');
        if (btnAll) btnAll.addEventListener('click', function () { saveChoice('all'); });
        if (btnNec) btnNec.addEventListener('click', function () { saveChoice('necessary'); });

        var stored = getChoice();
        if (!stored) {
            banner.hidden = false;
        }
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Iniciar carga de productos al abrir la página
    loadProducts();

    window.PrettyPrintsUI = { initSlider: initSlider, applyFilter: applyFilter };
})();

/* ---------- Bolsa de compras y flujo de pedido ---------- */

(function () {
    'use strict';

    var STORE = {
        adminEmail: 'shop.pretty.prints.designs@gmail.com',
        account: '9205129977781914',
        phone: '+5358488820'
    };

    var CART_KEY = 'prettyprints-cart';
    var ORDER_KEY = 'prettyprints-order';

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    function readJSON(key, fallback) {
        try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    }
    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ }
    }
    function removeKey(key) {
        try { localStorage.removeItem(key); } catch (e) { /* sin almacenamiento */ }
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fmt(cents) { return '$' + (cents / 100).toFixed(2) + ' CUP'; }

    function loadCart() {
        var raw = readJSON(CART_KEY, []);
        if (!Array.isArray(raw)) return [];
        return raw.filter(function (i) {
            return i && typeof i.id === 'string' && typeof i.name === 'string' &&
                isFinite(i.cents) && i.cents >= 0 && i.qty >= 1;
        }).map(function (i) {
            return { id: i.id, name: i.name, cents: Math.round(i.cents), image: typeof i.image === 'string' ? i.image : '', qty: Math.min(99, Math.floor(i.qty)) };
        });
    }

    function loadOrder() {
        var o = readJSON(ORDER_KEY, null);
        if (!o || typeof o !== 'object') return null;
        var base = { name: String(o.name || ''), email: String(o.email || '') };
        if ((o.step === 'payment' || o.step === 'sent') && Array.isArray(o.items) && isFinite(o.totalCents)) {
            base.step = o.step;
            base.items = o.items.map(function (i) {
                return { name: String(i.name), qty: Math.floor(i.qty) || 1, cents: Math.round(i.cents) || 0 };
            });
            base.totalCents = Math.round(o.totalCents);
            base.operation = String(o.operation || '');
        }
        return base;
    }

    var cart = loadCart();
    var order = loadOrder();

    function totalCents() {
        return cart.reduce(function (sum, i) { return sum + i.cents * i.qty; }, 0);
    }

    function currentStep() {
        return (order && order.step && cart.length) ? order.step : 'cart';
    }

    function cartChanged() {
        writeJSON(CART_KEY, cart);
        if (order && order.step) {
            order = { name: order.name, email: order.email };
            writeJSON(ORDER_KEY, order);
        }
        render();
    }

    var drawer = $('#cart-drawer');
    var overlay = $('#cart-overlay');
    var lastFocus = null;

    function openCart() {
        if (!drawer) return;
        lastFocus = document.activeElement;
        drawer.classList.add('open');
        overlay.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(function () { var closeBtn = $('#cart-close'); if (closeBtn) closeBtn.focus(); }, 50);
    }
    function closeCart() {
        if (!drawer) return;
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    var cartBtn = $('#cart-btn');
    var cartClose = $('#cart-close');
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeCart();
    });

    function addFromCard(card) {
        var title = $('.product-title', card);
        var img = $('.slides img', card);
        var priceEl = $('.product-price', card);
        var name = title ? title.textContent.trim() : '';
        var price = parseFloat(card.getAttribute('data-price'));
        if (!isFinite(price) && priceEl) price = parseFloat((priceEl.textContent.match(/[\d.]+/) || [''])[0]);
        if (!name || !isFinite(price)) return;
        var id = card.getAttribute('data-id') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        var found = cart.filter(function (i) { return i.id === id; })[0];
        if (found) {
            found.qty = Math.min(99, found.qty + 1);
        } else {
            cart.push({ id: id, name: name, cents: Math.round(price * 100), image: img ? img.getAttribute('src') : '', qty: 1 });
        }
        cartChanged();
        var live = $('#cart-live');
        if (live) live.textContent = name + ' añadida a la bolsa.';
        openCart();
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.buy-btn') : null;
        if (!btn) return;
        var card = btn.closest('.project-item');
        if (card) addFromCard(card);
    });

    var cartItemsEl = $('#cart-items');
    if (cartItemsEl) {
        cartItemsEl.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-action]') : null;
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            var item = cart.filter(function (i) { return i.id === id; })[0];
            if (!item) return;
            var action = btn.getAttribute('data-action');
            if (action === 'remove') {
                cart = cart.filter(function (i) { return i !== item; });
            } else if (action === 'inc') {
                item.qty = Math.min(99, item.qty + 1);
            } else if (action === 'dec') {
                item.qty -= 1;
                if (item.qty <= 0) cart = cart.filter(function (i) { return i !== item; });
            }
            cartChanged();
        });
    }

    function buildMail(o) {
        var subject = 'Nuevo pedido';
        var lines = [
            'Hola, acabo de realizar el pago de mi pedido en Pretty Prints.',
            '',
            'Número de transacción (Transfermóvil): ' + o.operation,
            'Correo: ' + o.email,
            'Nombre: ' + o.name,
            'Monto pagado: ' + fmt(o.totalCents),
            '',
            'Plantillas:'
        ];
        o.items.forEach(function (i) { lines.push('- ' + i.qty + ' x ' + i.name + ' (' + fmt(i.cents * i.qty) + ')'); });
        var body = lines.join('\n');
        return {
            subject: subject,
            body: body,
            href: 'mailto:' + STORE.adminEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
        };
    }

    function render() {
        var count = cart.reduce(function (sum, i) { return sum + i.qty; }, 0);
        var countEl = $('#cart-count');
        var countLabel = $('#cart-count-label');
        if (countEl) countEl.textContent = count;
        if (countLabel) countLabel.textContent = count;

        var step = currentStep();
        var viewCart = $('#view-cart');
        var viewPay = $('#view-pay');
        var viewSent = $('#view-sent');
        var btnCont = $('#btn-continue');
        var btnConf = $('#btn-confirm');
        var btnMail = $('#btn-mail');
        var cartTotal = $('#cart-total');

        if (viewCart) viewCart.hidden = step !== 'cart';
        if (viewPay) viewPay.hidden = step !== 'payment';
        if (viewSent) viewSent.hidden = step !== 'sent';
        if (btnCont) btnCont.hidden = !(step === 'cart' && cart.length);
        if (btnConf) btnConf.hidden = step !== 'payment';
        if (btnMail) btnMail.hidden = step !== 'sent';
        if (cartTotal) cartTotal.textContent = fmt(step === 'cart' ? totalCents() : order.totalCents);

        if (cartItemsEl) {
            if (!cart.length) {
                cartItemsEl.innerHTML = '<p class="cart-empty">Tu bolsa está vacía</p>';
            } else {
                cartItemsEl.innerHTML = cart.map(function (i) {
                    return '<div class="cart-line">' +
                        (i.image ? '<img src="' + esc(i.image) + '" alt="" loading="lazy">' : '<img alt="" style="visibility:hidden">') +
                        '<div class="cart-line-info">' +
                            '<div class="cart-line-name">' + esc(i.name) + '</div>' +
                            '<div class="cart-line-row">' +
                                '<div class="qty">' +
                                    '<button type="button" data-action="dec" data-id="' + esc(i.id) + '" aria-label="Quitar una unidad de ' + esc(i.name) + '">-</button>' +
                                    '<span>' + i.qty + '</span>' +
                                    '<button type="button" data-action="inc" data-id="' + esc(i.id) + '" aria-label="Añadir una unidad de ' + esc(i.name) + '">+</button>' +
                                '</div>' +
                                '<span class="cart-line-price">' + fmt(i.cents * i.qty) + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<button class="cart-remove" type="button" data-action="remove" data-id="' + esc(i.id) + '" aria-label="Eliminar ' + esc(i.name) + ' de la bolsa"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>' +
                    '</div>';
                }).join('');
            }
        }

        var checkoutBox = $('#checkout-box');
        if (checkoutBox) checkoutBox.hidden = !cart.length || step !== 'cart';

        if (step === 'cart' && order) {
            var nameIn = $('#client-name');
            var emailIn = $('#client-email');
            if (nameIn && !nameIn.value) nameIn.value = order.name || '';
            if (emailIn && !emailIn.value) emailIn.value = order.email || '';
        }

        if (step === 'payment' || step === 'sent') {
            var payAmt = $('#pay-amount');
            var payAcc = $('#pay-account');
            var payPho = $('#pay-phone');
            var payIts = $('#pay-items');
            var opNum = $('#op-number');

            if (payAmt) payAmt.textContent = fmt(order.totalCents);
            if (payAcc) payAcc.textContent = STORE.account;
            if (payPho) payPho.textContent = STORE.phone;
            if (payIts) {
                payIts.innerHTML = order.items.map(function (i) {
                    return '<li><span>' + i.qty + ' x ' + esc(i.name) + '</span><span>' + fmt(i.cents * i.qty) + '</span></li>';
                }).join('');
            }
            if (opNum && !opNum.value) opNum.value = order.operation || '';
        }

        if (step === 'sent') {
            var mail = buildMail(order);
            if (btnMail) btnMail.setAttribute('href', mail.href);
            var sentTo = $('#sent-to');
            var mailPrev = $('#mail-preview');
            if (sentTo) sentTo.textContent = STORE.adminEmail;
            if (mailPrev) mailPrev.value = 'Para: ' + STORE.adminEmail + '\nAsunto: ' + mail.subject + '\n\n' + mail.body;
        }
    }

    function setFieldError(inputId, msg) {
        var input = $('#' + inputId);
        var err = $('#' + inputId + '-error');
        if (err) err.textContent = msg || '';
        if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    var orderForm = $('#order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!cart.length) return;
            var name = $('#client-name').value.trim();
            var email = $('#client-email').value.trim();
            var ok = true;

            setFieldError('client-name', '');
            setFieldError('client-email', '');
            if (name.length < 2) { setFieldError('client-name', 'Escribe tu nombre o un identificador.'); ok = false; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('client-email', 'Escribe un correo válido.'); ok = false; }
            if (!ok) {
                var bad = $('[aria-invalid="true"]', orderForm);
                if (bad) bad.focus();
                return;
            }

            order = {
                name: name,
                email: email,
                step: 'payment',
                items: cart.map(function (i) { return { name: i.name, qty: i.qty, cents: i.cents }; }),
                totalCents: totalCents(),
                operation: '',
                savedAt: Date.now()
            };
            writeJSON(ORDER_KEY, order);
            render();
            var cartBody = $('.cart-body', drawer);
            if (cartBody) cartBody.scrollTop = 0;
        });
    }

    var payForm = $('#pay-form');
    if (payForm) {
        payForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!order || order.step !== 'payment') return;
            var op = $('#op-number').value.trim();
            setFieldError('op-number', '');
            if (!/^[A-Za-z0-9-]{4,40}$/.test(op)) {
                setFieldError('op-number', 'Escribe el número de transacción tal como aparece en el SMS (4 a 40 letras o números).');
                var opIn = $('#op-number');
                if (opIn) opIn.focus();
                return;
            }
            order.operation = op;
            order.step = 'sent';
            writeJSON(ORDER_KEY, order);

            // ENVÍO DE DATOS A GOOGLE SHEETS
            var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwQi1yOcvdssyFh9TFRWItHyOAd5j1z6LUDAKf1PBr3pZbHymWBtNdy3vEqKRshYg7_9A/exec';
            fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            }).catch(function (err) {
                console.error('Error al registrar pedido en Google Sheets', err);
            });

            render();
            var cartBody = $('.cart-body', drawer);
            if (cartBody) cartBody.scrollTop = 0;
        });
    }

    var btnEdit = $('#btn-edit');
    if (btnEdit) {
        btnEdit.addEventListener('click', function () {
            if (!order) return;
            order = { name: order.name, email: order.email };
            writeJSON(ORDER_KEY, order);
            render();
        });
    }

    var btnCopy = $('#btn-copy');
    if (btnCopy) {
        btnCopy.addEventListener('click', function () {
            var area = $('#mail-preview');
            var status = $('#copy-status');
            function done(ok) { if (status) status.textContent = ok ? 'Mensaje copiado.' : 'No se pudo copiar; selecciona el texto y cópialo.'; }
            if (!area) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(area.value).then(function () { done(true); }, function () {
                    area.select();
                    try { done(document.execCommand('copy')); } catch (err) { done(false); }
                });
            } else {
                area.select();
                try { done(document.execCommand('copy')); } catch (err) { done(false); }
            }
        });
    }

    var btnNew = $('#btn-new');
    if (btnNew) {
        btnNew.addEventListener('click', function () {
            cart = [];
            order = null;
            removeKey(CART_KEY);
            removeKey(ORDER_KEY);
            var nameIn = $('#client-name');
            var emailIn = $('#client-email');
            var opNum = $('#op-number');
            var status = $('#copy-status');
            if (nameIn) nameIn.value = '';
            if (emailIn) emailIn.value = '';
            if (opNum) opNum.value = '';
            if (status) status.textContent = '';
            render();
        });
    }

    render();
})();

    render();
})();
