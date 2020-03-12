const path = require('path');
const dns = require('dns');
const fs = require('fs');

const { get, post } = require('httpie');
const { rgb, mix } = require('nano-rgb');

const dnsp = dns.promises;
let initialized = false;
const gateways = {};

const colors = {
  error: rgb(255, 50, 50),
  success: rgb(50, 255, 50),
  info: rgb(50, 50, 255),
};

function log(message, color) {
  console.log(mix(' |', rgb(150, 0, 150), 'Gateways'.toUpperCase().padEnd(11)), '>', mix(colors[color || 'info'], message || ''));
}

let gatewayData;
if (process.env.NODE_ENV === 'local') {
  gatewayData = JSON.parse(fs.readFileSync(path.join(process.cwd(), './local-gateways.json')));
} else {
  gatewayData = JSON.parse(fs.readFileSync(path.join(process.cwd(), './gateways.json')));
}

async function initializeGateways() {
  const keys = Object.keys(gatewayData);
  for (let i = 0; i < keys.length; i += 1) {
    const gateway = keys[i];
    const {
      address, key, protocol, port, lookup, fallback,
    } = gatewayData[gateway][process.env.NODE_ENV];
    let finalAddress;
    if (lookup) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { address: resAddr } = await dnsp.lookup(address);
        finalAddress = `${protocol || 'http://'}${resAddr}${port ? `:${port}` : ''}`;
      } catch (error) {
        if (fallback) {
          log(`Failed to resolve address for [${gateway}], using fallback`);
          finalAddress = fallback;
        } else {
          log(`No fallback specified for [${gateway}]`, 'error');
        }
      }
    } else {
      finalAddress = address;
    }
    gateways[gateway] = {
      address: finalAddress,
      get: async (url, options) => {
        try {
          const res = await get(`${finalAddress}/${url}`, options || {});
          return res.data;
        } catch ({ data: errorData }) {
          return errorData;
        }
      },
      post: async (url, payload, options) => {
        const opts = options || {};
        const body = { ...payload };
        const data = { body, ...opts };
        if (key) body.key = key;
        try {
          const res = await post(`${finalAddress}/${url}`, data);
          return res.data;
        } catch ({ data: errorData }) {
          return errorData;
        }
      },
      key,
    };
  }
  initialized = true;
  return gateways;
}


function injectGateways() {
  return async (req, res, next) => {
    if (!initialized) await initializeGateways();
    req.gateways = gateways;
    next();
  };
}

module.exports = {
  injectGateways, initializeGateways, getGateways: () => gateways,
};
