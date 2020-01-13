'use strict';

const Subscription = require('egg').Subscription;

class UpdateToken extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '12h', // 1 分钟间隔
      type: 'worker', // 指定所有的 worker 都需要执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const res = await this.ctx.curl('http://115.28.187.9:8005/login', {
      // 必须指定 method
      method: 'POST',
      // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
      contentType: 'json',
      data: {
        username: 'junge2018',
        password: '123456',
      },
      dataType: 'json',
    });
    this.ctx.app.token = res.data.token;
  }
}

module.exports = UpdateToken;
