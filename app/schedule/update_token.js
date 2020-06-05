'use strict';

const Subscription = require('egg').Subscription;
const net = require('net');

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
    this.ctx.app.client = [];
    for (let i = 0; i < 5; i++) {
      const client = new net.Socket();
      client.connect(8888, '119.164.253.229', () => {
        console.log('连接成功');
        setInterval(() => {
          client.write('0D0A');
        }, 5000);
        client.on('close', () => {
          setTimeout(() => {
            console.log('断开重连');
            client.connect(8888, '119.164.253.229');
          }, 5000);
        });
        client.on('error', error => {
          console.error(error);
        });
        client.on('data', data => {
          console.log(`接收数据[${data.toString('hex')}]`);
        });
      });
      client.on('error', () => {
        setTimeout(() => {
          console.log('错误重连');
          client.connect(8888, '119.164.253.229');
        }, 5000);
      });
      client.setKeepAlive(true);
      this.ctx.app.client.push(client);
    }
  }
}

module.exports = UpdateToken;
