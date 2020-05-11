'use strict';

module.exports = appInfo => {
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1548522284950_4147';

  // add your config here
  config.middleware = [];

  config.cluster = {
    listen: {
      port: 7007,
      hostname: '127.0.0.1',
      // path: '/var/run/egg.sock',
    },
  };

  return config;
};
