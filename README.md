# Sylph Plugin: Remote Gateways

Remote gateways are a way to interface multiple APIs in a developer-friendly way.

Usage:

1) Create a ```gateways.json``` file in the process root directory
2) Add Gateway Endpoint:
```json
{
  "auth": {
    "endpoints": {
      "production": {
        "address": "https://api.example.com",
        "key": "test-key"
      }
    }
  }
}
```
3) Add gateway middleware to Sylph Project:

```js
const sylph = require('sylph-server');
const { injectGateways } = require('sylph-plugin-remote-gateways');

sylph.expand([
  injectGateways()
]);
```

4) Access a gateway using req.gateways.<endpoint>.post(<url>, {<payload>})
```js
module.exports.handler = async (req, res) => {
  const {username, password} = req.body;
  const result = req.gateways['auth'].post('login',{username, password})
  return res.status(200).send(result);
};
```