const { get, post } = require('httpie');
const path = require('path');

const gateways = {};

let gatewayData;
if (process.env.NODE_ENV === 'local') {
  gatewayData = require(path.join(process.cwd(), './local-gateways.json'));
} else {
  gatewayData = require(path.join(process.cwd(), './gateways.json'));
}

Object.keys(gatewayData).forEach(async (gateway) => {
  const { address, key } = gatewayData[gateway].endpoints[process.env.NODE_ENV];
  gateways[gateway] = {
    get: async (url, options) => {
      if (gateways[gateway].capabilities && !gateways[gateway].capabilities[url]) {
        return { error: 'Capability does not exist on remote server', code: 'ERROR_NOT_CAPABLE' };
      }
      const res = await get(`${address}/${url}`, options || {});
      return res.data;
    },
    post: async (url, payload, options) => {
      if (!gateways[gateway].capabilities[url] && gateways[gateway].capabilities) {
        return { error: 'Capability does not exist on remote server', code: 'ERROR_NOT_CAPABLE' };
      }
      const opts = options || {};
      const body = { ...payload };
      const data = { body, ...opts };
      if (key) body.key = key;
      const res = await post(`${address}/${url}`, data);
      return res.data;
    },
    capabilities: null,
    key,
  };
  let capabilities;
  try {
    const { data } = await get(`${address}/capabilities`);
    capabilities = data.routes;
  } catch (error) {
    console.log('Remote Gateways: Capabilities not found for', address);
  }
  // eslint-disable-next-line no-mixed-operators
  gateways[gateway].capabilities = capabilities || null;
});

function injectGateways() {
  return (req, res, next) => {
    req.gateways = gateways;
    next();
  };
}

module.exports = {
  injectGateways,
};
