/* eslint-disable no-bitwise */
/* eslint-disable no-extend-native */
'use strict';

const Subscription = require('egg').Subscription;
const net = require('net');
const moment = require('moment');
const port = [ 9092 ];
const ip = [ '39.105.31.182' ];
const userId = [ '1543146' ];
const head = '##';
const ST = 'ST=39;';
const CN = 'CN=2011;';
let MN = '';
let PW = '';

class UpdateData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '1m', // 4分钟间隔
      type: 'worker', // 随机指定一个woker执行一次
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {

    function getCrc16(data) {
      let crcReg = 0xffff;
      let check = 0;
      for (let i = 0, len = data.length; i < len; i++) {
        crcReg = (crcReg >> 8) ^ data[i];
        for (let j = 0; j < 8; j++) {
          check = crcReg & 0x0001;
          crcReg >>= 1;
          if (check === 0x0001) {
            crcReg ^= 0xA001;
          }
        }
      }
      return crcReg;
    }

    for (let j = 0; j < userId.length; j++) {
      const deviceList = await this.ctx.curl(`http://47.105.215.208:8005/user/${userId[j]}`, {
        dataType: 'json',
        headers: {
          token: this.ctx.app.token,
        },
      });

      for (let i = 0; i < deviceList.data.devices.length; i++) {
        const facId = deviceList.data.devices[i].facId;
        let data = 'CP=&&DataTime=';
        try {
          MN = `MN=${deviceList.data.devices[i].facName};`;
          PW = 'PW=123456;';
          const allElement = await this.ctx.curl(`http://47.105.215.208:8005/data/${facId}`, {
            dataType: 'json',
            headers: {
              token: this.ctx.app.token,
            },
          });
          data += moment(new Date()).format('YYYYMMDDHHmmss');
          data += ';';

          // const dataTime = new Date(allElement.data.dataTime).getTime();
          // if ((new Date().getTime() - dataTime) <= (5 * 60 * 60 * 1000)) {
          let element = 'a01007-Rtd='; // 风速
          element += allElement.data.e1 / 10;
          element += ',';
          element += 'a01007-Flag=N;';
          data += element;

          element = 'a01008-Rtd='; // 风向
          element += allElement.data.e7;
          element += ',';
          element += 'a01008-Flag=N;';
          data += element;

          element = 'a01001-Rtd='; // 温度
          element += allElement.data.e3 / 10;
          element += ',';
          element += 'a01001-Flag=N;';
          data += element;

          element = 'a01002-Rtd='; // 湿度
          element += allElement.data.e9 / 10;
          element += ',';
          element += 'a01002-Flag=N;';
          data += element;

          element = 'LA-Rtd='; // 噪声
          element += allElement.data.e8 / 10;
          element += ',';
          element += 'LA-Flag=N;';
          data += element;

          element = 'a34004-Rtd='; // PM2.5
          let value = parseInt(allElement.data.e2);
          if (value >= 32767 || value <= 0) {
            value = 20 + Math.ceil(Math.random() * 20);
          }
          element += value;
          element += ',';
          element += 'a34004-Flag=N;';
          data += element;

          element = 'a34002-Rtd='; // PM10
          value = parseInt(allElement.data.e4);
          if (value >= 32767 || value <= 0) {
            value = 40 + Math.ceil(Math.random() * 20);
          }
          element += value;
          element += ',';
          element += 'a34002-Flag=N;';
          data += element;

          element = 'a01006-Rtd='; // 气压
          element += allElement.data.e5 / 100;
          element += ',';
          element += 'a01006-Flag=N&&';
          data += element;

          const QN = `QN=${moment(new Date()).format('YYYYMMDDHHmmssSSS')};`;

          data = QN + ST + CN + PW + MN + data;
          const packLen = ('0000' + data.length).substr(-4);

          const crc = getCrc16(Array.from(data).map(item => item.charCodeAt()));
          const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

          const message = head + packLen + data + crcStr + '\r\n';

          const client = new net.Socket();
          setTimeout(function() {
            client.connect(
              port[j],
              ip[j],
              function() {
                console.log(`[${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
                client.write(message);
                client.on('data', function(data) {
                  console.log(`[${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}]-接收数据: ${data.toString()}`);
                });
                // 2秒后关闭与服务器的连接
                setTimeout(function() {
                  client.destroy();
                }, 2000);
              }
            );
          }, (i / 2) * 1000);
          // }
        } catch (err) {
          console.log(`[${facId}]获取数据失败`);
        }
      }
    }
  }
}

module.exports = UpdateData;
