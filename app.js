'use strict';

module.exports = app => {
  app.beforeStart(async () => {
    await app.runSchedule('update_token');
  });
};
