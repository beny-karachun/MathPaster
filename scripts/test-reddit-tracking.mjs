import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../docs/reddit-pixel.js', import.meta.url), 'utf8');

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function eventTarget(href = '') {
  const listeners = new Map();
  return {
    href,
    addEventListener(type, callback, options = {}) {
      const callbacks = listeners.get(type) || [];
      callbacks.push({ callback, once: Boolean(options.once) });
      listeners.set(type, callbacks);
    },
    dispatch(type) {
      const callbacks = listeners.get(type) || [];
      callbacks.forEach(({ callback }) => callback({ type }));
      listeners.set(type, callbacks.filter(({ once }) => !once));
    },
  };
}

function runPage({ href, stored = {} }) {
  const localStorage = new MemoryStorage(stored);
  const sessionStorage = new MemoryStorage();
  const installLink = eventTarget('https://chromewebstore.google.com/detail/mathpaster/id');
  const demoLink = eventTarget('https://mathpaster.com/#demo');
  const checkoutLink = eventTarget(
    'https://mathpaster.lemonsqueezy.com/checkout/buy/variant-id',
  );
  const acceptButton = eventTarget();
  const declineButton = eventTarget();
  let banner = null;
  let lemonHandler = null;
  let uuid = 0;

  const document = {
    readyState: 'complete',
    body: {
      appendChild(node) {
        banner = node;
      },
    },
    createElement(tag) {
      if (tag === 'script') return {};
      return {
        className: '',
        innerHTML: '',
        setAttribute() {},
        remove() {
          banner = null;
        },
        querySelector(selector) {
          if (selector === '.reddit-consent-accept') return acceptButton;
          if (selector === '.reddit-consent-decline') return declineButton;
          return null;
        },
      };
    },
    getElementsByTagName() {
      return [{ parentNode: { insertBefore() {} } }];
    },
    querySelector(selector) {
      return selector === 'a[href="#demo"]' ? demoLink : null;
    },
    querySelectorAll(selector) {
      if (selector.includes('chromewebstore.google.com')) return [installLink];
      if (selector.includes('lemonsqueezy.com/checkout')) return [checkoutLink];
      return [];
    },
  };

  const context = {
    URL,
    Date,
    Math,
    document,
    localStorage,
    sessionStorage,
    location: { href },
    crypto: { randomUUID: () => `uuid-${++uuid}` },
    LemonSqueezy: {
      Setup({ eventHandler }) {
        lemonHandler = eventHandler;
      },
    },
    addEventListener() {},
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'reddit-pixel.js' });

  return {
    acceptButton,
    banner: () => banner,
    checkoutLink,
    context,
    declineButton,
    installLink,
    lemonHandler: () => lemonHandler,
    localStorage,
  };
}

const direct = runPage({ href: 'https://mathpaster.com/' });
assert.equal(direct.banner(), null, 'direct visitors should not see Reddit consent');
assert.equal(direct.context.rdt, undefined, 'direct visitors should not load Reddit Pixel');

const denied = runPage({
  href: 'https://mathpaster.com/?utm_source=reddit&utm_campaign=test',
});
assert.ok(denied.banner(), 'Reddit visitors should receive a consent choice');
denied.declineButton.dispatch('click');
assert.equal(denied.context.rdt, undefined, 'declining should not load Reddit Pixel');
assert.equal(denied.localStorage.getItem('mathpaster_reddit_ads_attribution'), null);

const accepted = runPage({
  href: 'https://mathpaster.com/?rdt_cid=click-123&utm_source=reddit&utm_campaign=test&utm_content=variant-a',
});
accepted.acceptButton.dispatch('click');
assert.ok(accepted.context.rdt, 'accepting should initialize Reddit Pixel');
assert.match(accepted.installLink.href, /utm_source=reddit/);
assert.match(accepted.installLink.href, /utm_campaign=test/);
assert.match(accepted.installLink.href, /utm_content=variant-a/);
assert.match(accepted.checkoutLink.href, /checkout%5Bcustom%5D%5Brdt_cid%5D=click-123/);
assert.match(accepted.checkoutLink.href, /checkout%5Bcustom%5D%5Butm_content%5D=variant-a/);

accepted.installLink.dispatch('click');
const queue = accepted.context.rdt.callQueue.map((args) => Array.from(args));
assert.equal(
  JSON.stringify(queue.slice(0, 3).map((args) => args.slice(0, 2))),
  JSON.stringify([
    ['init', 'a2_j2250tdx5mf7'],
    ['track', 'PageVisit'],
    ['track', 'Custom'],
  ]),
);
assert.equal(queue[2][2].customEventName, 'InstallIntent');

const checkoutSuccess = accepted.lemonHandler();
assert.equal(typeof checkoutSuccess, 'function', 'Lemon Squeezy success handler should be wired');
const order = {
  id: '42',
  attributes: {
    identifier: 'order-uuid',
    status: 'paid',
    test_mode: false,
    currency: 'USD',
    total: 1199,
    first_order_item: {
      variant_id: 7,
      product_name: 'MathPaster Pro',
    },
  },
};
checkoutSuccess({ event: 'Checkout.Success', data: order });
checkoutSuccess({ event: 'Checkout.Success', data: order });
const purchases = accepted.context.rdt.callQueue
  .map((args) => Array.from(args))
  .filter((args) => args[0] === 'track' && args[1] === 'Purchase');
assert.equal(purchases.length, 1, 'a successful order should be tracked once');
assert.equal(purchases[0][2].value, 11.99);
assert.equal(purchases[0][2].currency, 'USD');
assert.equal(purchases[0][2].transactionId, 'order-uuid');

console.log('Reddit tracking checks passed.');
