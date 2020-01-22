const { get, post } = require('httpie');
const path = require('path')

const gateways = {};

let gatewayData;
if (process.env.NODE_ENV === 'local') {
  gatewayData = require(path.join(process.cwd(), './local-gateways.json'));
} else {
  gatewayData = require(path.join(process.cwd(), './gateways.json'));
}

Object.keys(gatewayData).forEach(async (gateway) => {
  const endpoint = gatewayData[gateway].endpoints[process.env.NODE_ENV];
  gateways[gateway] = {
    get: async (url, options) => {
      if (!gateways[gateway].capabilities[url] && gateways[gateway].capabilities) {
        return { error: 'Capability does not exist on remote server', code: 'ERROR_NOT_CAPABLE' };
      }
      const res = await get(`${endpoint}/${url}`, options || {});
      return res.data;
    },
    post: async (url, payload, options) => {
      if (!gateways[gateway].capabilities[url] && gateways[gateway].capabilities) {
        return { error: 'Capability does not exist on remote server', code: 'ERROR_NOT_CAPABLE' };
      }
      const o = options || {};
      const res = await post(`${endpoint}/${url}`, {
        body: payload || {},
        ...o
      });
      return res.data;
    },
    capabilities: null,
  };
  const caps = await get(`${endpoint}/capabilities`);
  // eslint-disable-next-line no-mixed-operators
  gateways[gateway].capabilities = caps.data && caps.data.routes || null;
});

function injectGateways() {
  return (req, res, next) => {
    req.gateways = gateways;
    next();
  }
}

module.exports = {
  injectGateways
}