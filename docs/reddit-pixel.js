(() => {
    'use strict';

    const PIXEL_ID = 'a2_j2250tdx5mf7';
    const CONSENT_KEY = 'mathpaster_reddit_ads_consent';
    const params = new URL(window.location.href).searchParams;
    const fromReddit = params.has('rdt_cid')
        || (params.get('utm_source') || '').toLowerCase() === 'reddit';

    // Do not ask or load advertising code for ordinary/direct visitors.
    if (!fromReddit) return;

    const storedConsent = (() => {
        try {
            return window.localStorage.getItem(CONSENT_KEY);
        } catch {
            return null;
        }
    })();

    const remember = (choice) => {
        try {
            window.localStorage.setItem(CONSENT_KEY, choice);
        } catch {
            // If storage is unavailable, honor the choice for this page only.
        }
    };

    const loadPixel = () => {
        if (window.rdt) return;

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
    };

    if (storedConsent === 'granted') {
        loadPixel();
        return;
    }
    if (storedConsent === 'denied') return;

    const banner = document.createElement('section');
    banner.className = 'reddit-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Advertising measurement choice');
    banner.innerHTML = `
        <p>May MathPaster send Reddit one page-visit event to measure this ad? No equations, name, email, or extension activity are shared. <a href="privacy.html">Privacy details</a>.</p>
        <div class="reddit-consent-actions">
            <button type="button" class="reddit-consent-decline">No thanks</button>
            <button type="button" class="reddit-consent-accept">Allow measurement</button>
        </div>`;

    const close = () => banner.remove();
    banner.querySelector('.reddit-consent-decline').addEventListener('click', () => {
        remember('denied');
        close();
    });
    banner.querySelector('.reddit-consent-accept').addEventListener('click', () => {
        remember('granted');
        close();
        loadPixel();
    });
    document.body.appendChild(banner);
})();
