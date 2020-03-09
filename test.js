const test = require('ava');
const fs = require('fs');
const path = require('path');
const { injectGateways } = require('./main');

async function setupGateways() {
  const m = {};
  await injectGateways()(m, null, () => {});
  return m;
}

let gateways = {};

test.before(async () => {
  const endpoints = {
    google: {
      test: {
        address: 'google.com',
        lookup: true,
      },
    },
    fake: {
      test: {
        address: 'fake.internal.service.wont.resolve',
        fallback: 'https://auth.teampseak.com',
        lookup: true,
      },
    },
  };
  fs.writeFileSync(path.join(process.cwd(), './gateways.json'), JSON.stringify(endpoints, null, 2));
  const { gateways: g } = await setupGateways();
  gateways = g;
});

test('Gateways exist', (t) => {
  t.is(Object.keys(gateways).length >= 1, true);
});
test('Gateway resolves as IP', (t) => {
  const ipCheck = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/;
  const m = gateways.google.address.search(ipCheck);
  t.is(m > -1, true);
});
test('Fake Gateway resolves as fallback', (t) => {
  t.is(gateways.fake.address === 'https://auth.teampseak.com', true);
});
