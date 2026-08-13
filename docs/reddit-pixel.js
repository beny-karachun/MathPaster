(() => {
    'use strict';

    const PIXEL_ID = 'a2_j2250tdx5mf7';
    const CONSENT_KEY = 'mathpaster_reddit_ads_consent';
    const ATTRIBUTION_KEY = 'mathpaster_reddit_ads_attribution';
    const ATTRIBUTION_TTL_MS = 28 * 24 * 60 * 60 * 1000;
    const PURCHASE_KEY_PREFIX = 'mathpaster_reddit_purchase_';
    const ATTRIBUTION_FIELDS = [
        'rdt_cid',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
    ];
    const params = new URL(window.location.href).searchParams;
    const fromReddit = params.has('rdt_cid')
        || (params.get('utm_source') || '').toLowerCase() === 'reddit';

    const readStorage = (key) => {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    };

    const writeStorage = (key, value) => {
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // Storage can be unavailable in hardened/private browsing modes.
        }
    };

    const removeStorage = (key) => {
        try {
            window.localStorage.removeItem(key);
        } catch {
            // Nothing else is required when storage is unavailable.
        }
    };

    const attributionFromUrl = () => {
        const attribution = { capturedAt: Date.now() };
        ATTRIBUTION_FIELDS.forEach((field) => {
            const value = params.get(field);
            if (value) attribution[field] = value.slice(0, 256);
        });
        return attribution;
    };

    const readAttribution = () => {
        const raw = readStorage(ATTRIBUTION_KEY);
        if (!raw) return null;
        try {
            const attribution = JSON.parse(raw);
            if (!Number.isFinite(attribution.capturedAt)
                || Date.now() - attribution.capturedAt > ATTRIBUTION_TTL_MS) {
                removeStorage(ATTRIBUTION_KEY);
                return null;
            }
            return attribution;
        } catch {
            removeStorage(ATTRIBUTION_KEY);
            return null;
        }
    };

    let attribution = readAttribution();

    // Do not ask or load advertising code for ordinary/direct visitors. A
    // returning visitor remains eligible during Reddit's 28-day click window
    // only when they previously opted in and attribution is still present.
    if (!fromReddit && !attribution) return;

    const storedConsent = readStorage(CONSENT_KEY);

    const remember = (choice) => {
        writeStorage(CONSENT_KEY, choice);
    };

    const captureAttribution = () => {
        if (!fromReddit) return;
        attribution = attributionFromUrl();
        writeStorage(ATTRIBUTION_KEY, JSON.stringify(attribution));
    };

    const newConversionId = (prefix) => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return `${prefix}_${window.crypto.randomUUID()}`;
        }
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    };

    const loadPixel = () => {
        if (window.rdt) return window.rdt;

        const queue = window.rdt = function () {
            if (queue.sendEvent) {
                queue.sendEvent.apply(queue, arguments);
            } else {
                queue.callQueue.push(arguments);
            }
        };
        queue.callQueue = [];

        const script = document.createElement('script');
        script.src = 'https://www.redditstatic.com/ads/pixel.js';
        script.async = true;
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(script, firstScript);

        window.rdt('init', PIXEL_ID, {
            optOut: false,
            useDecimalCurrencyValues: true,
        });
        window.rdt('track', 'PageVisit');
        return window.rdt;
    };

    const trackCustom = (name, metadata = {}) => {
        if (readStorage(CONSENT_KEY) !== 'granted') return;
        loadPixel();
        window.rdt('track', 'Custom', {
            customEventName: name,
            conversionId: newConversionId(name.toLowerCase()),
            ...metadata,
        });
    };

    const trackPurchase = (order) => {
        const attributes = order && (order.attributes || order);
        if (!attributes || attributes.test_mode || attributes.status !== 'paid') return;

        const orderId = String(attributes.identifier || order.id || '');
        if (!orderId) return;

        try {
            if (window.sessionStorage.getItem(PURCHASE_KEY_PREFIX + orderId)) return;
            window.sessionStorage.setItem(PURCHASE_KEY_PREFIX + orderId, 'sent');
        } catch {
            // Checkout.Success is normally emitted once; continue if session
            // storage is unavailable rather than losing a real conversion.
        }

        if (readStorage(CONSENT_KEY) !== 'granted') return;
        loadPixel();

        const item = attributes.first_order_item || {};
        const metadata = {
            conversionId: `ls_order_${orderId}`,
            transactionId: orderId,
            currency: String(attributes.currency || 'USD').toUpperCase(),
            value: Number(attributes.total || 0) / 100,
            itemCount: 1,
        };
        if (item.variant_id || item.product_name) {
            metadata.products = [{
                id: String(item.variant_id || item.product_id || 'mathpaster_pro'),
                name: String(item.product_name || 'MathPaster Pro'),
                category: 'Software',
            }];
        }
        window.rdt('track', 'Purchase', metadata);
    };

    const addAttributionToCheckout = (link) => {
        if (!attribution || readStorage(CONSENT_KEY) !== 'granted') return;
        const url = new URL(link.href);
        ATTRIBUTION_FIELDS.forEach((field) => {
            const value = attribution[field];
            if (value) url.searchParams.set(`checkout[custom][${field}]`, value);
        });
        link.href = url.toString();
    };

    let actionsWired = false;
    const wireFunnelActions = () => {
        if (actionsWired) return;
        actionsWired = true;

        document.querySelectorAll('a[href*="chromewebstore.google.com/detail/mathpaster"]')
            .forEach((link) => {
                link.addEventListener('click', () => trackCustom('InstallIntent'));
            });

        const demoLink = document.querySelector('a[href="#demo"]');
        if (demoLink) {
            demoLink.addEventListener('click', () => trackCustom('DemoStarted'), { once: true });
        }

        document.querySelectorAll('a[href*="mathpaster.lemonsqueezy.com/checkout"]')
            .forEach((link) => {
                addAttributionToCheckout(link);
                link.addEventListener('click', () => trackCustom('CheckoutStarted'));
            });

        const setupPurchaseTracking = () => {
            if (!window.LemonSqueezy || typeof window.LemonSqueezy.Setup !== 'function') return;
            window.LemonSqueezy.Setup({
                eventHandler: (event) => {
                    if (event && event.event === 'Checkout.Success') {
                        trackPurchase(event.data);
                    }
                },
            });
        };
        if (document.readyState === 'complete') {
            setupPurchaseTracking();
        } else {
            window.addEventListener('load', setupPurchaseTracking, { once: true });
        }
    };

    const enableMeasurement = () => {
        captureAttribution();
        loadPixel();
        wireFunnelActions();
    };

    if (storedConsent === 'granted') {
        enableMeasurement();
        return;
    }
    if (storedConsent === 'denied') return;

    const banner = document.createElement('section');
    banner.className = 'reddit-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Advertising measurement choice');
    banner.innerHTML = `
        <p>May MathPaster send Reddit limited events to measure this ad, such as page visits, button clicks, and a confirmed purchase? No equations, name, email, or extension activity are shared. <a href="privacy.html" target="_blank" rel="noopener">Privacy details</a>.</p>
        <div class="reddit-consent-actions">
            <button type="button" class="reddit-consent-decline">No thanks</button>
            <button type="button" class="reddit-consent-accept">Allow measurement</button>
        </div>`;

    const close = () => banner.remove();
    banner.querySelector('.reddit-consent-decline').addEventListener('click', () => {
        remember('denied');
        removeStorage(ATTRIBUTION_KEY);
        close();
    });
    banner.querySelector('.reddit-consent-accept').addEventListener('click', () => {
        remember('granted');
        close();
        enableMeasurement();
    });
    document.body.appendChild(banner);
})();
